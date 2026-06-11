package com.retailtouch.sales.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@FeignClient(name = "customer-service", url = "${customer-service.url}")
public interface CustomerClient {

    @PostMapping("/api/customers/{customerId}/loyalty/add")
    void addPoints(@PathVariable("customerId") String customerId, @RequestParam("points") int points);

    @PostMapping("/api/customers/{customerId}/loyalty/redeem")
    void redeemPoints(@PathVariable("customerId") String customerId, @RequestParam("points") int points);
}
