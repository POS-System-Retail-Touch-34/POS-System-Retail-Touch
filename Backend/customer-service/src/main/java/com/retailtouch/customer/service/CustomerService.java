package com.retailtouch.customer.service;

import com.retailtouch.common.exception.ResourceNotFoundException;
import com.retailtouch.customer.entity.Customer;
import com.retailtouch.customer.repository.CustomerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class CustomerService {
    private static final Logger log = LoggerFactory.getLogger(CustomerService.class);

    private final CustomerRepository customerRepository;
    private final RabbitTemplate rabbitTemplate;

    @Value("${auth-service.url}")
    private String authServiceUrl;

    public CustomerService(CustomerRepository customerRepository, RabbitTemplate rabbitTemplate) {
        this.customerRepository = customerRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    private static final String LOYALTY_EXCHANGE = "loyalty.exchange";
    private static final String LOYALTY_UPDATE_KEY = "loyalty.update";

    public Customer createCustomer(Customer customer) {
        if (customer.getPhone() != null && customerRepository.existsByPhone(customer.getPhone())) {
            throw new IllegalArgumentException("Customer with phone " + customer.getPhone() + " already exists");
        }
        if (customer.getEmail() != null && customerRepository.existsByEmail(customer.getEmail())) {
            throw new IllegalArgumentException("Customer with email " + customer.getEmail() + " already exists");
        }
        log.info("Creating customer: {}", customer.getName());
        return customerRepository.save(customer);
    }

    public Customer getCustomerById(String id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found: " + id));
    }

    public Customer getByPhone(String phone) {
        return customerRepository.findByPhone(phone)
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with phone: " + phone));
    }

    public List<Customer> searchByName(String name) {
        if (name == null || name.trim().isEmpty()) {
            return customerRepository.findTop10ByOrderByLastPurchaseDateDesc();
        }
        return customerRepository.searchByKeyword(name.trim());
    }

    public Customer updateCustomer(String id, Customer customer) {
        Customer existing = getCustomerById(id);
        existing.setName(customer.getName());
        existing.setEmail(customer.getEmail());
        existing.setAddress(customer.getAddress());
        existing.setUpdatedAt(LocalDateTime.now());
        return customerRepository.save(existing);
    }

    public Customer addLoyaltyPoints(String customerId, int points) {
        Customer customer = getCustomerById(customerId);
        int newPoints = customer.getLoyaltyPoints() + points;
        if (newPoints < 0) {
            throw new IllegalStateException("Loyalty points cannot become negative");
        }
        customer.setLoyaltyPoints(newPoints);
        customer.setUpdatedAt(LocalDateTime.now());
        customer.setLastPurchaseDate(LocalDateTime.now());
        Customer updated = customerRepository.save(customer);

        publishLoyaltyEvent(customerId, "POINTS_ADDED", points, newPoints);
        publishAudit("LOYALTY_CHANGE",
                "{\"customerId\":\"" + customerId + "\",\"points\":" + customer.getLoyaltyPoints() + "}",
                "{\"customerId\":\"" + customerId + "\",\"points\":" + newPoints + "}",
                "system",
                "SYSTEM");
        log.info("Added {} loyalty points to customer {}. Total: {}", points, customerId, newPoints);
        return updated;
    }

    public Customer redeemLoyaltyPoints(String customerId, int points) {
        Customer customer = getCustomerById(customerId);
        if (customer.getLoyaltyPoints() < points) {
            throw new IllegalStateException("Insufficient loyalty points. Available: " + customer.getLoyaltyPoints());
        }
        int newPoints = customer.getLoyaltyPoints() - points;
        customer.setLoyaltyPoints(newPoints);
        customer.setUpdatedAt(LocalDateTime.now());
        Customer updated = customerRepository.save(customer);

        publishLoyaltyEvent(customerId, "POINTS_REDEEMED", points, newPoints);
        publishAudit("LOYALTY_CHANGE",
                "{\"customerId\":\"" + customerId + "\",\"points\":" + customer.getLoyaltyPoints() + "}",
                "{\"customerId\":\"" + customerId + "\",\"points\":" + newPoints + "}",
                "system",
                "SYSTEM");
        log.info("Redeemed {} loyalty points from customer {}. Remaining: {}", points, customerId, newPoints);
        return updated;
    }

    public List<Customer> getAllCustomers() {
        return customerRepository.findAll();
    }

    public void deleteCustomer(String id) {
        Customer existing = getCustomerById(id);
        customerRepository.deleteById(id);
        log.info("Deleted customer id={} name={}", existing.getId(), existing.getName());
    }

    private void publishLoyaltyEvent(String customerId, String eventType, int pointsChanged, int totalPoints) {
        try {
            String event = String.format(
                    "{\"type\":\"%s\",\"customerId\":\"%s\",\"pointsChanged\":%d,\"totalPoints\":%d}",
                    eventType, customerId, pointsChanged, totalPoints);
            rabbitTemplate.convertAndSend(LOYALTY_EXCHANGE, LOYALTY_UPDATE_KEY, event);
        } catch (Exception e) {
            log.error("Failed to publish loyalty event: {}", e.getMessage());
        }
    }

    private void publishAudit(String action, String oldValue, String newValue, String changedBy, String role) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            String payload = String.format(
                    "{\"action\":\"%s\",\"module\":\"CUSTOMER\",\"oldValue\":%s,\"newValue\":%s,\"changedBy\":\"%s\",\"role\":\"%s\"}",
                    action,
                    oldValue == null ? "null" : "\"" + oldValue.replace("\"", "\\\\\"") + "\"",
                    newValue == null ? "null" : "\"" + newValue.replace("\"", "\\\\\"") + "\"",
                    changedBy,
                    role);
            new RestTemplate().postForEntity(authServiceUrl + "/auth/internal/audit", new HttpEntity<>(payload, headers),
                    String.class);
        } catch (Exception ex) {
            log.warn("Failed to publish audit event '{}': {}", action, ex.getMessage());
        }
    }
}
