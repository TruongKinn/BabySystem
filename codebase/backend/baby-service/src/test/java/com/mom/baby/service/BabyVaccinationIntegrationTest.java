package com.mom.baby.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.mom.baby.controller.BabyController;
import com.mom.baby.controller.VaccineController;
import com.mom.baby.controller.dto.CreateVaccinationRequest;
import com.mom.baby.controller.dto.OcrScanRequest;
import com.mom.baby.controller.dto.VaccinationResponse;
import com.mom.baby.domain.VaccineEntity;
import com.mom.common.context.UserContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class BabyVaccinationIntegrationTest {

    private MockMvc mockMvcBaby;
    private MockMvc mockMvcVaccine;
    private ObjectMapper objectMapper = new ObjectMapper();

    @Mock
    private BabyService babyService;

    @Mock
    private VaccinationOcrService vaccinationOcrService;

    @Mock
    private VaccineService vaccineService;

    @InjectMocks
    private BabyController babyController;

    @InjectMocks
    private VaccineController vaccineController;

    @BeforeEach
    void setUp() {
        objectMapper.registerModule(new JavaTimeModule());
        mockMvcBaby = MockMvcBuilders.standaloneSetup(babyController).build();
        mockMvcVaccine = MockMvcBuilders.standaloneSetup(vaccineController).build();
        
        UserContext.setUserId(1L);
        UserContext.setFamilyIds(List.of(100L));
        UserContext.setAdmin(true);
    }

    @AfterEach
    void tearDown() {
        UserContext.clear();
    }

    @Test
    void testGetVaccinesList() throws Exception {
        VaccineEntity vaccine = new VaccineEntity();
        vaccine.setId(1L);
        vaccine.setName("Lao BCG");
        vaccine.setDiseasePrevented("Tuberculosis");

        when(vaccineService.getAllVaccines()).thenReturn(List.of(vaccine));

        mockMvcVaccine.perform(get("/api/vaccines"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].name").value("Lao BCG"))
                .andExpect(jsonPath("$.data[0].diseasePrevented").value("Tuberculosis"));
    }

    @Test
    void testAddVaccinationRecord() throws Exception {
        Long babyId = 1L;
        CreateVaccinationRequest request = new CreateVaccinationRequest(
                "Lao BCG",
                LocalDate.now(),
                false,
                "Note test"
        );

        VaccinationResponse response = new VaccinationResponse(
                500L,
                babyId,
                10L,
                "Lao BCG",
                1,
                request.dueDate(),
                false,
                null,
                null,
                null,
                "Note test",
                "PENDING"
        );

        when(babyService.createVaccination(eq(babyId), any(CreateVaccinationRequest.class))).thenReturn(response);

        mockMvcBaby.perform(post("/api/babies/{id}/vaccinations", babyId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.vaccineName").value("Lao BCG"))
                .andExpect(jsonPath("$.data.id").value(500L));
    }
}
