package com.retailtouch.customer.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String LOYALTY_EXCHANGE = "loyalty.exchange";
    public static final String LOYALTY_UPDATE_QUEUE = "loyalty.update.queue";
    public static final String LOYALTY_UPDATE_KEY = "loyalty.update";

    @Bean
    public TopicExchange loyaltyExchange() {
        return new TopicExchange(LOYALTY_EXCHANGE, true, false);
    }

    @Bean
    public Queue loyaltyUpdateQueue() {
        return QueueBuilder.durable(LOYALTY_UPDATE_QUEUE).build();
    }

    @Bean
    public Binding loyaltyBinding(Queue loyaltyUpdateQueue, TopicExchange loyaltyExchange) {
        return BindingBuilder.bind(loyaltyUpdateQueue).to(loyaltyExchange).with(LOYALTY_UPDATE_KEY);
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
