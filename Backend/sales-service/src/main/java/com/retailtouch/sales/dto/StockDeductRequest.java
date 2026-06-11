package com.retailtouch.sales.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class StockDeductRequest {
    private String productId;
    private int quantity;
    private String saleId;
}
