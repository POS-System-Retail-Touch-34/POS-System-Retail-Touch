package com.retailtouch.sales.service;

import com.retailtouch.common.exception.InsufficientStockException;
import com.retailtouch.common.exception.ResourceNotFoundException;
import com.retailtouch.sales.client.CustomerClient;
import com.retailtouch.sales.client.InventoryClient;
import com.retailtouch.sales.config.RabbitMQConfig;
import com.retailtouch.sales.dto.RefundLineItem;
import com.retailtouch.sales.dto.RefundRequest;
import com.retailtouch.sales.dto.RefundRequestCreate;
import com.retailtouch.sales.dto.RazorpayOrderResponse;
import com.retailtouch.sales.dto.SaleRequest;
import com.retailtouch.sales.entity.Payment;
import com.retailtouch.sales.entity.RefundRequestRecord;
import com.retailtouch.sales.entity.SaleItem;
import com.retailtouch.sales.entity.Transaction;
import com.retailtouch.sales.repository.RefundRequestRepository;
import com.retailtouch.sales.repository.TransactionRepository;
import feign.FeignException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Base64;
import java.util.stream.Collectors;

@Service
public class SalesService {
        private static final Logger log = LoggerFactory.getLogger(SalesService.class);

        private final TransactionRepository transactionRepository;
        private final RefundRequestRepository refundRequestRepository;
        private final InventoryClient inventoryClient;
        private final CustomerClient customerClient;
        private final RabbitTemplate rabbitTemplate;

        public SalesService(TransactionRepository transactionRepository,
                        RefundRequestRepository refundRequestRepository,
                        InventoryClient inventoryClient,
                        CustomerClient customerClient,
                        RabbitTemplate rabbitTemplate) {
                this.transactionRepository = transactionRepository;
                this.refundRequestRepository = refundRequestRepository;
                this.inventoryClient = inventoryClient;
                this.customerClient = customerClient;
                this.rabbitTemplate = rabbitTemplate;
        }

        @Value("${sales.tax-rate:0.18}")
        private BigDecimal defaultTaxRate;

        @Value("${razorpay.key}")
        private String razorpayKey;

        @Value("${razorpay.secret}")
        private String razorpaySecret;

        @Value("${sales.invoice-prefix:INV}")
        private String invoicePrefix;

        @Value("${sales.loyalty-conversion-rate:1}")
        private BigDecimal loyaltyConversionRate;

        @Value("${auth-service.url}")
        private String authServiceUrl;

        @Value("${razorpay.orders-url}")
        private String razorpayOrdersUrl;

        /**
         * Full sale flow — wrapped in a single @Transactional to ensure atomicity:
         * 1. Validate inputs
         * 2. Pre-check stock availability (throws InsufficientStockException on
         * failure)
         * 3. Build and save the transaction
         * 4. Deduct stock via InventoryClient (Feign)
         * 5. Award loyalty points (auto, = total / 100, rounded down)
         * 6. Publish sale event to RabbitMQ
         */
        @Transactional
        public Transaction createSale(SaleRequest request) {
                validateSaleItems(request.getItems());
                validatePaymentSignatures(request.getPayments());

                // --- STEP 1: Pre-validate stock before touching DB ---
                validateStockAvailability(request.getItems());

                // --- STEP 2: Build sale items with tax calculation ---
                boolean interstate = Boolean.TRUE.equals(request.getInterstate());
                List<SaleItem> items = request.getItems().stream().map(itemReq -> {
                        String productId = itemReq.getProductId().trim();
                        BigDecimal taxRate = itemReq.getTaxRate() != null ? itemReq.getTaxRate() : defaultTaxRate;
                        BigDecimal unitPrice = itemReq.getUnitPrice();
                        BigDecimal subTotal = unitPrice.multiply(BigDecimal.valueOf(itemReq.getQuantity()));
                        BigDecimal taxAmount = subTotal.multiply(taxRate).setScale(2, RoundingMode.HALF_UP);
                        BigDecimal igstAmount = interstate ? taxAmount : BigDecimal.ZERO;
                        BigDecimal cgstAmount = interstate ? BigDecimal.ZERO
                                        : taxAmount.divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
                        BigDecimal sgstAmount = interstate ? BigDecimal.ZERO
                                        : taxAmount.subtract(cgstAmount);

                        return SaleItem.builder()
                                        .productId(productId)
                                        .productName(itemReq.getProductName())
                                        .sku(itemReq.getSku())
                                        .categoryName(itemReq.getCategoryName())
                                        .quantity(itemReq.getQuantity())
                                        .unitPrice(unitPrice)
                                        .taxRate(taxRate)
                                        .taxAmount(taxAmount)
                                        .cgstAmount(cgstAmount)
                                        .sgstAmount(sgstAmount)
                                        .igstAmount(igstAmount)
                                        .subTotal(subTotal)
                                        .manualItem(Boolean.TRUE.equals(itemReq.getManualItem()))
                                        .build();
                }).collect(Collectors.toList());

                // --- STEP 3: Calculate totals ---
                BigDecimal subtotal = items.stream()
                                .map(SaleItem::getSubTotal)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                BigDecimal totalTax = items.stream()
                                .map(SaleItem::getTaxAmount)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                BigDecimal cgstTotal = items.stream()
                                .map(item -> item.getCgstAmount() != null ? item.getCgstAmount() : BigDecimal.ZERO)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal sgstTotal = items.stream()
                                .map(item -> item.getSgstAmount() != null ? item.getSgstAmount() : BigDecimal.ZERO)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal igstTotal = items.stream()
                                .map(item -> item.getIgstAmount() != null ? item.getIgstAmount() : BigDecimal.ZERO)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);

