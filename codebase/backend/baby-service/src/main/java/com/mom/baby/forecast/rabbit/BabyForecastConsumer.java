package com.mom.baby.forecast.rabbit;

import com.mom.baby.forecast.config.BabyForecastRabbitMqConfig;
import com.mom.baby.forecast.event.BabyActivityRecordedMessage;
import com.mom.baby.forecast.service.BabyForecastService;
import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BabyForecastConsumer {

    private final BabyForecastService babyForecastService;

    @RabbitListener(queues = BabyForecastRabbitMqConfig.ACTIVITY_QUEUE)
    public void onActivityRecorded(BabyActivityRecordedMessage message) {
        babyForecastService.processActivityMessage(message, BabyForecastRabbitMqConfig.ACTIVITY_QUEUE);
    }
}
