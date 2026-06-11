package com.retailtouch.gateway.filter;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class RouteValidator {

        public static final List<String> PUBLIC_ENDPOINTS = List.of(
                        "/auth/register",
                        "/auth/login",
                        "/auth/refresh",
                        "/actuator/health",
                        "/v3/api-docs",
                        "/swagger-ui",
                        "/swagger-ui.html");

        public boolean isSecured(org.springframework.http.server.reactive.ServerHttpRequest request) {
                return PUBLIC_ENDPOINTS.stream()
                                .noneMatch(endpoint -> request.getURI().getPath().startsWith(endpoint));
        }
}
