package com.retailtouch.auth.service;

import com.retailtouch.auth.dto.PaymentSettingsUpdateRequest;
import com.retailtouch.auth.dto.SystemSettingsUpdateRequest;
import com.retailtouch.auth.dto.TaxGstUpdateRequest;
import com.retailtouch.auth.dto.InternalAuditEvent;
import com.retailtouch.auth.entity.AdminSettings;
import com.retailtouch.auth.entity.AuditLog;
import com.retailtouch.auth.entity.User;
import com.retailtouch.auth.repository.AdminSettingsRepository;
import com.retailtouch.auth.repository.AuditLogRepository;
import com.retailtouch.auth.repository.UserRepository;
import com.retailtouch.common.exception.ResourceNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class AdminSettingsService {

    private static final long SINGLETON_SETTINGS_ID = 1L;

    private final AdminSettingsRepository adminSettingsRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecretCryptoService secretCryptoService;
    private final AuditLogService auditLogService;
    private final AuditLogRepository auditLogRepository;

    public AdminSettingsService(AdminSettingsRepository adminSettingsRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            SecretCryptoService secretCryptoService,
            AuditLogService auditLogService,
            AuditLogRepository auditLogRepository) {
        this.adminSettingsRepository = adminSettingsRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.secretCryptoService = secretCryptoService;
        this.auditLogService = auditLogService;
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getTaxGstSettings() {
        AdminSettings settings = getOrCreateSettings();
        return taxMap(settings);
    }

    @Transactional
    public Map<String, Object> updateTaxGstSettings(TaxGstUpdateRequest request, String actor, String role, String ipAddress) {
        ensurePasswordMatches(actor, request.getPassword());
        AdminSettings settings = getOrCreateSettings();
        String oldValue = taxMap(settings).toString();

        settings.setCgstPercent(request.getCgstPercent());
        settings.setSgstPercent(request.getSgstPercent());
        settings.setIgstPercent(request.getIgstPercent());
        settings.setTaxInclusive(request.getTaxInclusive());
        settings.setDefaultGstPercent(request.getDefaultGstPercent());
        settings.setHsnCodeRequired(request.getHsnCodeRequired());

        AdminSettings saved = adminSettingsRepository.save(settings);
        String newValue = taxMap(saved).toString();
        auditLogService.log("GST_CHANGE", "TAX_GST", oldValue, newValue, actor, role, ipAddress);

        return taxMap(saved);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getPaymentSettings() {
        AdminSettings settings = getOrCreateSettings();
        return paymentMap(settings);
    }

    @Transactional
    public Map<String, Object> updatePaymentSettings(PaymentSettingsUpdateRequest request, String actor, String role, String ipAddress) {
        ensurePasswordMatches(actor, request.getPassword());
        AdminSettings settings = getOrCreateSettings();
        String oldValue = paymentMap(settings).toString();

        settings.setRazorpayKeyId(request.getRazorpayKeyId());
        if (request.getRazorpaySecret() != null && !request.getRazorpaySecret().isBlank()) {
            settings.setRazorpaySecretEncrypted(secretCryptoService.encrypt(request.getRazorpaySecret()));
        }
        settings.setRazorpayEnabled(request.getRazorpayEnabled());
        settings.setCashEnabled(request.getCashEnabled());
        settings.setUpiEnabled(request.getUpiEnabled());
        settings.setCardEnabled(request.getCardEnabled());
        settings.setWalletEnabled(request.getWalletEnabled());

        AdminSettings saved = adminSettingsRepository.save(settings);
        String newValue = paymentMap(saved).toString();
        auditLogService.log("PAYMENT_CONFIGURATION_CHANGE", "PAYMENT", oldValue, newValue, actor, role, ipAddress);

        return paymentMap(saved);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getSystemSettings() {
        AdminSettings settings = getOrCreateSettings();
        return systemMap(settings);
    }

    @Transactional
    public Map<String, Object> updateSystemSettings(SystemSettingsUpdateRequest request, String actor, String role, String ipAddress) {
        AdminSettings settings = getOrCreateSettings();
        String oldValue = systemMap(settings).toString();

        settings.setMaintenanceMode(request.getMaintenanceMode());
        settings.setIdleTimeoutMinutes(request.getIdleTimeoutMinutes());
        if (request.getLoyaltyConversionRate() != null) {
            settings.setLoyaltyConversionRate(request.getLoyaltyConversionRate());
        }

        AdminSettings saved = adminSettingsRepository.save(settings);
        String newValue = systemMap(saved).toString();
        auditLogService.log("SYSTEM_SETTINGS_CHANGE", "SYSTEM", oldValue, newValue, actor, role, ipAddress);

        return systemMap(saved);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getSecurityOverview() {
        AdminSettings settings = getOrCreateSettings();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("recentSecurityAlerts", auditLogService.latestByModule("SECURITY"));
        response.put("failedLoginAttempts", auditLogService.latestByAction("LOGIN_FAILED"));
        response.put("suspiciousActivityLog", auditLogService.latestByAction("SUSPICIOUS_ACTIVITY"));

        Map<String, Object> passwordPolicy = new LinkedHashMap<>();
        passwordPolicy.put("minLength", settings.getPasswordMinLength());
        passwordPolicy.put("requireUppercase", settings.isPasswordRequireUppercase());
        passwordPolicy.put("requireNumber", settings.isPasswordRequireNumber());
        passwordPolicy.put("requireSpecial", settings.isPasswordRequireSpecial());
        response.put("passwordPolicy", passwordPolicy);

        BigDecimal gstTotal = settings.getCgstPercent()
                .add(settings.getSgstPercent())
                .add(settings.getIgstPercent());
        response.put("complianceStatus", Map.of("gstConfigured", gstTotal.compareTo(BigDecimal.ZERO) > 0));
        response.put("idleTimeoutMinutes", settings.getIdleTimeoutMinutes());
        response.put("auditLogs", auditLogService.latest());
        return response;
    }

    @Transactional(readOnly = true)
    public boolean verifyPassword(String username, String rawPassword) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
        return passwordEncoder.matches(rawPassword, user.getPassword());
    }

    @Transactional(readOnly = true)
    public boolean isMaintenanceModeEnabled() {
        return getOrCreateSettings().isMaintenanceMode();
    }

    @Transactional
    public Map<String, Object> backupDatabase(String actor, String role, String ipAddress) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("status", "queued");
        payload.put("requestedAt", LocalDateTime.now().toString());
        auditLogService.log("DATABASE_BACKUP", "SYSTEM", null, payload.toString(), actor, role, ipAddress);
        return payload;
    }

    @Transactional
    public Map<String, Object> restoreDatabase(String actor, String role, String ipAddress) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("status", "queued");
        payload.put("requestedAt", LocalDateTime.now().toString());
        auditLogService.log("DATABASE_RESTORE", "SYSTEM", null, payload.toString(), actor, role, ipAddress);
        return payload;
    }

    @Transactional
    public Map<String, Object> clearCache(String actor, String role, String ipAddress) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("status", "success");
        payload.put("clearedAt", LocalDateTime.now().toString());
        auditLogService.log("CACHE_CLEAR", "SYSTEM", null, payload.toString(), actor, role, ipAddress);
        return payload;
    }

    @Transactional(readOnly = true)
    public List<AuditLog> getAuditLogs() {
        return auditLogService.latest();
    }

    @Transactional
    public void logSecurityEvent(String action, String changedBy, String role, String ipAddress, String newValue) {
        auditLogService.log(action, "SECURITY", null, newValue, changedBy, role, ipAddress);

        if ("LOGIN_FAILED".equals(action) && changedBy != null && !changedBy.isBlank()) {
            long recentFailures = auditLogRepository.countByActionAndChangedByAndTimestampAfter(
                    "LOGIN_FAILED",
                    changedBy,
                    LocalDateTime.now().minusMinutes(15));
            if (recentFailures >= getOrCreateSettings().getFailedLoginThreshold()) {
                auditLogService.log(
                        "SUSPICIOUS_ACTIVITY",
                        "SECURITY",
                        null,
                        "Repeated failed login attempts",
                        changedBy,
                        role,
                        ipAddress);
            }
        }
    }

    @Transactional
    public void logCustomAudit(InternalAuditEvent event) {
        if (event == null || event.getAction() == null || event.getAction().isBlank()) {
            return;
        }
        auditLogService.log(
                event.getAction(),
                event.getModule() == null || event.getModule().isBlank() ? "GENERAL" : event.getModule(),
                event.getOldValue(),
                event.getNewValue(),
                event.getChangedBy(),
                event.getRole(),
                event.getIpAddress());
    }

    private AdminSettings getOrCreateSettings() {
        return adminSettingsRepository.findById(SINGLETON_SETTINGS_ID)
                .orElseGet(() -> adminSettingsRepository.save(AdminSettings.builder().id(SINGLETON_SETTINGS_ID).build()));
    }

    private Map<String, Object> taxMap(AdminSettings settings) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("cgstPercent", settings.getCgstPercent());
        map.put("sgstPercent", settings.getSgstPercent());
        map.put("igstPercent", settings.getIgstPercent());
        map.put("taxInclusive", settings.isTaxInclusive());
        map.put("defaultGstPercent", settings.getDefaultGstPercent());
        map.put("hsnCodeRequired", settings.isHsnCodeRequired());
        return map;
    }

    private Map<String, Object> paymentMap(AdminSettings settings) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("razorpayKeyId", settings.getRazorpayKeyId());
        map.put("razorpaySecret", maskSecret(secretCryptoService.decrypt(settings.getRazorpaySecretEncrypted())));
        map.put("razorpayEnabled", settings.isRazorpayEnabled());
        map.put("cashEnabled", settings.isCashEnabled());
        map.put("upiEnabled", settings.isUpiEnabled());
        map.put("cardEnabled", settings.isCardEnabled());
        map.put("walletEnabled", settings.isWalletEnabled());
        return map;
    }

    private Map<String, Object> systemMap(AdminSettings settings) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("maintenanceMode", settings.isMaintenanceMode());
        map.put("idleTimeoutMinutes", settings.getIdleTimeoutMinutes());
        map.put("loyaltyConversionRate", settings.getLoyaltyConversionRate() == null ? BigDecimal.ONE : settings.getLoyaltyConversionRate());
        map.put("systemVersion", settings.getSystemVersion());
        return map;
    }

    private String maskSecret(String secret) {
        if (secret == null || secret.isBlank()) {
            return "";
        }
        if (secret.length() <= 4) {
            return "****";
        }
        return "*".repeat(secret.length() - 4) + secret.substring(secret.length() - 4);
    }

    private void ensurePasswordMatches(String username, String rawPassword) {
        if (!verifyPassword(username, rawPassword)) {
            throw new IllegalArgumentException("Invalid password");
        }
    }
}
