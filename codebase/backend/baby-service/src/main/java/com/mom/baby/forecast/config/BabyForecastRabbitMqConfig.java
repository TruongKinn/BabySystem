package com.mom.baby.forecast.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.rabbit.config.SimpleRabbitListenerContainerFactory;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Map;

@Configuration
public class BabyForecastRabbitMqConfig {

    public static final String EXCHANGE = "baby.forecast.exchange";
    public static final String ACTIVITY_QUEUE = "baby.forecast.activity.queue";
    public static final String DLQ = "baby.forecast.dlq";
    public static final String ACTIVITY_RECORDED_ROUTING_KEY = "baby.activity.recorded";

    @Bean
    public DirectExchange babyForecastExchange() {
        return new DirectExchange(EXCHANGE, true, false);
    }

    @Bean
    public Queue babyForecastActivityQueue() {
        return new Queue(ACTIVITY_QUEUE, true, false, false, Map.of(
                "x-dead-letter-exchange", EXCHANGE,
                "x-dead-letter-routing-key", "baby.forecast.dead"
        ));
    }

    @Bean
    public Queue babyForecastDeadLetterQueue() {
        return new Queue(DLQ, true);
    }

    @Bean
    public Binding babyForecastActivityBinding(Queue babyForecastActivityQueue, DirectExchange babyForecastExchange) {
        return BindingBuilder.bind(babyForecastActivityQueue)
                .to(babyForecastExchange)
                .with(ACTIVITY_RECORDED_ROUTING_KEY);
    }

    @Bean
    public Binding babyForecastDeadLetterBinding(Queue babyForecastDeadLetterQueue, DirectExchange babyForecastExchange) {
        return BindingBuilder.bind(babyForecastDeadLetterQueue)
                .to(babyForecastExchange)
                .with("baby.forecast.dead");
    }

    @Bean
    public MessageConverter babyForecastMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory, MessageConverter babyForecastMessageConverter) {
        RabbitTemplate rabbitTemplate = new RabbitTemplate(connectionFactory);
        rabbitTemplate.setMessageConverter(babyForecastMessageConverter);
        return rabbitTemplate;
    }

    @Bean
    public SimpleRabbitListenerContainerFactory rabbitListenerContainerFactory(
            ConnectionFactory connectionFactory,
            MessageConverter babyForecastMessageConverter
    ) {
        SimpleRabbitListenerContainerFactory factory = new SimpleRabbitListenerContainerFactory();
        factory.setConnectionFactory(connectionFactory);
        factory.setMessageConverter(babyForecastMessageConverter);
        factory.setDefaultRequeueRejected(false);
        return factory;
    }
}
