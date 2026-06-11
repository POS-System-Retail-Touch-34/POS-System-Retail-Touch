package com.retailtouch.sales.controller;

import com.retailtouch.common.dto.ApiResponse;
import com.retailtouch.sales.dto.RefundRequest;
import com.retailtouch.sales.dto.RefundRequestCreate;
import com.retailtouch.sales.dto.RefundReviewRequest;
import com.retailtouch.sales.dto.RazorpayOrderRequest;
import com.retailtouch.sales.dto.RazorpayOrderResponse;
import com.retailtouch.sales.dto.RazorpayVerifyRequest;
import com.retailtouch.sales.entity.RefundRequestRecord;
import com.retailtouch.sales.dto.SaleRequest;
import com.retailtouch.sales.entity.Transaction;
import com.retailtouch.sales.service.SalesService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sales")
@Tag(name = "Sales", description = "POS Sales transaction APIs")
public class SalesController {

    private final SalesService salesService;

    public SalesController(SalesService salesService) {
        this.salesService = salesService;
    }

    @Operation(summary = "Create a new sale transaction")
    @PostMapping
    @PreAuthorize("hasAnyRole('CASHIER','STORE_MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<Transaction>> createSale(@Valid @RequestBody SaleRequest request) {
        Transaction transaction = salesService.createSale(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(transaction, "Sale created successfully"));
    }

    @Operation(summary = "Get transaction by ID")
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('CASHIER','STORE_MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<Transaction>> getTransaction(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(salesService.getTransactionById(id), "Transaction retrieved"));
    }

    @Operation(summary = "Create Razorpay order for online payment")
    @PostMapping("/payments/razorpay/order")
    @PreAuthorize("hasAnyRole('CASHIER','STORE_MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<RazorpayOrderResponse>> createRazorpayOrder(
            @Valid @RequestBody RazorpayOrderRequest request) {
        return ResponseEntity.ok(ApiResponse.success(
                salesService.createRazorpayOrder(request.getAmount(), null, request.getMethod()),
                "Razorpay order created"));
    }

    @Operation(summary = "Verify Razorpay payment signature")
    @PostMapping("/payments/razorpay/verify")
    @PreAuthorize("hasAnyRole('CASHIER','STORE_MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> verifyRazorpaySignature(
            @Valid @RequestBody RazorpayVerifyRequest request) {
        boolean valid = salesService.verifyRazorpaySignature(
                request.getOrderId(),
                request.getPaymentId(),
                request.getSignature());
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("valid", valid),
                valid ? "Signature is valid" : "Signature verification failed"));
    }

    @Operation(summary = "Get transaction by invoice number")
    @GetMapping("/invoice/{invoiceNumber}")
    @PreAuthorize("hasAnyRole('CASHIER','STORE_MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<Transaction>> getByInvoiceNumber(@PathVariable String invoiceNumber) {
        return ResponseEntity.ok(ApiResponse.success(
                salesService.getTransactionByInvoiceNumber(invoiceNumber), "Transaction retrieved"));
    }

    @Operation(summary = "Get 10 most recent completed invoices (for Refund Dashboard)")
    @GetMapping("/recent")
    @PreAuthorize("hasAnyRole('CASHIER','STORE_MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<Transaction>>> getRecentTransactions() {
        return ResponseEntity.ok(ApiResponse.success(salesService.getRecentCompletedTransactions(),
                "Recent transactions retrieved"));
    }

    @Operation(summary = "Get all transactions for a specific customer")
    @GetMapping("/customer/{customerId}")
    @PreAuthorize("hasAnyRole('CASHIER','STORE_MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<Transaction>>> getByCustomerId(@PathVariable String customerId) {
        return ResponseEntity.ok(ApiResponse.success(salesService.getTransactionsByCustomer(customerId),
                "Customer transactions retrieved"));
    }

    @Operation(summary = "Refund a transaction (STORE_MANAGER/ADMIN only)")
    @PostMapping("/refund")
    @PreAuthorize("hasAnyRole('STORE_MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<Transaction>> refund(@Valid @RequestBody RefundRequest request) {
        return ResponseEntity.ok(ApiResponse.success(salesService.refund(request), "Refund processed successfully"));
    }

    @Operation(summary = "Create refund request (Cashier/Store Manager/Admin)")
    @PostMapping("/refund-requests")
    @PreAuthorize("hasAnyRole('CASHIER','STORE_MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<RefundRequestRecord>> createRefundRequest(
            @Valid @RequestBody RefundRequestCreate request,
            Authentication authentication) {
        String requestedBy = authentication != null ? authentication.getName() : "system";
        RefundRequestRecord record = salesService.createRefundRequest(request, requestedBy);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(record, "Refund request submitted successfully"));
    }

    @Operation(summary = "Get pending refund requests (Store Manager/Admin)")
    @GetMapping("/refund-requests/pending")
    @PreAuthorize("hasAnyRole('STORE_MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<List<RefundRequestRecord>>> getPendingRefundRequests() {
        return ResponseEntity.ok(ApiResponse.success(
                salesService.getPendingRefundRequests(),
                "Pending refund requests retrieved"));
    }

    @Operation(summary = "Approve a refund request (Store Manager/Admin)")
    @PostMapping("/refund-requests/{id}/approve")
    @PreAuthorize("hasAnyRole('STORE_MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<RefundRequestRecord>> approveRefundRequest(
            @PathVariable String id,
            @RequestBody(required = false) RefundReviewRequest request,
            Authentication authentication) {
        String reviewedBy = authentication != null ? authentication.getName() : "manager";
        String reviewNote = request != null ? request.getNote() : null;
        return ResponseEntity.ok(ApiResponse.success(
                salesService.approveRefundRequest(id, reviewedBy, reviewNote),
                "Refund request approved"));
    }

    @Operation(summary = "Reject a refund request (Store Manager/Admin)")
    @PostMapping("/refund-requests/{id}/reject")
    @PreAuthorize("hasAnyRole('STORE_MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<RefundRequestRecord>> rejectRefundRequest(
            @PathVariable String id,
            @RequestBody(required = false) RefundReviewRequest request,
            Authentication authentication) {
        String reviewedBy = authentication != null ? authentication.getName() : "manager";
        String reviewNote = request != null ? request.getNote() : null;
        return ResponseEntity.ok(ApiResponse.success(
                salesService.rejectRefundRequest(id, reviewedBy, reviewNote),
                "Refund request rejected"));
    }

    @Operation(summary = "Get daily sales summary (X-Read) — Store Manager/Admin only")
    @GetMapping("/daily-summary")
    @PreAuthorize("hasAnyRole('STORE_MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDailySummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (date == null)
            date = LocalDate.now();
        return ResponseEntity.ok(ApiResponse.success(salesService.getDailySummary(date), "Daily summary retrieved"));
    }

    @Operation(summary = "Get end-of-day Z-Report — Store Manager/Admin only")
    @GetMapping("/z-report")
    @PreAuthorize("hasAnyRole('STORE_MANAGER','ADMIN')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getZReport(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (date == null)
            date = LocalDate.now();
        return ResponseEntity.ok(ApiResponse.success(salesService.getZReport(date), "Z-Report generated"));
    }
}
