package com.posretailtouch.inventory.dto.response;

import com.posretailtouch.inventory.model.StockStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor

public class InventoryResponse {

    private String productId;
    private String sku;
    private String name;
    private int quantity;
    private int reserved;
    private int available;
    private StockStatus status;

}
