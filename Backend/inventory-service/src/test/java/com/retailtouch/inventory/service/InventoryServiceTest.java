package com.retailtouch.inventory.service;

import com.retailtouch.inventory.entity.Product;
import com.retailtouch.inventory.repository.InventoryTransactionRepository;
import com.retailtouch.inventory.repository.ProductRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class InventoryServiceTest {

    @Mock
    private ProductRepository productRepository;
    @Mock
    private InventoryTransactionRepository transactionRepository;
    @Mock
    private RabbitTemplate rabbitTemplate;

    @InjectMocks
    private InventoryService inventoryService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testAdjustStock_Deduct_Success() {
        Product product = Product.builder()
                .id("1")
                .name("Product A")
                .currentStock(10)
                .lowStockThreshold(2)
                .build();

        when(productRepository.findById("1")).thenReturn(Optional.of(product));
        when(productRepository.save(any(Product.class))).thenReturn(product);

        com.retailtouch.inventory.dto.StockAdjustmentRequest request = new com.retailtouch.inventory.dto.StockAdjustmentRequest();
        request.setProductId("1");
        request.setQuantity(-5);
        request.setReason("sale-123");
        request.setPerformedBy("test-user");

        inventoryService.adjustStock(request);

        assertEquals(5, product.getCurrentStock());
        verify(productRepository, times(1)).save(product);
        verify(transactionRepository, times(1)).save(any());
    }

    @Test
    void testAdjustStock_Deduct_Insufficient() {
        Product product = Product.builder()
                .id("1")
                .currentStock(3)
                .build();

        when(productRepository.findById("1")).thenReturn(Optional.of(product));

        com.retailtouch.inventory.dto.StockAdjustmentRequest request = new com.retailtouch.inventory.dto.StockAdjustmentRequest();
        request.setProductId("1");
        request.setQuantity(-5);
        request.setReason("sale-123");
        request.setPerformedBy("test-user");

        assertThrows(IllegalStateException.class, () -> inventoryService.adjustStock(request));
    }
}
