package com.retailtouch.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class PasswordVerifyRequest {
    @NotBlank(message = "Password is required")
    private String password;
}