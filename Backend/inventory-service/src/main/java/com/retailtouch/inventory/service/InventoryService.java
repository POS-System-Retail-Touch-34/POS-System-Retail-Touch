package com.retailtouch.inventory.service;

import com.retailtouch.common.exception.ResourceNotFoundException;
import com.retailtouch.inventory.config.RabbitMQConfig;
import com.retailtouch.inventory.dto.ProductDTO;
import com.retailtouch.inventory.dto.StockAdjustmentRequest;
import com.retailtouch.inventory.entity.InventoryTransaction;
import com.retailtouch.inventory.entity.Product;
import com.retailtouch.inventory.repository.InventoryTransactionRepository;
import com.retailtouch.inventory.repository.ProductRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class InventoryService {
    private static final Logger log = LoggerFactory.getLogger(InventoryService.class);

    private final ProductRepository productRepository;
    private final InventoryTransactionRepository transactionRepository;
    private final RabbitTemplate rabbitTemplate;

    @Value("${auth-service.url}")
    private String authServiceUrl;

    @Value("${inventory.low-stock-threshold}")
    private int defaultLowStockThreshold;

    public InventoryService(ProductRepository productRepository,
            InventoryTransactionRepository transactionRepository,
            RabbitTemplate rabbitTemplate) {
        this.productRepository = productRepository;
        this.transactionRepository = transactionRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    public Product getProductById(String id) {
        return productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with id: " + id));
    }

    public List<Product> searchByName(String name) {
        if (name == null || name.trim().isEmpty()) {
            return java.util.Collections.emptyList();
        }
        return productRepository.searchByKeyword(name.trim());
    }

    public Product getByBarcode(String barcode) {
        return productRepository.findByBarcode(barcode)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with barcode: " + barcode));
    }

    public Product getBySku(String sku) {
        return productRepository.findBySku(sku)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with SKU: " + sku));
    }

    public Product createProduct(ProductDTO dto) {
        if (dto.getSku() != null && productRepository.existsBySku(dto.getSku())) {
            throw new IllegalArgumentException("Product with SKU '" + dto.getSku() + "' already exists");
        }
        if (dto.getBarcode() != null && productRepository.existsByBarcode(dto.getBarcode())) {
            throw new IllegalArgumentException("Product with barcode '" + dto.getBarcode() + "' already exists");
        }

        Product product = Product.builder()
                .name(dto.getName())
                .description(dto.getDescription())
                .sku(dto.getSku())
                .barcode(dto.getBarcode())
                .categoryId(dto.getCategoryId())
                .categoryName(dto.getCategoryName())
                .price(dto.getPrice())
                .costPrice(dto.getCostPrice())
                .currentStock(dto.getCurrentStock())
                .lowStockThreshold(dto.getLowStockThreshold() > 0 ? dto.getLowStockThreshold() : defaultLowStockThreshold)
                .unit(dto.getUnit())
                .imageUrl(dto.getImageUrl())
                .active(true)
                .createdAt(LocalDateTime.now())
                .build();

        log.info("Creating product: {}", product.getName());
        return productRepository.save(product);
    }

    public Product updateProduct(String id, ProductDTO dto) {
        Product existing = getProductById(id);

        existing.setName(dto.getName());
        existing.setDescription(dto.getDescription());
        existing.setPrice(dto.getPrice());
        existing.setCostPrice(dto.getCostPrice());
        existing.setCategoryId(dto.getCategoryId());
        existing.setCategoryName(dto.getCategoryName());
        existing.setUnit(dto.getUnit());
        existing.setImageUrl(dto.getImageUrl());
        existing.setActive(dto.isActive());
        existing.setLowStockThreshold(
                dto.getLowStockThreshold() > 0 ? dto.getLowStockThreshold() : existing.getLowStockThreshold());
        existing.setUpdatedAt(LocalDateTime.now());

        return productRepository.save(existing);
    }

    public void deleteProduct(String id) {
        getProductById(id);
        productRepository.deleteById(id);
        log.info("Product deleted: {}", id);
    }

    @Transactional
    public Product adjustStock(StockAdjustmentRequest request) {
        Product product = getProductById(request.getProductId());

        int newStock = product.getCurrentStock() + request.getQuantity();
        if (newStock < 0) {
            throw new IllegalStateException("Insufficient stock. Current: " + product.getCurrentStock()
                    + ", Requested deduction: " + Math.abs(request.getQuantity()));
        }

        log.info("Adjusting stock for productId={} currentStock={} delta={} reason={}",
                product.getId(), product.getCurrentStock(), request.getQuantity(), request.getReason());
        product.setCurrentStock(newStock);
        product.setUpdatedAt(LocalDateTime.now());
        Product updated = productRepository.save(product);
        log.debug("Stock persisted for productId={} newStock={}", product.getId(), newStock);

        InventoryTransaction txn = InventoryTransaction.builder()
                .productId(product.getId())
                .changeAmount(request.getQuantity())
                .stockAfter(newStock)
                .type(request.getQuantity() >= 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT")
                .reason(request.getReason())
                .performedBy(request.getPerformedBy())
                .timestamp(LocalDateTime.now())
                .build();
        transactionRepository.save(txn);
        log.debug("Inventory transaction saved for productId={} stockAfter={}", product.getId(), newStock);
        publishAudit("INVENTORY_ADJUSTMENT",
                "{\"productId\":\"" + product.getId() + "\",\"stock\":" + (newStock - request.getQuantity()) + "}",
                "{\"productId\":\"" + product.getId() + "\",\"stock\":" + newStock + "}",
                request.getPerformedBy());

        checkAndAlertLowStock(updated);
        return updated;
    }

    @org.springframework.transaction.annotation.Transactional
    public List<Product> bulkDeductStock(List<com.retailtouch.inventory.dto.StockDeductRequest> requests) {
        return requests.stream().map(req -> {
            StockAdjustmentRequest adj = new StockAdjustmentRequest();
            adj.setProductId(req.getProductId());
            adj.setQuantity(-req.getQuantity());
            adj.setReason("Sale deduction: " + req.getSaleId());
            return adjustStock(adj);
        }).toList();
    }

    @org.springframework.transaction.annotation.Transactional
    public List<Product> bulkAdjustStock(List<StockAdjustmentRequest> requests) {
        return requests.stream().map(this::adjustStock).toList();
    }

    public List<Product> getLowStockProducts() {
        return productRepository.findAll().stream()
                .filter(p -> p.getCurrentStock() <= p.getLowStockThreshold())
                .toList();
    }

    public List<Product> getByCategory(String categoryId) {
        return productRepository.findByCategoryId(categoryId);
    }

    private void checkAndAlertLowStock(Product product) {
        if (product.getCurrentStock() <= product.getLowStockThreshold()) {
            String alertMessage = String.format(
                    "{\"type\":\"LOW_STOCK\",\"productId\":\"%s\",\"productName\":\"%s\",\"sku\":\"%s\",\"currentStock\":%d,\"threshold\":%d}",
                    product.getId(), product.getName(), product.getSku(),
                    product.getCurrentStock(), product.getLowStockThreshold());
            try {
                rabbitTemplate.convertAndSend(
                        RabbitMQConfig.INVENTORY_EXCHANGE,
                        RabbitMQConfig.LOW_STOCK_ROUTING_KEY,
                        alertMessage);
                log.warn("Low stock alert sent for product: {} (stock: {})", product.getName(),
                        product.getCurrentStock());
            } catch (Exception ex) {
                log.error("Failed to publish LOW_STOCK alert for product {}: {}",
                        product.getId(), ex.getMessage());
            }
        }
    }

    private void publishAudit(String action, String oldValue, String newValue, String changedBy) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            String payload = String.format(
                    "{\"action\":\"%s\",\"module\":\"INVENTORY\",\"oldValue\":%s,\"newValue\":%s,\"changedBy\":\"%s\",\"role\":\"SYSTEM\"}",
                    action,
                    oldValue == null ? "null" : "\"" + oldValue.replace("\"", "\\\\\"") + "\"",
                    newValue == null ? "null" : "\"" + newValue.replace("\"", "\\\\\"") + "\"",
                    changedBy == null || changedBy.isBlank() ? "system" : changedBy);
            new RestTemplate().postForEntity(
                    authServiceUrl + "/auth/internal/audit",
                    new HttpEntity<>(payload, headers),
                    String.class);
        } catch (Exception ex) {
            log.warn("Failed to publish inventory audit event: {}", ex.getMessage());
        }
    }
}
