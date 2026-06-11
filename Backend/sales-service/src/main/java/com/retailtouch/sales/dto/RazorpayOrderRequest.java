package com.retailtouch.sales.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class RazorpayOrderRequest {
    @NotNull(message = "Amount is required")
    @Positive(message = "Amount must be greater than zero")
    private BigDecimal amount;

    private String method;
}
