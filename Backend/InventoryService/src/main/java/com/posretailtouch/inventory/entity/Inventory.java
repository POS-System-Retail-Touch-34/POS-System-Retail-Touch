package com.posretailtouch.inventory.entity;

import lombok.Getter;
import lombok.Setter;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Setter
@Getter
@Document(collection = "inventories")
public class Inventory {

    @Id
    private String id;

    @Indexed(unique = true)
    private String productId;

    private int quantity;
    private int reserved;

    public Inventory() {
    }

    public Inventory(String productId, int quantity) {
        this.productId = productId;
        this.quantity = quantity;
        this.reserved = 0;
    }

    public int getAvailable() {
        return quantity - reserved;
    }
}