                BigDecimal discount = request.getDiscount() != null ? request.getDiscount() : BigDecimal.ZERO;
                BigDecimal redeemPoints = BigDecimal.valueOf(request.getRedeemPoints() != null ? request.getRedeemPoints() : 0);
                BigDecimal effectiveLoyaltyConversionRate = request.getLoyaltyConversionRate() != null
                                && request.getLoyaltyConversionRate().compareTo(BigDecimal.ZERO) > 0
                                                ? request.getLoyaltyConversionRate()
                                                : loyaltyConversionRate;
                BigDecimal loyaltyDiscount = redeemPoints.multiply(effectiveLoyaltyConversionRate);
                BigDecimal grossTotal = subtotal.add(totalTax).subtract(discount);
                if (loyaltyDiscount.compareTo(grossTotal) > 0) {
                        throw new IllegalArgumentException("Redeem points exceed payable bill amount");
                }
                if (request.getCustomerId() == null || request.getCustomerId().isBlank()) {
                        if (redeemPoints.compareTo(BigDecimal.ZERO) > 0) {
                                throw new IllegalArgumentException("Customer is required to redeem loyalty points");
                        }
                } else if (redeemPoints.compareTo(BigDecimal.ZERO) > 0) {
                        customerClient.redeemPoints(request.getCustomerId(), redeemPoints.intValue());
                }

                BigDecimal total = grossTotal.subtract(loyaltyDiscount)
                                .max(BigDecimal.ZERO)
                                .setScale(2, RoundingMode.HALF_UP);

                List<Payment> payments = request.getPayments().stream().map(p -> Payment.builder()
                                .method(p.getMethod())
                                .amount(p.getAmount())
                                .referenceNumber(
                                                p.getReferenceNumber() != null ? p.getReferenceNumber()
                                                                : p.getPaymentId())
                                .gateway(p.getGateway() != null ? p.getGateway()
                                                : (isCashMethod(p.getMethod()) ? "OFFLINE" : "RAZORPAY"))
                                .orderId(p.getOrderId())
                                .paymentId(p.getPaymentId())
                                .signatureVerified(isCashMethod(p.getMethod()) ||
                                                verifyRazorpaySignature(p.getOrderId(), p.getPaymentId(),
                                                                p.getSignature()))
                                .build()).collect(Collectors.toList());

                // --- STEP 4: Create and save invoice ---
                Transaction transaction = Transaction.builder()
                                .customerId(request.getCustomerId())
                                .cashierId(request.getCashierId())
                                .items(items)
                                .payments(payments)
                                .subtotal(subtotal)
                                .tax(totalTax)
                                .cgstAmount(cgstTotal)
                                .sgstAmount(sgstTotal)
                                .igstAmount(igstTotal)
                                .totalTax(totalTax)
                                .discount(discount)
                                .total(total)
                                .status("COMPLETED")
                                .timestamp(LocalDateTime.now(ZoneId.of("Asia/Kolkata")))
                                .build();

                Transaction saved = saveWithUniqueInvoice(transaction);
                log.info("Sale created: {} for total: {}", saved.getInvoiceNumber(), saved.getTotal());

