package com.retailtouch.inventory.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProductDTO {

    private String id;

    @NotBlank(message = "Product name is required")
    private String name;

    private String description;
    private String sku;
    private String barcode;
    private String categoryId;
    private String categoryName;

    @NotNull(message = "Price is required")
    @PositiveOrZero(message = "Price must be zero or positive")
    private BigDecimal price;

    private BigDecimal costPrice;

    @PositiveOrZero
    private int currentStock;

    private int lowStockThreshold;
    private String unit;
    private String imageUrl;
    private boolean active;
}
