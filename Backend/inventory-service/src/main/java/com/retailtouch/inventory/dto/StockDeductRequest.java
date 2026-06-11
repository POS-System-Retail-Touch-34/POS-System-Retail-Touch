package com.retailtouch.inventory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import lombok.Data;

@Data
public class StockDeductRequest {

    @NotBlank(message = "Product ID is required")
    @Pattern(regexp = "(?i)^(?!\\s*(undefined|null)\\s*$).+", message = "Product ID is invalid")
    private String productId;

    @Positive(message = "Quantity must be positive")
    private int quantity;

    private String saleId;
}
