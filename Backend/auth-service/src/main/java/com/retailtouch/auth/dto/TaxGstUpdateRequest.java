package com.retailtouch.auth.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class TaxGstUpdateRequest {

    @NotNull
    @DecimalMin(value = "0.0", inclusive = true)
    private BigDecimal cgstPercent;

    @NotNull
    @DecimalMin(value = "0.0", inclusive = true)
    private BigDecimal sgstPercent;

    @NotNull
    @DecimalMin(value = "0.0", inclusive = true)
    private BigDecimal igstPercent;

    @NotNull
    private Boolean taxInclusive;

    @NotNull
    @DecimalMin(value = "0.0", inclusive = true)
    private BigDecimal defaultGstPercent;

    @NotNull
    private Boolean hsnCodeRequired;

    @NotBlank(message = "Password is required")
    private String password;
}