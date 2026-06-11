package com.retailtouch.sales.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class StockAdjustmentRequest {
    private String productId;
    private int quantity;
    private String reason;
    private String performedBy;
}
