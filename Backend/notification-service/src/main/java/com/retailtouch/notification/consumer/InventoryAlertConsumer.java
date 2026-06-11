package com.retailtouch.notification.consumer;

import com.retailtouch.notification.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
public class InventoryAlertConsumer {
    private static final Logger log = LoggerFactory.getLogger(InventoryAlertConsumer.class);

    private final NotificationService notificationService;

    public InventoryAlertConsumer(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @RabbitListener(queues = "low-stock-queue")
    public void consumeLowStockAlert(String message) {
        log.info("Received low stock alert: {}", message);

        // In a real app, we'd lookup the store manager's email/phone
        notificationService.sendEmail("manager@retailtouch.com", "LOW STOCK ALERT", message);
        notificationService.sendSms("+919876543210", "RetailTouch alert: " + message);
    }
}
