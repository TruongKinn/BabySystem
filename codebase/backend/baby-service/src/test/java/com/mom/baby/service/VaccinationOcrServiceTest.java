package com.mom.baby.service;

import com.mom.baby.controller.dto.OcrScanRequest;
import com.mom.baby.controller.dto.VaccinationResponse;
import com.mom.baby.domain.BabyEntity;
import com.mom.baby.domain.VaccineEntity;
import com.mom.baby.domain.VaccinationEntity;
import com.mom.baby.repository.BabyRepository;
import com.mom.baby.repository.VaccinationRepository;
import com.mom.baby.repository.VaccineRepository;
import com.mom.common.context.UserContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class VaccinationOcrServiceTest {

    @Mock
    private BabyRepository babyRepository;

    @Mock
    private VaccineRepository vaccineRepository;

    @Mock
    private VaccinationRepository vaccinationRepository;

    @Mock
    private RestClient.Builder restClientBuilder;

    @InjectMocks
    private VaccinationOcrService vaccinationOcrService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(vaccinationOcrService, "aiServiceUri", "http://localhost:8090");
        
        // Mock UserContext
        UserContext.setUserId(1L);
        UserContext.setFamilyIds(List.of(100L));
        UserContext.setAdmin(false);
    }

    @AfterEach
    void tearDown() {
        UserContext.clear();
    }

    @Test
    void testScanAndImportSuccess() throws Exception {
        // Given
        Long babyId = 1L;
        OcrScanRequest request = new OcrScanRequest(999L);

        BabyEntity baby = new BabyEntity();
        baby.setId(babyId);
        baby.setFamilyId(100L);
        baby.setName("Baby Test");
        when(babyRepository.findById(babyId)).thenReturn(Optional.of(baby));

        // Mock RestClient calls
        RestClient restClient = mock(RestClient.class);
        RestClient.RequestBodyUriSpec bodyUriSpec = mock(RestClient.RequestBodyUriSpec.class);
        RestClient.RequestBodySpec bodySpec = mock(RestClient.RequestBodySpec.class, invocation -> {
            Class<?> returnType = invocation.getMethod().getReturnType();
            if (returnType.isAssignableFrom(RestClient.RequestBodySpec.class)
                || returnType.isAssignableFrom(RestClient.RequestHeadersSpec.class)) {
                return invocation.getMock();
            }
            return null;
        });
        RestClient.ResponseSpec responseSpec = mock(RestClient.ResponseSpec.class);

        doReturn(restClient).when(restClientBuilder).build();
        doReturn(bodyUriSpec).when(restClient).post();
        doReturn(bodySpec).when(bodyUriSpec).uri(anyString());
        doReturn(responseSpec).when(bodySpec).retrieve();

        Class<?> envelopeCls = Class.forName("com.mom.baby.service.VaccinationOcrService$AiOcrEnvelope");
        Class<?> responseCls = Class.forName("com.mom.baby.service.VaccinationOcrService$AiOcrVaccinationResponse");
        Class<?> itemCls = Class.forName("com.mom.baby.service.VaccinationOcrService$AiOcrVaccinationItem");

        // Create item: record AiOcrVaccinationItem(String vaccineName, Integer doseNumber, String dueDate, String notes)
        Object item = itemCls.getDeclaredConstructors()[0].newInstance("Lao BCG", 1, "2026-06-01", "Notes test");
        List<Object> items = new ArrayList<>();
        items.add(item);

        // Create response: record AiOcrVaccinationResponse(List<AiOcrVaccinationItem> vaccinations)
        Object response = responseCls.getDeclaredConstructors()[0].newInstance(items);

        // Create envelope: record AiOcrEnvelope(boolean success, String message, AiOcrVaccinationResponse data)
        Object envelope = envelopeCls.getDeclaredConstructors()[0].newInstance(true, "Success", response);

        when(responseSpec.body(any(Class.class))).thenReturn(envelope);

        // Mock repository matching
        VaccineEntity vaccine = new VaccineEntity();
        vaccine.setId(10L);
        vaccine.setName("Lao BCG");
        when(vaccineRepository.findByName("Lao BCG")).thenReturn(Optional.of(vaccine));
        
        when(vaccinationRepository.findByBabyIdAndVaccineIdAndDoseNumber(babyId, 10L, 1))
                .thenReturn(Optional.empty());

        when(vaccinationRepository.save(any(VaccinationEntity.class))).thenAnswer(invocation -> {
            VaccinationEntity entity = invocation.getArgument(0);
            entity.setId(50L);
            return entity;
        });

        // When
        List<VaccinationResponse> result = vaccinationOcrService.scanAndImport(babyId, request);

        // Then
        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("Lao BCG", result.get(0).vaccineName());
        assertEquals(50L, result.get(0).id());
        assertEquals(1, result.get(0).doseNumber());
    }
}
