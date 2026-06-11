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
@Document(collection = "stock_transfers")
public class StockTransfer {
    @Id
    private String id;
    private String productId;
    private int quantity;
    private String fromLocation;
    private String toLocation;
    private String reason;
    private LocalDateTime transferDate;
    private String performedBy;
}
