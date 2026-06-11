package com.retailtouch.inventory.controller;

import com.retailtouch.common.dto.ApiResponse;
import com.retailtouch.common.exception.ResourceNotFoundException;
import com.retailtouch.inventory.dto.ProductDTO;
import com.retailtouch.inventory.dto.StockAdjustmentRequest;
import com.retailtouch.inventory.dto.StockDeductRequest;
import com.retailtouch.inventory.entity.Product;
import com.retailtouch.inventory.service.InventoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
@Tag(name = "Products", description = "Product management APIs")
public class ProductController {

    private final InventoryService inventoryService;

    public ProductController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    @Operation(summary = "Get all products")
    @GetMapping
    @PreAuthorize("hasAnyRole('CASHIER','STORE_MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<Product>>> getAllProducts() {
        return ResponseEntity.ok(ApiResponse.success(inventoryService.getAllProducts(), "Products retrieved"));
    }

    @Operation(summary = "Get product by ID")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CASHIER','STORE_MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<Product>> getProductById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(inventoryService.getProductById(id), "Product found"));
    }

    @Operation(summary = "Search products by name")
    @GetMapping("/search")
    @PreAuthorize("hasAnyRole('CASHIER','STORE_MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<Product>>> searchByName(@RequestParam String name) {
        return ResponseEntity.ok(ApiResponse.success(inventoryService.searchByName(name), "Search results"));
    }

    @Operation(summary = "Find product by barcode")
    @GetMapping("/barcode/{barcode}")
    @PreAuthorize("hasAnyRole('CASHIER','STORE_MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<Product>> getByBarcode(@PathVariable String barcode) {
        return ResponseEntity.ok(ApiResponse.success(inventoryService.getByBarcode(barcode), "Product found"));
    }

    @Operation(summary = "Find product by SKU")
    @GetMapping("/sku/{sku}")
    @PreAuthorize("hasAnyRole('CASHIER','STORE_MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<Product>> getBySku(@PathVariable String sku) {
        return ResponseEntity.ok(ApiResponse.success(inventoryService.getBySku(sku), "Product found"));
    }

    @Operation(summary = "Create new product")
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Product>> createProduct(@Valid @RequestBody ProductDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(inventoryService.createProduct(dto), "Product created successfully"));
    }

    @Operation(summary = "Update product")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Product>> updateProduct(@PathVariable String id,
            @Valid @RequestBody ProductDTO dto) {
        return ResponseEntity.ok(ApiResponse.success(inventoryService.updateProduct(id, dto), "Product updated"));
    }

    @Operation(summary = "Delete product")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Void>> deleteProduct(@PathVariable String id) {
        inventoryService.deleteProduct(id);
        return ResponseEntity.ok(ApiResponse.success("Product deleted successfully"));
    }

    @Operation(summary = "Adjust stock quantity")
    @PostMapping("/stock/adjust")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<Product>> adjustStock(@Valid @RequestBody StockAdjustmentRequest request) {
        return ResponseEntity.ok(ApiResponse.success(inventoryService.adjustStock(request), "Stock adjusted"));
    }

    @Operation(summary = "Bulk adjust stock quantity")
    @PostMapping("/stock/adjust-bulk")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<Product>>> adjustStockBulk(
            @Valid @RequestBody List<StockAdjustmentRequest> requests) {
        return ResponseEntity
                .ok(ApiResponse.success(inventoryService.bulkAdjustStock(requests), "Stock adjusted in bulk"));
    }

    @Operation(summary = "Deduct stock (used by Sales Service)")
    @PostMapping("/stock/deduct")
    @PreAuthorize("hasAnyRole('CASHIER','STORE_MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<Product>> deductStock(@Valid @RequestBody StockDeductRequest request) {
        Product product = inventoryService.getProductById(request.getProductId());
        StockAdjustmentRequest adj = new StockAdjustmentRequest();
        adj.setProductId(request.getProductId());
        adj.setQuantity(-request.getQuantity());
        adj.setReason("Sale deduction: " + request.getSaleId());
        return ResponseEntity.ok(ApiResponse.success(inventoryService.adjustStock(adj), "Stock deducted"));
    }

    @Operation(summary = "Bulk deduct stock (used by Sales Service)")
    @PostMapping("/stock/deduct-bulk")
    @PreAuthorize("hasAnyRole('CASHIER','STORE_MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<Product>>> deductStockBulk(
            @Valid @RequestBody List<StockDeductRequest> requests) {
        return ResponseEntity
                .ok(ApiResponse.success(inventoryService.bulkDeductStock(requests), "Stock deducted in bulk"));
    }

    @Operation(summary = "Get low stock products")
    @GetMapping("/low-stock")
    @PreAuthorize("hasAnyRole('STORE_MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<Product>>> getLowStockProducts() {
        return ResponseEntity.ok(ApiResponse.success(inventoryService.getLowStockProducts(), "Low stock products"));
    }

    @Operation(summary = "Get products by category")
    @GetMapping("/category/{categoryId}")
    @PreAuthorize("hasAnyRole('CASHIER','STORE_MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<Product>>> getByCategory(@PathVariable String categoryId) {
        return ResponseEntity
                .ok(ApiResponse.success(inventoryService.getByCategory(categoryId), "Products by category"));
    }
}
