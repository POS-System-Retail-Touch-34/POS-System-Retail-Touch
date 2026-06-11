package com.retailtouch.common.exception;

public class InsufficientStockException extends RuntimeException {

    private final String productId;
    private final int available;
    private final int requested;

    public InsufficientStockException(String productId, int available, int requested) {
        super(String.format("Insufficient stock for product '%s'. Available: %d, Requested: %d",
                productId, available, requested));
        this.productId = productId;
        this.available = available;
        this.requested = requested;
    }

    public String getProductId() {
        return productId;
    }

    public int getAvailable() {
        return available;
    }

    public int getRequested() {
        return requested;
    }
}
