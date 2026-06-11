package com.retailtouch.inventory.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Document(collection = "inventory_transactions")
public class InventoryTransaction {
    @Id
    private String id;
    private String productId;
    private int changeAmount;
    private int stockAfter;
    private String type; // SALE, ADJUSTMENT, TRANSFER, RETURN
    private String reason;
    private String referenceId; // SaleId or TransferId
    private LocalDateTime timestamp;
    private String performedBy;
}