                // --- STEP 5: Deduct stock (after save, within same transaction) ---
                List<com.retailtouch.sales.dto.StockDeductRequest> deductRequests = items.stream()
                                .filter(item -> !item.isManualItem())
                                .map(item -> com.retailtouch.sales.dto.StockDeductRequest.builder()
                                                .productId(item.getProductId())
                                                .quantity(item.getQuantity())
                                                .saleId(saved.getId())
                                                .build())
                                .collect(Collectors.toList());
                inventoryClient.deductStockBulk(deductRequests);

                // --- STEP 6: Award loyalty points automatically (total / 100, round down) ---
                if (request.getCustomerId() != null && !request.getCustomerId().isBlank()) {
                        int pointsToAdd = total.divide(BigDecimal.valueOf(100), 0, RoundingMode.DOWN).intValue();
                        if (pointsToAdd > 0) {
                                customerClient.addPoints(request.getCustomerId(), pointsToAdd);
                                log.info("Awarded {} loyalty points to customer {}", pointsToAdd,
                                                request.getCustomerId());
                        }
                }

                // --- STEP 7: Publish sale completed event ---
                publishSaleCompletedEvent(saved);

                return saved;
        }

        public Transaction getTransactionById(String id) {
                return transactionRepository.findById(id)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Transaction not found with id: " + id));
        }

        public Transaction getTransactionByInvoiceNumber(String invoiceNumber) {
                return transactionRepository.findByInvoiceNumber(invoiceNumber)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Transaction not found with invoice number: " + invoiceNumber));
        }

        /**
         * Returns the 10 most recent COMPLETED transactions — used by the Refund
         * Dashboard.
         */
        public List<Transaction> getRecentCompletedTransactions() {
                return transactionRepository.findTop10ByStatusInOrderByTimestampDesc(
                                List.of("COMPLETED", "PARTIALLY_REFUNDED"));
        }

        /**
         * Returns all COMPLETED transactions for a customer ordered by timestamp DESC
         * — used by the Customer purchase history modal.
         */
        public List<Transaction> getTransactionsByCustomer(String customerId) {
                return transactionRepository.findByCustomerIdAndStatusInOrderByTimestampDesc(
                                customerId,
                                List.of("COMPLETED", "PARTIALLY_REFUNDED", "REFUNDED"));
        }

        @Transactional
        public RefundRequestRecord createRefundRequest(RefundRequestCreate request, String requestedBy) {
                Transaction transaction = getTransactionById(request.getTransactionId());
                Map<String, Integer> requestedQuantities = normalizeRequestedQuantities(request.getItems());

                if ("REFUNDED".equals(transaction.getStatus())) {
                        throw new IllegalStateException(
                                        "Transaction " + transaction.getInvoiceNumber() + " is already refunded");
                }
                if (!"COMPLETED".equals(transaction.getStatus()) && !"PARTIALLY_REFUNDED".equals(transaction.getStatus())) {
                        throw new IllegalStateException(
                                        "Refund can be requested only for COMPLETED or PARTIALLY_REFUNDED transactions");
                }
                if (refundRequestRepository.existsByTransactionIdAndStatus(request.getTransactionId(), "PENDING")) {
                        throw new IllegalStateException(
                                        "A pending refund request already exists for this transaction");
                }
                validateRefundItems(getTransactionItemsOrThrow(transaction), requestedQuantities);

                RefundRequestRecord record = RefundRequestRecord.builder()
                                .transactionId(request.getTransactionId())
                                .reason(request.getReason())
                                .items(toRefundLineItems(requestedQuantities))
                                .requestedBy(requestedBy)
                                .requestedAt(LocalDateTime.now())
                                .status("PENDING")
                                .build();
                return refundRequestRepository.save(record);
        }

        public List<RefundRequestRecord> getPendingRefundRequests() {
                return refundRequestRepository.findByStatusOrderByRequestedAtDesc("PENDING");
        }

        public RazorpayOrderResponse createRazorpayOrder(BigDecimal amount, String receipt) {
                return createRazorpayOrder(amount, receipt, null);
        }

        public RazorpayOrderResponse createRazorpayOrder(BigDecimal amount, String receipt, String method) {
                if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
                        throw new IllegalArgumentException("Amount must be greater than zero");
                }
                ensureRazorpaySecretsConfigured();

                String auth = Base64.getEncoder()
                                .encodeToString((razorpayKey + ":" + razorpaySecret).getBytes(StandardCharsets.UTF_8));

                HttpHeaders headers = new HttpHeaders();
                headers.set(HttpHeaders.AUTHORIZATION, "Basic " + auth);
                headers.setContentType(MediaType.APPLICATION_JSON);

                Map<String, Object> requestBody = new HashMap<>();
                long amountInPaise = amount.multiply(BigDecimal.valueOf(100))
                                .setScale(0, RoundingMode.HALF_UP)
                                .longValue();
                requestBody.put("amount", amountInPaise);
                requestBody.put("currency", "INR");
                requestBody.put("receipt", receipt == null || receipt.isBlank()
                                ? "rcpt_" + System.currentTimeMillis()
                                : receipt);
                requestBody.put("payment_capture", 1);
                if (method != null && !method.isBlank()) {
                        requestBody.put("notes", Map.of("preferred_method", method.toUpperCase()));
                }

                log.info("Creating Razorpay order for amountInPaise={} currency=INR methodHint={}",
                                amountInPaise, method);

                ResponseEntity<Map> response = new RestTemplate().postForEntity(
                                razorpayOrdersUrl,
                                new HttpEntity<>(requestBody, headers),
                                Map.class);

                Map body = response.getBody();
                if (body == null || body.get("id") == null) {
                        throw new IllegalStateException("Failed to create Razorpay order");
                }

                return RazorpayOrderResponse.builder()
                                .key(razorpayKey)
                                .orderId(String.valueOf(body.get("id")))
                                .amount(((Number) body.getOrDefault("amount", amountInPaise)).longValue())
                                .currency(String.valueOf(body.getOrDefault("currency", "INR")))
                                .build();
        }

        public boolean verifyRazorpaySignature(String orderId, String paymentId, String signature) {
                if (orderId == null || paymentId == null || signature == null
                                || orderId.isBlank() || paymentId.isBlank() || signature.isBlank()) {
                        return false;
                }
                ensureRazorpaySecretsConfigured();

                String payload = orderId + "|" + paymentId;
                String expected = hmacSha256Hex(payload, razorpaySecret);
                return MessageDigest.isEqual(
                                expected.getBytes(StandardCharsets.UTF_8),
                                signature.getBytes(StandardCharsets.UTF_8));
        }

        @Transactional
        public RefundRequestRecord approveRefundRequest(String requestId, String reviewedBy, String reviewNote) {
                RefundRequestRecord record = refundRequestRepository.findById(requestId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Refund request not found with id: " + requestId));
                if (!"PENDING".equals(record.getStatus())) {
                        throw new IllegalStateException("Refund request is already " + record.getStatus());
                }

                RefundRequest refundRequest = new RefundRequest();
                refundRequest.setTransactionId(record.getTransactionId());
                refundRequest.setReason(record.getReason());
                if (record.getItems() == null || record.getItems().isEmpty()) {
                        Transaction transaction = getTransactionById(record.getTransactionId());
                        List<SaleItem> transactionItems = getTransactionItemsOrThrow(transaction);
                        Map<String, Integer> remainingByProduct = new LinkedHashMap<>();
                        transactionItems.forEach(item -> {
                                int remaining = item.getQuantity() - Math.max(0, item.getRefundedQuantity());
                                if (remaining > 0) {
                                        remainingByProduct.put(
                                                        item.getProductId(),
                                                        remainingByProduct.getOrDefault(item.getProductId(), 0) + remaining);
                                }
                        });
                        if (remainingByProduct.isEmpty()) {
                                throw new IllegalStateException("No refundable quantity remaining for this transaction");
                        }
                        refundRequest.setItems(toRefundLineItems(remainingByProduct));
                } else {
                        refundRequest.setItems(record.getItems());
                }
                refundRequest.setRefundedBy(reviewedBy);
                refund(refundRequest);

                record.setStatus("APPROVED");
                record.setReviewedBy(reviewedBy);
                record.setReviewNote(reviewNote);
                record.setReviewedAt(LocalDateTime.now());
                RefundRequestRecord saved = refundRequestRepository.save(record);
                publishAudit("REFUND_APPROVAL", "SALES", null, saved.toString(), reviewedBy, "STORE_MANAGER_OR_ADMIN");
                return saved;
        }

        @Transactional
        public RefundRequestRecord rejectRefundRequest(String requestId, String reviewedBy, String reviewNote) {
                RefundRequestRecord record = refundRequestRepository.findById(requestId)
                                .orElseThrow(() -> new ResourceNotFoundException(
                                                "Refund request not found with id: " + requestId));
                if (!"PENDING".equals(record.getStatus())) {
                        throw new IllegalStateException("Refund request is already " + record.getStatus());
                }

                record.setStatus("REJECTED");
                record.setReviewedBy(reviewedBy);
                record.setReviewNote(reviewNote);
                record.setReviewedAt(LocalDateTime.now());
                return refundRequestRepository.save(record);
        }

        /**
         * Refund flow:
         * 1. Mark invoice as REFUNDED
         * 2. Restore stock via InventoryClient
         * 3. Deduct loyalty points
         */
        @Transactional
        public Transaction refund(RefundRequest request) {
                Transaction transaction = getTransactionById(request.getTransactionId());
                Map<String, Integer> requestedQuantities = normalizeRequestedQuantities(request.getItems());
                List<SaleItem> transactionItems = getTransactionItemsOrThrow(transaction);

                if ("REFUNDED".equals(transaction.getStatus())) {
                        throw new IllegalStateException(
                                        "Transaction " + transaction.getInvoiceNumber() + " is already refunded");
                }
                if ("CANCELLED".equals(transaction.getStatus())) {
                        throw new IllegalStateException(
                                        "Cannot refund a CANCELLED transaction: " + transaction.getInvoiceNumber());
                }
                validateRefundItems(transactionItems, requestedQuantities);

                // Restore stock
                List<com.retailtouch.sales.dto.StockAdjustmentRequest> adjustRequests = transactionItems.stream()
                                .filter(item -> !item.isManualItem())
                                .filter(item -> requestedQuantities.containsKey(item.getProductId()))
                                .map(item -> com.retailtouch.sales.dto.StockAdjustmentRequest.builder()
                                                .productId(item.getProductId())
                                                .quantity(requestedQuantities.get(item.getProductId()))
                                                .reason("Refund for invoice: " + transaction.getInvoiceNumber())
                                                .performedBy(request.getRefundedBy())
                                                .build())
                                .collect(Collectors.toList());
                restoreStockForRefund(adjustRequests, transaction.getInvoiceNumber());

                // Deduct loyalty points
                if (transaction.getCustomerId() != null && !transaction.getCustomerId().isBlank()) {
                        BigDecimal refundAmount = calculateRefundAmount(transactionItems, requestedQuantities);
                        int pointsToDeduct = refundAmount
                                        .divide(BigDecimal.valueOf(100), 0, RoundingMode.DOWN)
                                        .intValue();
                        if (pointsToDeduct > 0) {
                                customerClient.addPoints(transaction.getCustomerId(), -pointsToDeduct);
                        }
                }

                // Mark item-level refunded quantities and resolve invoice status.
                transactionItems.forEach(item -> {
                        Integer requestedQty = requestedQuantities.get(item.getProductId());
                        if (requestedQty != null && requestedQty > 0) {
                                int alreadyRefunded = Math.max(0, item.getRefundedQuantity());
                                item.setRefundedQuantity(alreadyRefunded + requestedQty);
                        }
                });

                transaction.setStatus(isFullyRefunded(transactionItems) ? "REFUNDED" : "PARTIALLY_REFUNDED");
                transaction.setRefundReason(request.getReason());
                transaction.setRefundedBy(request.getRefundedBy());
                transaction.setRefundedAt(LocalDateTime.now());

                Transaction refunded = transactionRepository.save(transaction);
                log.info("Transaction refunded: {} by {}", transaction.getInvoiceNumber(), request.getRefundedBy());
                return refunded;
        }

        public Map<String, Object> getDailySummary(LocalDate date) {
                LocalDateTime start = date.atStartOfDay();
                LocalDateTime end = date.plusDays(1).atStartOfDay();
                List<Transaction> transactions = transactionRepository.findByTimestampBetween(start, end);

                List<Transaction> completed = transactions.stream()
                                .filter(t -> "COMPLETED".equals(t.getStatus())).toList();

                BigDecimal totalSales = completed.stream()
                                .map(Transaction::getTotal).reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal totalTax = completed.stream()
                                .map(Transaction::getTax).reduce(BigDecimal.ZERO, BigDecimal::add);
                long refundCount = transactions.stream().filter(t -> "REFUNDED".equals(t.getStatus())).count();
                BigDecimal totalRefunds = transactions.stream()
                                .filter(t -> "REFUNDED".equals(t.getStatus()))
                                .map(Transaction::getTotal)
                                .reduce(BigDecimal.ZERO, BigDecimal::add);
                BigDecimal netSales = totalSales.subtract(totalRefunds);

                return Map.of(
                                "date", date.toString(),
                                "transactionCount", completed.size(),
                                "totalSales", totalSales,
                                "totalTax", totalTax,
                                "refundCount", refundCount,
                                "totalRefunds", totalRefunds,
                                "netSales", netSales);
        }

        public Map<String, Object> getZReport(LocalDate date) {
                Map<String, Object> summary = getDailySummary(date);

                LocalDateTime start = date.atStartOfDay();
                LocalDateTime end = date.plusDays(1).atStartOfDay();
                List<Transaction> transactions = transactionRepository.findByTimestampBetween(start, end);

                Map<String, Long> paymentMethodBreakdown = transactions.stream()
                                .filter(t -> "COMPLETED".equals(t.getStatus()))
                                .flatMap(t -> t.getPayments().stream())
                                .collect(Collectors.groupingBy(Payment::getMethod, Collectors.counting()));

                Map<String, Object> zReport = new java.util.HashMap<>(summary);
                zReport.put("paymentBreakdown", paymentMethodBreakdown);
                zReport.put("reportType", "Z-READ");
                zReport.put("generatedAt", LocalDateTime.now().toString());
                zReport.put("status", "CLOSED");

                return zReport;
        }

        private Map<String, Integer> normalizeRequestedQuantities(List<RefundLineItem> items) {
                Map<String, Integer> quantities = new LinkedHashMap<>();
                if (items == null || items.isEmpty()) {
                        throw new IllegalArgumentException("At least one item must be selected for refund");
                }

                for (RefundLineItem item : items) {
                        if (item == null || item.getProductId() == null || item.getProductId().isBlank()) {
                                throw new IllegalArgumentException("Refund item productId is required");
                        }
                        if (item.getQuantity() <= 0) {
                                throw new IllegalArgumentException("Refund quantity must be greater than zero");
                        }
                        String productId = item.getProductId().trim();
                        quantities.put(productId, quantities.getOrDefault(productId, 0) + item.getQuantity());
                }
                return quantities;
        }

        private List<RefundLineItem> toRefundLineItems(Map<String, Integer> quantities) {
                return quantities.entrySet().stream().map(entry -> {
                        RefundLineItem item = new RefundLineItem();
                        item.setProductId(entry.getKey());
                        item.setQuantity(entry.getValue());
                        return item;
                }).collect(Collectors.toList());
        }

        private List<SaleItem> getTransactionItemsOrThrow(Transaction transaction) {
                if (transaction.getItems() == null || transaction.getItems().isEmpty()) {
                        throw new IllegalStateException("Transaction has no refundable items");
                }
                List<SaleItem> items = transaction.getItems().stream()
                                .filter(item -> item != null && item.getProductId() != null && !item.getProductId().isBlank())
                                .collect(Collectors.toList());
                if (items.isEmpty()) {
                        throw new IllegalStateException("Transaction has no valid refundable products");
                }
                return items;
        }

        private void restoreStockForRefund(List<com.retailtouch.sales.dto.StockAdjustmentRequest> adjustRequests, String invoiceNumber) {
                if (adjustRequests == null || adjustRequests.isEmpty()) {
                        return;
                }

                List<String> skippedProducts = new ArrayList<>();
                for (com.retailtouch.sales.dto.StockAdjustmentRequest request : adjustRequests) {
                        try {
                                inventoryClient.adjustStockBulk(List.of(request));
                        } catch (Exception ex) {
                                if (isNotFoundFromInventory(ex)) {
                                        skippedProducts.add(request.getProductId());
                                        log.warn("Skipping stock restore for missing product {} during refund {}", request.getProductId(), invoiceNumber);
                                        continue;
                                }
                                throw new IllegalStateException("Failed to restore stock during refund processing", ex);
                        }
                }

                if (!skippedProducts.isEmpty()) {
                        log.warn("Refund {} completed with skipped stock restoration for products: {}", invoiceNumber, skippedProducts);
                }
        }

        private boolean isNotFoundFromInventory(Exception ex) {
                return ex instanceof FeignException feignException && feignException.status() == 404;
        }

        private void validateRefundItems(List<SaleItem> transactionItems, Map<String, Integer> requestedQuantities) {
                for (Map.Entry<String, Integer> entry : requestedQuantities.entrySet()) {
                        String productId = entry.getKey();
                        int requestedQty = entry.getValue();

                        SaleItem saleItem = transactionItems.stream()
                                        .filter(item -> productId.equals(item.getProductId()))
                                        .findFirst()
                                        .orElseThrow(() -> new IllegalArgumentException(
                                                        "Product " + productId + " does not exist in transaction"));

                        int alreadyRefunded = Math.max(0, saleItem.getRefundedQuantity());
                        int availableToRefund = saleItem.getQuantity() - alreadyRefunded;
                        if (availableToRefund <= 0) {
                                throw new IllegalStateException("Product " + saleItem.getProductName() + " is already fully refunded");
                        }
                        if (requestedQty > availableToRefund) {
                                throw new IllegalArgumentException("Requested quantity for " + saleItem.getProductName()
                                                + " exceeds remaining refundable quantity (" + availableToRefund + ")");
                        }
                }
        }

        private BigDecimal calculateRefundAmount(List<SaleItem> transactionItems, Map<String, Integer> requestedQuantities) {
                BigDecimal total = BigDecimal.ZERO;
                for (SaleItem item : transactionItems) {
                        Integer refundQty = requestedQuantities.get(item.getProductId());
                        if (refundQty == null || refundQty <= 0) {
                                continue;
                        }
                        BigDecimal baseAmount = item.getUnitPrice().multiply(BigDecimal.valueOf(refundQty));
                        BigDecimal taxAmount = BigDecimal.ZERO;
                        if (item.getTaxAmount() != null && item.getQuantity() > 0) {
                                BigDecimal perUnitTax = item.getTaxAmount()
                                                .divide(BigDecimal.valueOf(item.getQuantity()), 4, RoundingMode.HALF_UP);
                                taxAmount = perUnitTax.multiply(BigDecimal.valueOf(refundQty))
                                                .setScale(2, RoundingMode.HALF_UP);
                        }
                        total = total.add(baseAmount).add(taxAmount);
                }
                return total.setScale(2, RoundingMode.HALF_UP);
        }

        private boolean isFullyRefunded(List<SaleItem> transactionItems) {
                return transactionItems.stream().allMatch(item -> {
                        int refundedQty = Math.max(0, item.getRefundedQuantity());
                        return refundedQty >= item.getQuantity();
                });
        }

        // -----------------------------------------------------------------------
        // Private helpers
        // -----------------------------------------------------------------------

        /**
         * Pre-validate that every requested product has enough stock.
         * Throws InsufficientStockException on first failure.
         * Uses the InventoryClient to fetch the current product and check.
         */
        private void validateStockAvailability(List<SaleRequest.SaleItemRequest> items) {
                for (SaleRequest.SaleItemRequest itemReq : items) {
                        if (Boolean.TRUE.equals(itemReq.getManualItem())) {
                                continue;
                        }
                        try {
                                com.retailtouch.sales.dto.StockCheckResult stockInfo = inventoryClient
                                                .getStockInfo(itemReq.getProductId().trim());
                                if (stockInfo != null && stockInfo.getCurrentStock() < itemReq.getQuantity()) {
                                        throw new InsufficientStockException(
                                                        itemReq.getProductId(),
                                                        stockInfo.getCurrentStock(),
                                                        itemReq.getQuantity());
                                }
                        } catch (InsufficientStockException ex) {
                                throw ex; // re-throw stock errors
                        } catch (Exception ex) {
                                // If the inventory service call fails (feign error), log and let the
                                // deduction step surface the real error to avoid blocking the entire sale
                                // on a transient network issue.
                                log.warn("Could not pre-validate stock for product {}: {}", itemReq.getProductId(),
                                                ex.getMessage());
                        }
                }
        }

        private void validateSaleItems(List<SaleRequest.SaleItemRequest> items) {
                for (int i = 0; i < items.size(); i++) {
                        SaleRequest.SaleItemRequest item = items.get(i);
                        String productId = item.getProductId();

                        if (productId == null
                                        || productId.isBlank()
                                        || "undefined".equalsIgnoreCase(productId.trim())
                                        || "null".equalsIgnoreCase(productId.trim())) {
                                throw new IllegalArgumentException("Invalid product ID at items[" + i + "]");
                        }

                        if (item.getQuantity() <= 0) {
                                throw new IllegalArgumentException("Invalid quantity at items[" + i + "]");
                        }
                }
        }

        private void validatePaymentSignatures(List<SaleRequest.PaymentRequest> payments) {
                for (SaleRequest.PaymentRequest payment : payments) {
                        if (isCashMethod(payment.getMethod())) {
                                continue;
                        }

                        if (!verifyRazorpaySignature(payment.getOrderId(), payment.getPaymentId(),
                                        payment.getSignature())) {
                                throw new IllegalArgumentException("Invalid Razorpay signature for payment");
                        }
                }
        }

        private boolean isCashMethod(String method) {
                return method != null && "CASH".equalsIgnoreCase(method.trim());
        }

        private void ensureRazorpaySecretsConfigured() {
                if (razorpayKey == null || razorpayKey.isBlank() || razorpaySecret == null || razorpaySecret.isBlank()) {
                        throw new IllegalStateException("Razorpay credentials are not configured");
                }
        }

        private String hmacSha256Hex(String data, String secret) {
                try {
                        Mac mac = Mac.getInstance("HmacSHA256");
                        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
                        byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
                        StringBuilder sb = new StringBuilder();
                        for (byte b : hash) {
                                sb.append(String.format("%02x", b));
                        }
                        return sb.toString();
                } catch (Exception ex) {
                        throw new IllegalStateException("Failed to verify Razorpay signature", ex);
                }
        }

        private Transaction saveWithUniqueInvoice(Transaction transaction) {
                for (int attempt = 1; attempt <= 5; attempt++) {
                        try {
                                transaction.setInvoiceNumber(generateInvoiceNumber());
                                return transactionRepository.save(transaction);
                        } catch (DuplicateKeyException ex) {
                                log.warn("Duplicate invoice generated on attempt {}. Retrying...", attempt);
                        }
                }
                throw new IllegalStateException("Failed to generate a unique invoice number");
        }

        private String generateInvoiceNumber() {
                String date = LocalDate.now(ZoneId.of("Asia/Kolkata")).format(DateTimeFormatter.ofPattern("yyyyMMdd"));
                String normalizedPrefix = (invoicePrefix == null || invoicePrefix.isBlank())
                                ? "INV"
                                : invoicePrefix.replaceAll("[^A-Za-z0-9-]", "").toUpperCase();
                String prefixWithDate = normalizedPrefix + "-" + date + "-";
                long nextSerial = transactionRepository.countByInvoiceNumberStartingWith(prefixWithDate) + 1;
                return prefixWithDate + String.format("%04d", nextSerial);
        }

        private void publishSaleCompletedEvent(Transaction transaction) {
                String saleEvent = String.format(
                                "{\"type\":\"SALE_COMPLETED\",\"invoiceNumber\":\"%s\",\"cashierId\":\"%s\",\"total\":%s,\"timestamp\":\"%s\"}",
                                transaction.getInvoiceNumber(), transaction.getCashierId(), transaction.getTotal(),
                                transaction.getTimestamp());
                try {
                        rabbitTemplate.convertAndSend(
                                        RabbitMQConfig.SALES_EXCHANGE,
                                        RabbitMQConfig.SALE_COMPLETED_KEY,
                                        saleEvent);
                } catch (Exception ex) {
                        log.error("Failed to publish SALE_COMPLETED event for invoice {}: {}",
                                        transaction.getInvoiceNumber(), ex.getMessage());
                }
        }

        private void publishAudit(String action, String module, String oldValue, String newValue, String changedBy,
                        String role) {
                try {
                        HttpHeaders headers = new HttpHeaders();
                        headers.setContentType(MediaType.APPLICATION_JSON);
                        String payload = String.format(
                                        "{\"action\":\"%s\",\"module\":\"%s\",\"oldValue\":%s,\"newValue\":%s,\"changedBy\":\"%s\",\"role\":\"%s\"}",
                                        action,
                                        module,
                                        oldValue == null ? "null" : "\"" + oldValue.replace("\"", "\\\\\"") + "\"",
                                        newValue == null ? "null" : "\"" + newValue.replace("\"", "\\\\\"") + "\"",
                                        changedBy == null ? "system" : changedBy,
                                        role == null ? "SYSTEM" : role);
                        new RestTemplate().postForEntity(authServiceUrl + "/auth/internal/audit",
                                        new HttpEntity<>(payload, headers), String.class);
                } catch (Exception ex) {
                        log.warn("Failed to publish audit event '{}': {}", action, ex.getMessage());
                }
        }
}
