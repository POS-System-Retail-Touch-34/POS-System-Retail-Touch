package com.retailtouch.gateway.filter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

@Service
public class MaintenanceModeService {

    private static final Logger log = LoggerFactory.getLogger(MaintenanceModeService.class);

    private final WebClient webClient;
    private final String maintenanceUrl;

    private volatile boolean cachedMaintenanceMode = false;
    private volatile Instant lastFetched = Instant.EPOCH;
    private final Duration cacheTtl = Duration.ofSeconds(10);

    public MaintenanceModeService(@Value("${AUTH_SERVICE_URL}") String authServiceUrl) {
        this.webClient = WebClient.builder().build();
        this.maintenanceUrl = authServiceUrl + "/auth/internal/maintenance";
    }

    public Mono<Boolean> isMaintenanceEnabled() {
        Instant now = Instant.now();
        if (lastFetched.plus(cacheTtl).isAfter(now)) {
            return Mono.just(cachedMaintenanceMode);
        }

        return webClient.get()
                .uri(maintenanceUrl)
                .retrieve()
                .bodyToMono(Map.class)
                .map(body -> Boolean.TRUE.equals(body.get("maintenanceMode")))
                .doOnNext(value -> {
                    cachedMaintenanceMode = value;
                    lastFetched = Instant.now();
                })
                .doOnError(error -> log.warn("Could not fetch maintenance state: {}", error.getMessage()))
                .onErrorResume(error -> Mono.just(cachedMaintenanceMode));
    }
}
