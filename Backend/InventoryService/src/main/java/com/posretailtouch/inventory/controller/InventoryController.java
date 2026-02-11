package com.posretailtouch.inventory.controller;

import com.posretailtouch.inventory.dto.request.StockUpdateRequest;
import com.posretailtouch.inventory.dto.response.InventoryResponse;
import com.posretailtouch.inventory.service.InventoryService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @GetMapping("/{productId}")
    public ResponseEntity<InventoryResponse> getInventory(@PathVariable String productId) {
        return ResponseEntity.ok(inventoryService.getInventory(productId));
    }

    @PostMapping("/{productId}/reserve")
    public ResponseEntity<InventoryResponse> reserveStock(
            @PathVariable String productId,
            @Valid @RequestBody StockUpdateRequest request
    ) {
        return ResponseEntity.ok(inventoryService.reserveStock(productId, request.getQuantity()));
    }

    @PostMapping("/{productId}/add")
    public ResponseEntity<InventoryResponse> addStock(
            @PathVariable String productId,
            @Valid @RequestBody StockUpdateRequest request
    ) {
        return ResponseEntity.ok(inventoryService.addStock(productId, request.getQuantity()));
    }

    @PostMapping("/{productId}/deduct")
    public ResponseEntity<InventoryResponse> deductStock(
            @PathVariable String productId,
            @Valid @RequestBody StockUpdateRequest request
    ) {
        return ResponseEntity.ok(inventoryService.deductStock(productId, request.getQuantity()));
    }
}
