package com.retailtouch.inventory.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "products")
public class Product {

    @Id
    private String id;

    @NotBlank(message = "Product name is required")
    private String name;

    private String description;

    @Indexed(unique = true, sparse = true)
    private String sku;

    @Indexed(unique = true, sparse = true)
    private String barcode;

    private String categoryId;
    private String categoryName;

    @NotNull(message = "Price is required")
    @PositiveOrZero
    private BigDecimal price;

    private BigDecimal costPrice;

    @PositiveOrZero
    private int currentStock;

    @Builder.Default
    private int lowStockThreshold = 10;

    private String unit;
    private String imageUrl;
    private boolean active;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt;
}
