package com.retailtouch.sales.repository;

import com.retailtouch.sales.entity.Transaction;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface TransactionRepository extends MongoRepository<Transaction, String> {
    Optional<Transaction> findByInvoiceNumber(String invoiceNumber);

    long countByInvoiceNumberStartingWith(String invoicePrefixWithDate);

    List<Transaction> findByTimestampBetween(LocalDateTime start, LocalDateTime end);

    List<Transaction> findByCashierId(String cashierId);

    List<Transaction> findByCustomerIdAndStatus(String customerId, String status);

    List<Transaction> findByCustomerIdAndStatusOrderByTimestampDesc(String customerId, String status);

    List<Transaction> findTop10ByStatusOrderByTimestampDesc(String status);

    List<Transaction> findByCustomerIdAndStatusInOrderByTimestampDesc(String customerId, List<String> statuses);

    List<Transaction> findTop10ByStatusInOrderByTimestampDesc(List<String> statuses);
}
