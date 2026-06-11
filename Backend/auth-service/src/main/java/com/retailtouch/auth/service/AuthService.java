package com.retailtouch.auth.service;

import com.retailtouch.auth.dto.*;
import com.retailtouch.auth.entity.Role;
import com.retailtouch.auth.entity.User;
import com.retailtouch.auth.repository.UserRepository;
import com.retailtouch.common.exception.ResourceNotFoundException;
import com.retailtouch.common.security.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AuthService {

        private static final Logger log = LoggerFactory.getLogger(AuthService.class);

        private final UserRepository userRepository;
        private final PasswordEncoder passwordEncoder;
        private final JwtUtil jwtUtil;
        private final AuthenticationManager authenticationManager;
        private final AdminSettingsService adminSettingsService;
        private final AuditLogService auditLogService;

        public AuthService(UserRepository userRepository,
                        PasswordEncoder passwordEncoder,
                        JwtUtil jwtUtil,
                        AuthenticationManager authenticationManager,
                        AdminSettingsService adminSettingsService,
                        AuditLogService auditLogService) {
                this.userRepository = userRepository;
                this.passwordEncoder = passwordEncoder;
                this.jwtUtil = jwtUtil;
                this.authenticationManager = authenticationManager;
                this.adminSettingsService = adminSettingsService;
                this.auditLogService = auditLogService;
        }

        @Value("${jwt.expiration}")
        private long jwtExpiration;

        @Value("${auth.allow-self-registration}")
        private boolean allowSelfRegistration;

        @Transactional(readOnly = true)
        public List<UserDTO> getAllUsers() {
                return userRepository.findAll(Sort.by(Sort.Direction.ASC, "id"))
                                .stream()
                                .map(this::mapToDTO)
                                .toList();
        }

        @Transactional
        public UserDTO createUser(UserCreateRequest request) {
                validateDuplicateUser(request.getUsername(), request.getEmail(), null);

                User user = User.builder()
                                .username(request.getUsername().trim())
                                .email(request.getEmail().trim().toLowerCase())
                                .password(passwordEncoder.encode(request.getPassword()))
                                .role(request.getRole())
                                .active(request.getActive() == null || request.getActive())
                                .build();

                log.info("Creating user with username='{}', role='{}'", user.getUsername(), user.getRole());
                User saved = userRepository.save(user);
                log.debug("User persisted successfully with id={}", saved.getId());
                auditLogService.log("USER_CREATED", "USERS", null, mapToDTO(saved).toString(), "system", "ROLE_ADMIN", null);
                return mapToDTO(saved);
        }

        @Transactional
        public UserDTO updateUser(Long id, UserUpdateRequest request) {
                User existing = userRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

                validateDuplicateUser(request.getUsername(), request.getEmail(), id);

                Role previousRole = existing.getRole();
                existing.setUsername(request.getUsername().trim());
                existing.setEmail(request.getEmail().trim().toLowerCase());
                existing.setRole(request.getRole());
                if (request.getPassword() != null && !request.getPassword().isBlank()) {
                        existing.setPassword(passwordEncoder.encode(request.getPassword()));
                }
                if (request.getActive() != null) {
                        existing.setActive(request.getActive());
                }

                log.info("Updating user id={} (previousRole={}, newRole={})", id, previousRole, existing.getRole());
                User updated = userRepository.save(existing);
                log.debug("User updated in database for id={}", id);
                if (previousRole != updated.getRole()) {
                        auditLogService.log("USER_ROLE_CHANGE", "USERS", previousRole.name(), updated.getRole().name(), "system",
                                        "ROLE_ADMIN", null);
                }
                return mapToDTO(updated);
        }

        @Transactional
        public void deleteUser(Long id) {
                if (!userRepository.existsById(id)) {
                        throw new ResourceNotFoundException("User not found with id: " + id);
                }
                log.info("Deleting user with id={}", id);
                userRepository.deleteById(id);
                auditLogService.log("USER_DELETED", "USERS", "id=" + id, null, "system", "ROLE_ADMIN", null);
        }

        public AuthResponse register(RegisterRequest request) {
                if (!allowSelfRegistration) {
                        throw new AccessDeniedException("Self registration is disabled");
                }
                return registerInternal(request, false);
        }

        public AuthResponse registerByAdmin(RegisterRequest request) {
                return registerInternal(request, true);
        }

        public AuthResponse login(LoginRequest request) {
                return login(request, null);
        }

        public AuthResponse login(LoginRequest request, String ipAddress) {
                try {
                        authenticationManager.authenticate(
                                        new UsernamePasswordAuthenticationToken(request.getUsername(),
                                                        request.getPassword()));
                } catch (BadCredentialsException ex) {
                        try {
                                adminSettingsService.logSecurityEvent(
                                                "LOGIN_FAILED",
                                                request.getUsername(),
                                                "ANONYMOUS",
                                                ipAddress,
                                                "Invalid credentials");
                        } catch (Exception auditEx) {
                                log.warn("Failed to record LOGIN_FAILED audit event: {}", auditEx.getMessage());
                        }
                        throw ex;
                }

                User user = userRepository.findByUsername(request.getUsername())
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "User not found: " + request.getUsername()));

                log.info("User logged in: {}", user.getUsername());
                try {
                        adminSettingsService.logSecurityEvent(
                                        "LOGIN_SUCCESS",
                                        user.getUsername(),
                                        user.getRole().name(),
                                        ipAddress,
                                        "Successful login");
                } catch (Exception auditEx) {
                        log.warn("Failed to record LOGIN_SUCCESS audit event: {}", auditEx.getMessage());
                }
                return buildAuthResponse(user);
        }

        public AuthResponse refresh(RefreshTokenRequest request) {
                String refreshToken = request.getRefreshToken();
                if (!jwtUtil.validateToken(refreshToken)) {
                        throw new IllegalArgumentException("Invalid or expired refresh token");
                }

                String username = jwtUtil.extractUsername(refreshToken);
                User user = userRepository.findByUsername(username)
                                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

                log.info("Token refreshed for user: {}", username);
                return buildAuthResponse(user);
        }

        public UserDTO getCurrentUser(String username) {
                User user = userRepository.findByUsername(username)
                                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
                return mapToDTO(user);
        }

        private AuthResponse buildAuthResponse(User user) {
                Map<String, Object> claims = new HashMap<>();
                claims.put("role", user.getRole().name());
                claims.put("email", user.getEmail());

                String accessToken = jwtUtil.generateToken(claims, user.getUsername());
                String refreshToken = jwtUtil.generateToken(new HashMap<>(), user.getUsername());

                return AuthResponse.builder()
                                .accessToken(accessToken)
                                .refreshToken(refreshToken)
                                .tokenType("Bearer")
                                .username(user.getUsername())
                                .email(user.getEmail())
                                .role(user.getRole())
                                .expiresIn(jwtExpiration / 1000)
                                .build();
        }

        private UserDTO mapToDTO(User user) {
                return UserDTO.builder()
                                .id(user.getId())
                                .username(user.getUsername())
                                .email(user.getEmail())
                                .role(user.getRole())
                                .active(user.isActive())
                                .createdAt(user.getCreatedAt())
                                .build();
        }

        private AuthResponse registerInternal(RegisterRequest request, boolean allowRequestedRole) {
                if (userRepository.existsByUsername(request.getUsername())) {
                        throw new IllegalArgumentException("Username '" + request.getUsername() + "' is already taken");
                }
                if (userRepository.existsByEmail(request.getEmail())) {
                        throw new IllegalArgumentException("Email '" + request.getEmail() + "' is already registered");
                }

                Role resolvedRole;
                if (allowRequestedRole) {
                        resolvedRole = request.getRole() != null ? request.getRole() : Role.CASHIER;
                } else {
                        if (request.getRole() != null && request.getRole() != Role.CASHIER) {
                                throw new AccessDeniedException("Self registration can only create CASHIER users");
                        }
                        resolvedRole = Role.CASHIER;
                }

                User user = User.builder()
                                .username(request.getUsername())
                                .email(request.getEmail())
                                .password(passwordEncoder.encode(request.getPassword()))
                                .role(resolvedRole)
                                .active(true)
                                .build();

                userRepository.save(user);
                log.info("New user registered: {} with role {}", user.getUsername(), resolvedRole);
                return buildAuthResponse(user);
        }

        private void validateDuplicateUser(String username, String email, Long existingId) {
                String normalizedUsername = username == null ? "" : username.trim();
                String normalizedEmail = email == null ? "" : email.trim().toLowerCase();

                boolean usernameExists = existingId == null
                                ? userRepository.existsByUsername(normalizedUsername)
                                : userRepository.existsByUsernameAndIdNot(normalizedUsername, existingId);
                if (usernameExists) {
                        throw new IllegalArgumentException("Username '" + normalizedUsername + "' is already taken");
                }

                boolean emailExists = existingId == null
                                ? userRepository.existsByEmail(normalizedEmail)
                                : userRepository.existsByEmailAndIdNot(normalizedEmail, existingId);
                if (emailExists) {
                        throw new IllegalArgumentException("Email '" + normalizedEmail + "' is already registered");
                }
        }
}
