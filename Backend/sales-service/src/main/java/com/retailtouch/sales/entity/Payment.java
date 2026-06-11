package com.retailtouch.sales.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Payment {
    private String method; // CASH, CARD, UPI, LOYALTY_POINTS, MIXED
    private BigDecimal amount;
    private String referenceNumber;
    private String gateway;
    private String orderId;
    private String paymentId;
    private boolean signatureVerified;
}
