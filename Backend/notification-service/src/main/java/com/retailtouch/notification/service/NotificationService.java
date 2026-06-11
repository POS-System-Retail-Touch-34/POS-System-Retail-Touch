package com.retailtouch.notification.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {
    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    public void sendEmail(String to, String subject, String body) {
        log.info("Sending Email to: {}, Subject: {}, Body: {}", to, subject, body);
        // Mock email sending logic
    }

    public void sendSms(String phone, String message) {
        log.info("Sending SMS to: {}, Message: {}", phone, message);
        // Mock SMS sending logic
    }
}
