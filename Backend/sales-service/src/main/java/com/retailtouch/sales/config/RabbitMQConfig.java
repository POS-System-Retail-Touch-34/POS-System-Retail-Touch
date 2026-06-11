package com.retailtouch.sales.config;

import org.springframework.amqp.core.*;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMQConfig {

    public static final String SALES_EXCHANGE = "sales.exchange";
    public static final String SALE_COMPLETED_QUEUE = "sales.completed.queue";
    public static final String SALE_COMPLETED_KEY = "sales.completed";

    @Bean
    public TopicExchange salesExchange() {
        return new TopicExchange(SALES_EXCHANGE, true, false);
    }

    @Bean
    public Queue saleCompletedQueue() {
        return QueueBuilder.durable(SALE_COMPLETED_QUEUE).build();
    }

    @Bean
    public Binding saleCompletedBinding(Queue saleCompletedQueue, TopicExchange salesExchange) {
        return BindingBuilder.bind(saleCompletedQueue).to(salesExchange).with(SALE_COMPLETED_KEY);
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
