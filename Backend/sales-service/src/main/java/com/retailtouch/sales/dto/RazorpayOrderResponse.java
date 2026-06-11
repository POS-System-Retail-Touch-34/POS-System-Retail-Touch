package com.retailtouch.sales.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class RazorpayOrderResponse {
    private String key;
    private String orderId;
    private long amount;
    private String currency;
}
