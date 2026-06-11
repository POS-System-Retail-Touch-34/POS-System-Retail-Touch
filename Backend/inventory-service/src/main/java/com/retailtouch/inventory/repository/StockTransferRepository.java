package com.retailtouch.inventory.repository;

import com.retailtouch.inventory.entity.StockTransfer;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface StockTransferRepository extends MongoRepository<StockTransfer, String> {
}
