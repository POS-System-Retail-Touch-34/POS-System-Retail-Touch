package com.retailtouch.auth.controller;

import com.retailtouch.auth.dto.PasswordVerifyRequest;
import com.retailtouch.auth.dto.PaymentSettingsUpdateRequest;
import com.retailtouch.auth.dto.SystemSettingsUpdateRequest;
import com.retailtouch.auth.dto.TaxGstUpdateRequest;
import com.retailtouch.auth.entity.AuditLog;
import com.retailtouch.auth.service.AdminSettingsService;
import com.retailtouch.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/settings")
@Tag(name = "Admin Settings", description = "Enterprise admin settings APIs")
@PreAuthorize("hasRole('ADMIN')")
public class AdminSettingsController {

    private final AdminSettingsService adminSettingsService;

    public AdminSettingsController(AdminSettingsService adminSettingsService) {
        this.adminSettingsService = adminSettingsService;
    }

    @Operation(summary = "Get security section details")
    @GetMapping("/security")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSecuritySettings() {
        return ResponseEntity.ok(ApiResponse.success(adminSettingsService.getSecurityOverview(), "Security settings fetched"));
    }

    @Operation(summary = "Get GST and tax settings")
    @GetMapping("/tax-gst")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTaxGstSettings() {
        return ResponseEntity.ok(ApiResponse.success(adminSettingsService.getTaxGstSettings(), "Tax settings fetched"));
    }

    @Operation(summary = "Update GST and tax settings")
    @PutMapping("/tax-gst")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateTaxGstSettings(
            @Valid @RequestBody TaxGstUpdateRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        String actor = authentication.getName();
        String role = authentication.getAuthorities().stream().findFirst().map(Object::toString).orElse("ROLE_ADMIN");
        return ResponseEntity.ok(ApiResponse.success(
                adminSettingsService.updateTaxGstSettings(request, actor, role, httpRequest.getRemoteAddr()),
                "Tax settings updated"));
    }

    @Operation(summary = "Verify admin password")
    @PostMapping("/verify-password")
    public ResponseEntity<ApiResponse<Map<String, Object>>> verifyPassword(
            @Valid @RequestBody PasswordVerifyRequest request,
            Authentication authentication) {
        boolean valid = adminSettingsService.verifyPassword(authentication.getName(), request.getPassword());
        return ResponseEntity.ok(ApiResponse.success(Map.of("valid", valid), valid ? "Password verified" : "Invalid password"));
    }

    @Operation(summary = "Get payment settings")
    @GetMapping("/payment")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getPaymentSettings() {
        return ResponseEntity.ok(ApiResponse.success(adminSettingsService.getPaymentSettings(), "Payment settings fetched"));
    }

    @Operation(summary = "Update payment settings")
    @PutMapping("/payment")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updatePaymentSettings(
            @Valid @RequestBody PaymentSettingsUpdateRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        String actor = authentication.getName();
        String role = authentication.getAuthorities().stream().findFirst().map(Object::toString).orElse("ROLE_ADMIN");
        return ResponseEntity.ok(ApiResponse.success(
                adminSettingsService.updatePaymentSettings(request, actor, role, httpRequest.getRemoteAddr()),
                "Payment settings updated"));
    }

    @Operation(summary = "Get system settings")
    @GetMapping("/system")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSystemSettings() {
        return ResponseEntity.ok(ApiResponse.success(adminSettingsService.getSystemSettings(), "System settings fetched"));
    }

    @Operation(summary = "Update system settings")
    @PutMapping("/system")
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateSystemSettings(
            @Valid @RequestBody SystemSettingsUpdateRequest request,
            Authentication authentication,
            HttpServletRequest httpRequest) {
        String actor = authentication.getName();
        String role = authentication.getAuthorities().stream().findFirst().map(Object::toString).orElse("ROLE_ADMIN");
        return ResponseEntity.ok(ApiResponse.success(
                adminSettingsService.updateSystemSettings(request, actor, role, httpRequest.getRemoteAddr()),
                "System settings updated"));
    }

    @Operation(summary = "Request database backup")
    @PostMapping("/system/backup")
    public ResponseEntity<ApiResponse<Map<String, Object>>> backup(
            Authentication authentication,
            HttpServletRequest httpRequest) {
        String actor = authentication.getName();
        String role = authentication.getAuthorities().stream().findFirst().map(Object::toString).orElse("ROLE_ADMIN");
        return ResponseEntity.ok(ApiResponse.success(
                adminSettingsService.backupDatabase(actor, role, httpRequest.getRemoteAddr()),
                "Backup request submitted"));
    }

    @Operation(summary = "Request database restore")
    @PostMapping("/system/restore")
    public ResponseEntity<ApiResponse<Map<String, Object>>> restore(
            Authentication authentication,
            HttpServletRequest httpRequest) {
        String actor = authentication.getName();
        String role = authentication.getAuthorities().stream().findFirst().map(Object::toString).orElse("ROLE_ADMIN");
        return ResponseEntity.ok(ApiResponse.success(
                adminSettingsService.restoreDatabase(actor, role, httpRequest.getRemoteAddr()),
                "Restore request submitted"));
    }

    @Operation(summary = "Clear cache")
    @PostMapping("/system/clear-cache")
    public ResponseEntity<ApiResponse<Map<String, Object>>> clearCache(
            Authentication authentication,
            HttpServletRequest httpRequest) {
        String actor = authentication.getName();
        String role = authentication.getAuthorities().stream().findFirst().map(Object::toString).orElse("ROLE_ADMIN");
        return ResponseEntity.ok(ApiResponse.success(
                adminSettingsService.clearCache(actor, role, httpRequest.getRemoteAddr()),
                "Cache cleared"));
    }

    @Operation(summary = "View audit logs")
    @GetMapping("/audit")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getAuditLogs() {
        return ResponseEntity.ok(ApiResponse.success(adminSettingsService.getAuditLogs(), "Audit logs fetched"));
    }
}