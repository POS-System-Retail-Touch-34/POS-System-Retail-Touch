package com.retailtouch.sales.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Lightweight projection returned by InventoryClient.getStockInfo()
 * — contains just what SalesService needs for pre-sale stock validation.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StockCheckResult {
    private String id;
    private String name;
    private int currentStock;
    private boolean active;
}
