package com.retailtouch.reporting.controller;

import com.retailtouch.common.dto.ApiResponse;
import com.retailtouch.reporting.service.ReportService;
import com.retailtouch.reporting.util.CsvExporter;
import com.retailtouch.reporting.util.PdfGenerator;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@Tag(name = "Reports", description = "Sales reporting and analytics APIs")
@PreAuthorize("hasAnyRole('STORE_MANAGER','ADMIN')")
public class ReportingController {

    private final ReportService reportService;
    private final PdfGenerator pdfGenerator;
    private final CsvExporter csvExporter;

    public ReportingController(ReportService reportService, PdfGenerator pdfGenerator, CsvExporter csvExporter) {
        this.reportService = reportService;
        this.pdfGenerator = pdfGenerator;
        this.csvExporter = csvExporter;
    }

    @Operation(summary = "X-Read: Daily sales summary")
    @GetMapping("/x-read")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getXRead(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (date == null)
            date = LocalDate.now();
        return ResponseEntity.ok(ApiResponse.success(reportService.getDailySummary(date), "X-Read report generated"));
    }

    @Operation(summary = "Z-Read: End of day report with full breakdown")
    @GetMapping("/z-read")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getZRead(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (date == null)
            date = LocalDate.now();
        return ResponseEntity.ok(ApiResponse.success(reportService.getZReport(date), "Z-Read report generated"));
    }

    @Operation(summary = "Sales breakdown by category")
    @GetMapping("/by-category")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSalesByCategory(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (date == null)
            date = LocalDate.now();
        return ResponseEntity
                .ok(ApiResponse.success(reportService.getSalesByCategory(date), "Category report generated"));
    }

    @Operation(summary = "Sales breakdown by employee (cashier)")
    @GetMapping("/by-employee")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSalesByEmployee(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (date == null)
            date = LocalDate.now();
        return ResponseEntity
                .ok(ApiResponse.success(reportService.getSalesByEmployee(date), "Employee report generated"));
    }

    @Operation(summary = "Top selling products")
    @GetMapping("/top-products")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getTopProducts(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "10") int limit) {
        if (date == null)
            date = LocalDate.now();
        return ResponseEntity.ok(ApiResponse.success(reportService.getTopProducts(date, limit), "Top products report"));
    }

    @Operation(summary = "Top selling products (alias)")
    @GetMapping("/products")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getProducts(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "10") int limit) {
        if (date == null)
            date = LocalDate.now();
        return ResponseEntity.ok(ApiResponse.success(reportService.getTopProducts(date, limit), "Product sales report"));
    }

    @Operation(summary = "Hourly sales breakdown")
    @GetMapping("/hourly")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getHourlyBreakdown(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        if (date == null)
            date = LocalDate.now();
        return ResponseEntity.ok(ApiResponse.success(reportService.getHourlyBreakdown(date), "Hourly breakdown"));
    }

    @Operation(summary = "Sales trend")
    @GetMapping("/sales-trend")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getSalesTrend(
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(ApiResponse.success(reportService.getSalesTrend(days), "Sales trend generated"));
    }

    @Operation(summary = "Payment breakdown")
    @GetMapping("/payment-breakdown")
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getPaymentBreakdown(
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(ApiResponse.success(reportService.getPaymentBreakdown(days), "Payment breakdown generated"));
    }

    @Operation(summary = "Dashboard metrics")
    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDashboardMetrics(
            @RequestParam(defaultValue = "30") int days) {
        return ResponseEntity.ok(ApiResponse.success(reportService.getDashboardMetrics(days), "Dashboard metrics generated"));
    }

    @Operation(summary = "Export daily transactions as CSV")
    @GetMapping("/export/csv")
    public ResponseEntity<byte[]> exportCsv(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date)
            throws Exception {
        if (date == null)
            date = LocalDate.now();
        List<Map<String, Object>> transactions = reportService
                .getAllTransactions(date);
        byte[] csvBytes = csvExporter.exportTransactions(transactions);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"sales-" + date + ".csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csvBytes);
    }

    @Operation(summary = "Export daily report as PDF")
    @GetMapping("/export/pdf")
    public ResponseEntity<byte[]> exportPdf(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date)
            throws Exception {
        if (date == null)
            date = LocalDate.now();
        Map<String, Object> summary = reportService.getZReport(date);
        byte[] pdfBytes = pdfGenerator.generateDailyReport(summary, date);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"report-" + date + ".pdf\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }
}
