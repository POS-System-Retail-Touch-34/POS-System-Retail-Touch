package com.retailtouch.inventory.service;

import com.retailtouch.inventory.entity.Product;
import com.retailtouch.inventory.entity.StockTransfer;
import com.retailtouch.inventory.repository.StockTransferRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class StockTransferService {

    private final StockTransferRepository transferRepository;
    private final InventoryService inventoryService;

    public StockTransferService(StockTransferRepository transferRepository, InventoryService inventoryService) {
        this.transferRepository = transferRepository;
        this.inventoryService = inventoryService;
    }

    @Transactional
    public StockTransfer transferStock(StockTransfer transfer) {
        Product product = inventoryService.getProductById(transfer.getProductId());

        if (product.getCurrentStock() < transfer.getQuantity()) {
            throw new RuntimeException("Insufficient stock for transfer");
        }

        // Logic for locations would go here (e.g. subtracting from one store, adding to
        // another)
        // For this microservice, we just log the transfer and update the product stock
        // if moving out of "Inventory"

        transfer.setTransferDate(LocalDateTime.now());
        return transferRepository.save(transfer);
    }
}
