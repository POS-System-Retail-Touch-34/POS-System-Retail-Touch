package com.retailtouch.sales.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RazorpayVerifyRequest {
    @NotBlank(message = "Order ID is required")
    private String orderId;
    @NotBlank(message = "Payment ID is required")
    private String paymentId;
    @NotBlank(message = "Signature is required")
    private String signature;
}
