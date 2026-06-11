package com.retailtouch.customer.service;

import com.retailtouch.customer.entity.Customer;
import com.retailtouch.customer.repository.CustomerRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class CustomerServiceTest {

    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private RabbitTemplate rabbitTemplate;

    @InjectMocks
    private CustomerService customerService;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void testAddLoyaltyPoints_Success() {
        Customer customer = Customer.builder()
                .id("c1")
                .name("John Doe")
                .loyaltyPoints(50)
                .build();

        when(customerRepository.findById("c1")).thenReturn(Optional.of(customer));

        customerService.addLoyaltyPoints("c1", 20);

        assertEquals(70, customer.getLoyaltyPoints());
        verify(customerRepository, times(1)).save(customer);
    }

    @Test
    void testRedeemLoyaltyPoints_Success() {
        Customer customer = Customer.builder()
                .id("c1")
                .loyaltyPoints(100)
                .build();

        when(customerRepository.findById("c1")).thenReturn(Optional.of(customer));

        customerService.redeemLoyaltyPoints("c1", 40);

        assertEquals(60, customer.getLoyaltyPoints());
    }

    @Test
    void testRedeemLoyaltyPoints_Insufficient() {
        Customer customer = Customer.builder()
                .id("c1")
                .loyaltyPoints(30)
                .build();

        when(customerRepository.findById("c1")).thenReturn(Optional.of(customer));

        assertThrows(RuntimeException.class, () -> customerService.redeemLoyaltyPoints("c1", 50));
    }
}
