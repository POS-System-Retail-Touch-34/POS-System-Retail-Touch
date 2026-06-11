package com.retailtouch.sales.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.Valid;
import lombok.Data;

import java.util.List;

@Data
public class RefundRequest {

    @NotNull(message = "Transaction ID is required")
    private String transactionId;

    @NotBlank(message = "Refund reason is required")
    private String reason;

    @NotEmpty(message = "At least one item must be selected for refund")
    private List<@Valid RefundLineItem> items;

    private String refundedBy;
}
