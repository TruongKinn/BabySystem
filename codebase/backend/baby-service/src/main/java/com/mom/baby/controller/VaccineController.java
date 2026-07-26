package com.mom.baby.controller;

import com.mom.baby.controller.dto.CreateScheduleConfigRequest;
import com.mom.baby.controller.dto.CreateVaccineRequest;
import com.mom.baby.domain.VaccineEntity;
import com.mom.baby.domain.VaccineScheduleConfigEntity;
import com.mom.baby.service.VaccineService;
import com.mom.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class VaccineController {

    private final VaccineService vaccineService;

    @PostMapping("/vaccines")
    public ApiResponse<VaccineEntity> createVaccine(@Valid @RequestBody CreateVaccineRequest request) {
        return ApiResponse.ok("Vaccine created", vaccineService.createVaccine(request));
    }

    @PutMapping("/vaccines/{id}")
    public ApiResponse<VaccineEntity> updateVaccine(
            @PathVariable("id") Long id,
            @Valid @RequestBody CreateVaccineRequest request
    ) {
        return ApiResponse.ok("Vaccine updated", vaccineService.updateVaccine(id, request));
    }

    @GetMapping("/vaccines")
    public ApiResponse<List<VaccineEntity>> getVaccines(@RequestParam(value = "activeOnly", defaultValue = "false") boolean activeOnly) {
        List<VaccineEntity> list = activeOnly ? vaccineService.getActiveVaccines() : vaccineService.getAllVaccines();
        return ApiResponse.ok("Success", list);
    }

    @PostMapping("/vaccines/{vaccineId}/schedule-configs")
    public ApiResponse<VaccineScheduleConfigEntity> createScheduleConfig(
            @PathVariable("vaccineId") Long vaccineId,
            @Valid @RequestBody CreateScheduleConfigRequest request
    ) {
        return ApiResponse.ok("Schedule config created", vaccineService.createScheduleConfig(vaccineId, request));
    }

    @GetMapping("/vaccines/{vaccineId}/schedule-configs")
    public ApiResponse<List<VaccineScheduleConfigEntity>> getScheduleConfigs(@PathVariable("vaccineId") Long vaccineId) {
        return ApiResponse.ok("Success", vaccineService.getScheduleConfigs(vaccineId));
    }
}
