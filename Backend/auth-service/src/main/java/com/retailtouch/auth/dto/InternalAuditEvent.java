package com.retailtouch.auth.dto;

import lombok.Data;

@Data
public class InternalAuditEvent {
    private String action;
    private String module;
    private String oldValue;
    private String newValue;
    private String changedBy;
    private String role;
    private String ipAddress;
}