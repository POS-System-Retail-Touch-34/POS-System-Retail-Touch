package com.retailtouch.customer.controller;

import com.retailtouch.common.dto.ApiResponse;
import com.retailtouch.customer.entity.Customer;
import com.retailtouch.customer.service.CustomerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customers")
@Tag(name = "Customers", description = "Customer management and loyalty APIs")
@PreAuthorize("hasAnyRole('CASHIER','STORE_MANAGER','ADMIN')")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @Operation(summary = "Create new customer")
    @PostMapping
    public ResponseEntity<ApiResponse<Customer>> createCustomer(@Valid @RequestBody Customer customer) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created(customerService.createCustomer(customer), "Customer created"));
    }

    @Operation(summary = "Get all customers")
    @GetMapping
    public ResponseEntity<ApiResponse<List<Customer>>> getAllCustomers() {
        return ResponseEntity.ok(ApiResponse.success(customerService.getAllCustomers(), "Customers retrieved"));
    }

    @Operation(summary = "Get customer by ID")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Customer>> getById(@PathVariable String id) {
        return ResponseEntity.ok(ApiResponse.success(customerService.getCustomerById(id), "Customer found"));
    }

    @Operation(summary = "Find customer by phone number")
    @GetMapping("/phone/{phone}")
    public ResponseEntity<ApiResponse<Customer>> getByPhone(@PathVariable String phone) {
        return ResponseEntity.ok(ApiResponse.success(customerService.getByPhone(phone), "Customer found"));
    }

    @Operation(summary = "Search customers by name or phone")
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<Customer>>> searchByName(
            @RequestParam(required = false, defaultValue = "") String name) {
        return ResponseEntity.ok(ApiResponse.success(customerService.searchByName(name), "Search results"));
    }

    @Operation(summary = "Update customer")
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<Customer>> updateCustomer(@PathVariable String id,
            @Valid @RequestBody Customer customer) {
        return ResponseEntity.ok(ApiResponse.success(customerService.updateCustomer(id, customer), "Customer updated"));
    }

    @Operation(summary = "Delete customer")
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteCustomer(@PathVariable String id) {
        customerService.deleteCustomer(id);
        return ResponseEntity.ok(ApiResponse.success("Customer deleted successfully"));
    }

    @Operation(summary = "Add loyalty points")
    @PostMapping("/{id}/loyalty/add")
    public ResponseEntity<ApiResponse<Customer>> addPoints(@PathVariable String id,
            @RequestParam int points) {
        return ResponseEntity
                .ok(ApiResponse.success(customerService.addLoyaltyPoints(id, points), "Loyalty points added"));
    }

    @Operation(summary = "Redeem loyalty points")
    @PostMapping("/{id}/loyalty/redeem")
    public ResponseEntity<ApiResponse<Customer>> redeemPoints(@PathVariable String id,
            @RequestParam int points) {
        return ResponseEntity
                .ok(ApiResponse.success(customerService.redeemLoyaltyPoints(id, points), "Loyalty points redeemed"));
    }
}
