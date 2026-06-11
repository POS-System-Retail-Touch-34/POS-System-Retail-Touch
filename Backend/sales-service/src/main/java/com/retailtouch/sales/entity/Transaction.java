package com.retailtouch.sales.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "transactions")
public class Transaction {

    @Id
    private String id;

    @Indexed(unique = true)
    private String invoiceNumber;
    private String customerId;
    private String cashierId;

    private List<SaleItem> items;
    private List<Payment> payments;

    private BigDecimal subtotal;
    private BigDecimal discount;
    private BigDecimal tax;
    private BigDecimal cgstAmount;
    private BigDecimal sgstAmount;
    private BigDecimal igstAmount;
    private BigDecimal totalTax;
    private BigDecimal total;

    @Builder.Default
    private String status = "COMPLETED";

    private String refundReason;
    private String refundedBy;
    private LocalDateTime refundedAt;

    @Builder.Default
    private LocalDateTime timestamp = LocalDateTime.now();
}
