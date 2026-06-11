package com.retailtouch.sales.client;

import com.retailtouch.common.dto.ApiResponse;
import com.retailtouch.sales.dto.StockCheckResult;
import com.retailtouch.sales.dto.StockDeductRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "inventory-service", url = "${inventory-service.url}")
public interface InventoryClient {

    /** Fetch product info (currentStock) for pre-sale validation. */
    @GetMapping("/api/products/{productId}")
    ApiResponse<StockCheckResult> getProductById(@PathVariable("productId") String productId);

    default StockCheckResult getStockInfo(String productId) {
        ApiResponse<StockCheckResult> response = getProductById(productId);
        return response != null ? response.getData() : null;
    }

    @PostMapping("/api/products/stock/deduct")
    void deductStock(@RequestBody StockDeductRequest request);

    @PostMapping("/api/products/stock/deduct-bulk")
    void deductStockBulk(@RequestBody java.util.List<StockDeductRequest> requests);

    @PostMapping("/api/products/stock/adjust-bulk")
    void adjustStockBulk(@RequestBody java.util.List<com.retailtouch.sales.dto.StockAdjustmentRequest> requests);
}
