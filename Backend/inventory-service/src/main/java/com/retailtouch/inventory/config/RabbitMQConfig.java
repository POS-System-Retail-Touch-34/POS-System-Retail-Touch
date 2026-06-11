package com.retailtouch.inventory.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String INVENTORY_EXCHANGE = "inventory.exchange";
    public static final String LOW_STOCK_QUEUE = "inventory.low-stock.queue";
    public static final String LOW_STOCK_ROUTING_KEY = "inventory.low-stock";
    public static final String SALE_DEDUCT_QUEUE = "inventory.sale-deduct.queue";
    public static final String SALE_DEDUCT_ROUTING_KEY = "inventory.sale-deduct";

    @Bean
    public TopicExchange inventoryExchange() {
        return new TopicExchange(INVENTORY_EXCHANGE, true, false);
    }

    @Bean
    public Queue lowStockQueue() {
        return QueueBuilder.durable(LOW_STOCK_QUEUE).build();
    }

    @Bean
    public Queue saleDeductQueue() {
        return QueueBuilder.durable(SALE_DEDUCT_QUEUE).build();
    }

    @Bean
    public Binding lowStockBinding(@Qualifier("lowStockQueue") Queue lowStockQueue,
            TopicExchange inventoryExchange) {
        return BindingBuilder.bind(lowStockQueue).to(inventoryExchange).with(LOW_STOCK_ROUTING_KEY);
    }

    @Bean
    public Binding saleDeductBinding(@Qualifier("saleDeductQueue") Queue saleDeductQueue,
            TopicExchange inventoryExchange) {
        return BindingBuilder.bind(saleDeductQueue).to(inventoryExchange).with(SALE_DEDUCT_ROUTING_KEY);
    }

    @Bean
    public Jackson2JsonMessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(messageConverter());
        return template;
    }
}
