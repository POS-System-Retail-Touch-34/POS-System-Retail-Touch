package com.retailtouch.gateway.filter;

import com.retailtouch.gateway.util.JwtUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cloud.gateway.filter.GatewayFilter;
import org.springframework.cloud.gateway.filter.factory.AbstractGatewayFilterFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.nio.charset.StandardCharsets;

@Component
public class AuthenticationFilter extends AbstractGatewayFilterFactory<AuthenticationFilter.Config> {
    private static final Logger log = LoggerFactory.getLogger(AuthenticationFilter.class);

    private final RouteValidator routeValidator;
    private final JwtUtil jwtUtil;
    private final MaintenanceModeService maintenanceModeService;

    @Autowired
    public AuthenticationFilter(RouteValidator routeValidator, JwtUtil jwtUtil,
            MaintenanceModeService maintenanceModeService) {
        super(Config.class);
        this.routeValidator = routeValidator;
        this.jwtUtil = jwtUtil;
        this.maintenanceModeService = maintenanceModeService;
    }

    @Override
    public GatewayFilter apply(Config config) {
        return (exchange, chain) -> {
            ServerHttpRequest request = exchange.getRequest();

            if (routeValidator.isSecured(request)) {
                if (!request.getHeaders().containsKey(HttpHeaders.AUTHORIZATION)) {
                    return onError(exchange, "Missing Authorization header", HttpStatus.UNAUTHORIZED);
                }

                String authHeader = request.getHeaders().getFirst(HttpHeaders.AUTHORIZATION);
                if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                    return onError(exchange, "Invalid Authorization header format", HttpStatus.UNAUTHORIZED);
                }

                String token = authHeader.substring(7);

                if (!jwtUtil.validateToken(token)) {
                    return onError(exchange, "Invalid or expired JWT token", HttpStatus.UNAUTHORIZED);
                }

                try {
                    String username = jwtUtil.extractUsername(token);
                    String role = jwtUtil.extractRole(token);

                    ServerHttpRequest mutatedRequest = exchange.getRequest().mutate()
                            .header("X-Auth-User", username)
                            .header("X-Auth-Role", role != null ? role : "")
                            .build();

                    log.debug("JWT validated for user: {} with role: {}", username, role);
                    return maintenanceModeService.isMaintenanceEnabled().flatMap(maintenanceEnabled -> {
                        String path = request.getURI().getPath();
                        boolean isAuthPath = path.startsWith("/auth/");
                        boolean isAdmin = "ADMIN".equalsIgnoreCase(role) || "ROLE_ADMIN".equalsIgnoreCase(role);
                        if (maintenanceEnabled && !isAuthPath && !isAdmin) {
                            return onError(exchange, "System is under maintenance", HttpStatus.SERVICE_UNAVAILABLE);
                        }
                        return chain.filter(exchange.mutate().request(mutatedRequest).build());
                    });
                } catch (Exception e) {
                    log.error("JWT processing error: {}", e.getMessage());
                    return onError(exchange, "Token processing error", HttpStatus.UNAUTHORIZED);
                }
            }

            return chain.filter(exchange);
        };
    }

    private Mono<Void> onError(ServerWebExchange exchange, String message, HttpStatus status) {
        ServerHttpResponse response = exchange.getResponse();
        response.setStatusCode(status);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);

        String body = String.format(
                "{\"timestamp\":\"%s\",\"status\":%d,\"message\":\"%s\"}",
                java.time.LocalDateTime.now(),
                status.value(),
                message);

        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        org.springframework.core.io.buffer.DataBuffer buffer = response.bufferFactory().wrap(bytes);

        log.warn("Gateway auth error [{}]: {}", status, message);
        return response.writeWith(Mono.just(buffer));
    }

    public static class Config {
    }
}
