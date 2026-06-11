package com.retailtouch.auth.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.DecimalMin;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class SystemSettingsUpdateRequest {

    @NotNull
    private Boolean maintenanceMode;

    @NotNull
    @Min(value = 1, message = "Idle timeout must be at least 1 minute")
    private Integer idleTimeoutMinutes;

    @DecimalMin(value = "0.01", message = "Loyalty conversion rate must be greater than 0")
    private BigDecimal loyaltyConversionRate;
}
