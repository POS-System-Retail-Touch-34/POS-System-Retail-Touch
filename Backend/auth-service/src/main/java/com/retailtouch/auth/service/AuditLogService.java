package com.retailtouch.auth.service;

import com.retailtouch.auth.entity.AuditLog;
import com.retailtouch.auth.repository.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public AuditLogService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public void log(String action, String module, String oldValue, String newValue, String changedBy, String role, String ipAddress) {
        AuditLog entry = AuditLog.builder()
                .action(action)
                .module(module)
                .oldValue(oldValue)
                .newValue(newValue)
                .changedBy(changedBy == null || changedBy.isBlank() ? "system" : changedBy)
                .role(role)
                .ipAddress(ipAddress)
                .build();
        auditLogRepository.save(entry);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> latest() {
        return auditLogRepository.findTop50ByOrderByTimestampDesc();
    }

    @Transactional(readOnly = true)
    public List<AuditLog> latestByAction(String action) {
        return auditLogRepository.findTop20ByActionOrderByTimestampDesc(action);
    }

    @Transactional(readOnly = true)
    public List<AuditLog> latestByModule(String module) {
        return auditLogRepository.findTop20ByModuleOrderByTimestampDesc(module);
    }
}