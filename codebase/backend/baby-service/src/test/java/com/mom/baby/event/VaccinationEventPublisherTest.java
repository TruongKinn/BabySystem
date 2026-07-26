package com.mom.baby.event;

import com.mom.common.kafka.BaseEvent;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;

import java.time.LocalDate;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VaccinationEventPublisherTest {

    @Mock
    private KafkaTemplate<String, BaseEvent<?>> kafkaTemplate;

    private VaccinationEventPublisher eventPublisher;

    @Captor
    private ArgumentCaptor<BaseEvent<VaccinationReminderPayload>> eventCaptor;

    @BeforeEach
    void setUp() {
        eventPublisher = new VaccinationEventPublisher(kafkaTemplate);
    }

    @Test
    void testPublishVaccinationReminder() {
        // Given
        VaccinationReminderPayload payload = new VaccinationReminderPayload(
                1L,
                "Baby Name",
                2L,
                "Vaccine BCG",
                1,
                LocalDate.now(),
                100L
        );

        CompletableFuture<SendResult<String, BaseEvent<?>>> future = new CompletableFuture<>();
        when(kafkaTemplate.send(eq("vaccination-reminder-topic"), any(String.class), any(BaseEvent.class)))
                .thenReturn(future);

        // When
        eventPublisher.publishVaccinationReminder(payload);

        // Then
        verify(kafkaTemplate).send(
                eq("vaccination-reminder-topic"),
                eq("1_2"),
                eventCaptor.capture()
        );

        BaseEvent<VaccinationReminderPayload> capturedEvent = eventCaptor.getValue();
        assertNotNull(capturedEvent);
        assertEquals("VACCINATION_REMINDER", capturedEvent.eventType());
        assertEquals(payload.familyId(), capturedEvent.familyId());
        
        VaccinationReminderPayload capturedPayload = capturedEvent.payload();
        assertNotNull(capturedPayload);
        assertEquals(payload.babyId(), capturedPayload.babyId());
        assertEquals(payload.babyName(), capturedPayload.babyName());
        assertEquals(payload.vaccineName(), capturedPayload.vaccineName());
    }
}
