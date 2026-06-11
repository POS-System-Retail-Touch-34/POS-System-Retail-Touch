package com.retailtouch.sales.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import lombok.Data;

import java.math.BigDecimal;
import java.util.List;

@Data
public class SaleRequest {

    private String customerId;

    @NotBlank(message = "Cashier ID is required")
    private String cashierId;

    @NotEmpty(message = "At least one item required")
    @Valid
    private List<SaleItemRequest> items;

    @NotEmpty(message = "At least one payment method required")
    @Valid
    private List<PaymentRequest> payments;

    private BigDecimal discount;

    @PositiveOrZero(message = "Redeem points cannot be negative")
    private Integer redeemPoints = 0;

    @Positive(message = "Loyalty conversion rate must be greater than zero")
    private BigDecimal loyaltyConversionRate;

    private Boolean interstate = false;

    @Data
    public static class SaleItemRequest {
        @NotBlank(message = "Product ID is required")
        @Pattern(regexp = "(?i)^(?!\\s*(undefined|null)\\s*$).+", message = "Product ID is invalid")
        private String productId;
        private String productName;
        private String sku;
        private String categoryName;
        @Positive(message = "Quantity must be greater than zero")
        private int quantity;
        @NotNull
        private BigDecimal unitPrice;
        private BigDecimal taxRate;
        private Boolean manualItem = false;
    }

    @Data
    public static class PaymentRequest {
        @NotBlank(message = "Payment method is required")
        private String method;
        @NotNull
        private BigDecimal amount;
        private String referenceNumber;
        private String gateway;
        private String orderId;
        private String paymentId;
        private String signature;
    }
}
