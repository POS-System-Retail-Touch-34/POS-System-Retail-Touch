package com.posretailtouch.inventory.service;

import com.posretailtouch.inventory.dto.response.InventoryResponse;
import com.posretailtouch.inventory.entity.Inventory;
import com.posretailtouch.inventory.entity.Product;
import com.posretailtouch.inventory.exception.OutOfStockException;
import com.posretailtouch.inventory.exception.ResourceNotFoundException;
import com.posretailtouch.inventory.model.StockStatus;
import com.posretailtouch.inventory.repository.InventoryRepository;
import com.posretailtouch.inventory.repository.ProductRepository;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class InventoryService {

    private static final int LOW_STOCK_THRESHOLD = 5;

    private final InventoryRepository inventoryRepository;
    private final ProductRepository productRepository;

    public InventoryResponse getInventory(String productId) {
        Inventory inventory = requireInventory(productId);
        return toResponse(inventory);
    }

    public InventoryResponse reserveStock(String productId, int quantity) {
        Inventory inventory = requireInventory(productId);
        int available = inventory.getAvailable();
        if (available < quantity) {
            throw new OutOfStockException("Not enough stock to reserve. Available: " + available);
        }
        inventory.setReserved(inventory.getReserved() + quantity);
        return toResponse(inventoryRepository.save(inventory));
    }

    public InventoryResponse addStock(String productId, int quantity) {
        requireProduct(productId);
        Inventory inventory = inventoryRepository.findByProductId(productId)
                .orElseGet(() -> new Inventory(productId, 0));
        inventory.setQuantity(inventory.getQuantity() + quantity);
        return toResponse(inventoryRepository.save(inventory));
    }

    public InventoryResponse deductStock(String productId, int quantity) {
        Inventory inventory = requireInventory(productId);
        if (inventory.getQuantity() < quantity) {
            throw new OutOfStockException("Not enough stock to deduct. Available: " + inventory.getQuantity());
        }
        inventory.setQuantity(inventory.getQuantity() - quantity);
        int reserved = inventory.getReserved();
        if (reserved > 0) {
            inventory.setReserved(Math.max(0, reserved - quantity));
        }
        return toResponse(inventoryRepository.save(inventory));
    }

    private Inventory requireInventory(String productId) {
        return inventoryRepository.findByProductId(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found for productId " + productId));
    }

    private Product requireProduct(String productId) {
        return productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found for productId " + productId));
    }

    private InventoryResponse toResponse(Inventory inventory) {
        int available = inventory.getAvailable();
        StockStatus status;
        if (available <= 0) {
            status = StockStatus.OUT_OF_STOCK;
        } else if (available <= LOW_STOCK_THRESHOLD) {
            status = StockStatus.LOW_STOCK;
        } else {
            status = StockStatus.AVAILABLE;
        }
        Product product = requireProduct(inventory.getProductId());
        return new InventoryResponse(product.getId(), product.getSku(), product.getName(),
                inventory.getQuantity(), inventory.getReserved(), available, status);
    }
}
