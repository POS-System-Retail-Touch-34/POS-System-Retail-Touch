package com.retailtouch.gateway.controller;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class GatewayController {

    @GetMapping(value = "/", produces = MediaType.APPLICATION_JSON_VALUE)
    public Map<String, Object> gatewayHome() {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("service", "gateway-service");
        response.put("status", "UP");
        response.put("timestamp", LocalDateTime.now().toString());
        response.put("health", "/actuator/health");
        response.put("routes", new String[] {
                "/auth/**",
                "/api/users/**",
                "/api/settings/**",
                "/api/products/**",
                "/api/inventory/**",
                "/categories/**",
                "/api/sales/**",
                "/api/customers/**",
                "/api/reports/**",
                "/api/notifications/**"
        });
        return response;
    }
}
