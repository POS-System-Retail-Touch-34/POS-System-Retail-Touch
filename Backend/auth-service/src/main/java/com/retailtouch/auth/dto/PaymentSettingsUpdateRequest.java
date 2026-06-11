package com.retailtouch.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class PaymentSettingsUpdateRequest {

    private String razorpayKeyId;
    private String razorpaySecret;

    @NotNull
    private Boolean razorpayEnabled;

    @NotNull
    private Boolean cashEnabled;

    @NotNull
    private Boolean upiEnabled;

    @NotNull
    private Boolean cardEnabled;

    @NotNull
    private Boolean walletEnabled;

    @NotBlank(message = "Password is required")
    private String password;
}