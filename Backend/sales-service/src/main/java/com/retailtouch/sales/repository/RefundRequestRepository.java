package com.retailtouch.sales.repository;

import com.retailtouch.sales.entity.RefundRequestRecord;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RefundRequestRepository extends MongoRepository<RefundRequestRecord, String> {
    List<RefundRequestRecord> findByStatusOrderByRequestedAtDesc(String status);

    boolean existsByTransactionIdAndStatus(String transactionId, String status);
}
