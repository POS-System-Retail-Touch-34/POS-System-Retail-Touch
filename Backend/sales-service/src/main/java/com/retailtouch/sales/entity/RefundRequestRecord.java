package com.retailtouch.sales.entity;

import com.retailtouch.sales.dto.RefundLineItem;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "refund_requests")
public class RefundRequestRecord {

    @Id
    private String id;

    @Indexed
    private String transactionId;
    private String reason;
    private List<RefundLineItem> items;
    private String requestedBy;
    private LocalDateTime requestedAt;

    @Builder.Default
    @Indexed
    private String status = "PENDING"; // PENDING, APPROVED, REJECTED

    private String reviewedBy;
    private String reviewNote;
    private LocalDateTime reviewedAt;
}
