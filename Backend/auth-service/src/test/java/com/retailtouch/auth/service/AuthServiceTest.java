package com.retailtouch.auth.service;

import com.retailtouch.auth.dto.LoginRequest;
import com.retailtouch.auth.dto.RegisterRequest;
import com.retailtouch.auth.dto.AuthResponse;
import com.retailtouch.auth.entity.Role;
import com.retailtouch.auth.entity.User;
import com.retailtouch.auth.repository.UserRepository;
import com.retailtouch.common.security.JwtUtil;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtUtil jwtUtil;
    @Mock
    private AuthenticationManager authenticationManager;
    @Mock
    private AdminSettingsService adminSettingsService;
    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private AuthService authService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "jwtExpiration", 86400000L);
        ReflectionTestUtils.setField(authService, "allowSelfRegistration", true);
    }

    @Test
    void register_successfullyCreatesUser() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("testuser");
        request.setEmail("test@test.com");
        request.setPassword("password123");
        request.setRole(Role.CASHIER);

        when(userRepository.existsByUsername("testuser")).thenReturn(false);
        when(userRepository.existsByEmail("test@test.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("encoded_password");
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));
        when(jwtUtil.generateToken(anyMap(), eq("testuser"))).thenReturn("mock_token");

        AuthResponse response = authService.register(request);

        assertThat(response).isNotNull();
        assertThat(response.getUsername()).isEqualTo("testuser");
        assertThat(response.getAccessToken()).isEqualTo("mock_token");
        assertThat(response.getRole()).isEqualTo(Role.CASHIER);
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    void register_throwsExceptionWhenUsernameExists() {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("admin");
        request.setEmail("admin@test.com");
        request.setPassword("password123");

        when(userRepository.existsByUsername("admin")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("already taken");
    }

    @Test
    void login_returnsTokenOnValidCredentials() {
        LoginRequest request = new LoginRequest();
        request.setUsername("testuser");
        request.setPassword("password123");

        User user = User.builder()
                .username("testuser")
                .email("test@test.com")
                .role(Role.CASHIER)
                .password("encoded_password")
                .build();

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(null);
        when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(user));
        when(jwtUtil.generateToken(anyMap(), eq("testuser"))).thenReturn("jwt_token");

        AuthResponse response = authService.login(request);

        assertThat(response).isNotNull();
        assertThat(response.getUsername()).isEqualTo("testuser");
        assertThat(response.getAccessToken()).isEqualTo("jwt_token");
    }
}
