package com.retailtouch.reporting;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;

@SpringBootApplication
@ComponentScan(basePackages = {"com.retailtouch.reporting", "com.retailtouch.common"})
public class ReportingServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(ReportingServiceApplication.class, args);
    }
}
