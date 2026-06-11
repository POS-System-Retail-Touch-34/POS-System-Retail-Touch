package com.retailtouch.auth.config;

import com.retailtouch.auth.entity.Role;
import com.retailtouch.auth.entity.User;
import com.retailtouch.auth.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${auth.bootstrap-default-users:false}")
    private boolean bootstrapDefaultUsers;
    @Value("${auth.bootstrap.admin.username:admin}")
    private String adminUsername;
    @Value("${auth.bootstrap.admin.email:admin@retailtouch.com}")
    private String adminEmail;
    @Value("${auth.bootstrap.admin.password:}")
    private String adminPassword;
    @Value("${auth.bootstrap.manager.username:manager}")
    private String managerUsername;
    @Value("${auth.bootstrap.manager.email:manager@retailtouch.com}")
    private String managerEmail;
    @Value("${auth.bootstrap.manager.password:}")
    private String managerPassword;
    @Value("${auth.bootstrap.cashier.username:cashier}")
    private String cashierUsername;
    @Value("${auth.bootstrap.cashier.email:cashier@retailtouch.com}")
    private String cashierEmail;
    @Value("${auth.bootstrap.cashier.password:}")
    private String cashierPassword;

    public AdminBootstrap(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(ApplicationArguments args) {
        normalizeLegacyUserStatus();

        if (!bootstrapDefaultUsers) {
            log.info("Default user bootstrap is disabled");
            return;
        }

        if (isBlank(adminPassword) || isBlank(managerPassword) || isBlank(cashierPassword)) {
            log.warn("Default user bootstrap skipped: one or more bootstrap passwords are empty");
            return;
        }

        if (!userRepository.existsByUsername(adminUsername)) {
            User admin = User.builder()
                    .username(adminUsername)
                    .email(adminEmail)
                    .password(passwordEncoder.encode(adminPassword))
                    .role(Role.ADMIN)
                    .build();
            userRepository.save(admin);
            log.info("Default ADMIN user created: {}", adminUsername);
        }

        if (!userRepository.existsByUsername(managerUsername)) {
            User manager = User.builder()
                    .username(managerUsername)
                    .email(managerEmail)
                    .password(passwordEncoder.encode(managerPassword))
                    .role(Role.STORE_MANAGER)
                    .build();
            userRepository.save(manager);
            log.info("Default STORE_MANAGER user created: {}", managerUsername);
        }

        if (!userRepository.existsByUsername(cashierUsername)) {
            User cashier = User.builder()
                    .username(cashierUsername)
                    .email(cashierEmail)
                    .password(passwordEncoder.encode(cashierPassword))
                    .role(Role.CASHIER)
                    .build();
            userRepository.save(cashier);
            log.info("Default CASHIER user created: {}", cashierUsername);
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private void normalizeLegacyUserStatus() {
        try {
            var users = userRepository.findAll();
            if (users.isEmpty()) {
                return;
            }
            boolean allInactive = users.stream().allMatch(u -> !u.isActive());
            if (allInactive) {
                users.forEach(u -> u.setActive(true));
                userRepository.saveAll(users);
                log.warn("All existing users were inactive after schema update. Auto-corrected to active=true.");
            }
        } catch (Exception ex) {
            log.warn("Could not normalize legacy user active status: {}", ex.getMessage());
        }
    }
}
