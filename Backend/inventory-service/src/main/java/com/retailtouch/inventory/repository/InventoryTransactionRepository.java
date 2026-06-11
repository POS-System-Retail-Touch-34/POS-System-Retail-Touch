package com.retailtouch.inventory.repository;

import com.retailtouch.inventory.entity.InventoryTransaction;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface InventoryTransactionRepository extends MongoRepository<InventoryTransaction, String> {
    List<InventoryTransaction> findByProductId(String productId);
}
