package com.retailtouch.auth.repository;

import com.retailtouch.auth.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findTop50ByOrderByTimestampDesc();
    List<AuditLog> findTop20ByModuleOrderByTimestampDesc(String module);
    List<AuditLog> findTop20ByActionOrderByTimestampDesc(String action);
    long countByActionAndChangedByAndTimestampAfter(String action, String changedBy, LocalDateTime timestamp);
}