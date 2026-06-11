package com.retailtouch.sales.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RefundLineItem {

    @NotBlank(message = "Product ID is required")
    private String productId;

    @Min(value = 1, message = "Refund quantity must be at least 1")
    private int quantity;
}
