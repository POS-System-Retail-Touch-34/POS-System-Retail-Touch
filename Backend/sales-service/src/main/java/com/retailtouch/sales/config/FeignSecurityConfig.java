package com.retailtouch.sales.config;

import feign.RequestInterceptor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Configuration
public class FeignSecurityConfig {

    @Bean
    public RequestInterceptor authorizationForwardingInterceptor() {
        return requestTemplate -> {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes == null) {
                return;
            }

            String authHeader = attributes.getRequest().getHeader("Authorization");
            if (authHeader != null && !authHeader.isBlank()) {
                requestTemplate.header("Authorization", authHeader);
            }
        };
    }
}
