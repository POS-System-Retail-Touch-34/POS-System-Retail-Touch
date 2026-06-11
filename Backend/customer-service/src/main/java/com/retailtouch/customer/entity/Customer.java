package com.retailtouch.customer.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "customers")
public class Customer {

    @Id
    private String id;

    @NotBlank(message = "Name is required")
    private String name;

    @Indexed(unique = true, sparse = true)
    @NotBlank(message = "Phone is required")
    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Phone must be a valid 10-digit Indian number")
    private String phone;

    @Indexed(unique = true, sparse = true)
    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @Builder.Default
    private int loyaltyPoints = 0;

    @Builder.Default
    private List<String> purchaseHistory = new ArrayList<>();

    private String address;

    @Builder.Default
    private boolean active = true;

    private LocalDateTime lastPurchaseDate;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;

    public String getTier() {
        if (loyaltyPoints >= 5000)
            return "Platinum";
        if (loyaltyPoints >= 1500)
            return "Gold";
        if (loyaltyPoints >= 500)
            return "Silver";
        return "Bronze";
    }
}
