package com.retailtouch.auth.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "admin_settings")
public class AdminSettings {

    @Id
    private Long id;

    @Builder.Default
    @Column(nullable = false, precision = 6, scale = 2)
    private BigDecimal cgstPercent = BigDecimal.valueOf(9);

    @Builder.Default
    @Column(nullable = false, precision = 6, scale = 2)
    private BigDecimal sgstPercent = BigDecimal.valueOf(9);

    @Builder.Default
    @Column(nullable = false, precision = 6, scale = 2)
    private BigDecimal igstPercent = BigDecimal.valueOf(18);

    @Builder.Default
    @Column(nullable = false)
    private boolean taxInclusive = false;

    @Builder.Default
    @Column(nullable = false, precision = 6, scale = 2)
    private BigDecimal defaultGstPercent = BigDecimal.valueOf(18);

    @Builder.Default
    @Column(nullable = false)
    private boolean hsnCodeRequired = false;

    @Builder.Default
    @Column(nullable = false)
    private int idleTimeoutMinutes = 15;

    @Builder.Default
    @Column(precision = 10, scale = 2)
    private BigDecimal loyaltyConversionRate = BigDecimal.ONE;

    @Builder.Default
    @Column(nullable = false)
    private int failedLoginThreshold = 5;

    @Builder.Default
    @Column(nullable = false)
    private int passwordMinLength = 8;

    @Builder.Default
    @Column(nullable = false)
    private boolean passwordRequireUppercase = true;

    @Builder.Default
    @Column(nullable = false)
    private boolean passwordRequireNumber = true;

    @Builder.Default
    @Column(nullable = false)
    private boolean passwordRequireSpecial = true;

    private String razorpayKeyId;

    @Column(length = 2048)
    private String razorpaySecretEncrypted;

    @Builder.Default
    @Column(nullable = false)
    private boolean razorpayEnabled = true;

    @Builder.Default
    @Column(nullable = false)
    private boolean cashEnabled = true;

    @Builder.Default
    @Column(nullable = false)
    private boolean upiEnabled = true;

    @Builder.Default
    @Column(nullable = false)
    private boolean cardEnabled = true;

    @Builder.Default
    @Column(nullable = false)
    private boolean walletEnabled = false;

    @Builder.Default
    @Column(nullable = false)
    private boolean maintenanceMode = false;

    @Builder.Default
    @Column(nullable = false)
    private String systemVersion = "1.0.0";
}
