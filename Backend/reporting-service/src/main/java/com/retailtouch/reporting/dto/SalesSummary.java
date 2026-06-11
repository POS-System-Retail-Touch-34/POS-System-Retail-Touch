package com.retailtouch.reporting.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SalesSummary {
    private String label;
    private long transactionCount;
    private BigDecimal totalSales;
    private BigDecimal totalTax;
}
