package com.retailtouch.auth.controller;

import com.retailtouch.auth.dto.InternalAuditEvent;
import com.retailtouch.auth.service.AdminSettingsService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/auth/internal")
public class InternalSettingsController {

    private final AdminSettingsService adminSettingsService;

    public InternalSettingsController(AdminSettingsService adminSettingsService) {
        this.adminSettingsService = adminSettingsService;
    }

    @GetMapping("/maintenance")
    public Map<String, Object> maintenanceState() {
        return Map.of("maintenanceMode", adminSettingsService.isMaintenanceModeEnabled());
    }

    @PostMapping("/audit")
    public ResponseEntity<Map<String, Object>> audit(@RequestBody InternalAuditEvent event) {
        adminSettingsService.logCustomAudit(event);
        return ResponseEntity.ok(Map.of("status", "accepted"));
    }
}
