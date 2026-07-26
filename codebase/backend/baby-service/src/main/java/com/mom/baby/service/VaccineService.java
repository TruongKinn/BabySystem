package com.mom.baby.service;

import com.mom.baby.controller.dto.CreateScheduleConfigRequest;
import com.mom.baby.controller.dto.CreateVaccineRequest;
import com.mom.baby.domain.VaccineEntity;
import com.mom.baby.domain.VaccineScheduleConfigEntity;
import com.mom.baby.repository.VaccineRepository;
import com.mom.baby.repository.VaccineScheduleConfigRepository;
import com.mom.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class VaccineService {

    private final VaccineRepository vaccineRepository;
    private final VaccineScheduleConfigRepository configRepository;

    @Transactional
    @CacheEvict(value = "vaccines", allEntries = true)
    public VaccineEntity createVaccine(CreateVaccineRequest request) {
        if (vaccineRepository.findByName(request.name().trim()).isPresent()) {
            throw new IllegalArgumentException("Vaccine name already exists: " + request.name());
        }

        VaccineEntity vaccine = new VaccineEntity();
        vaccine.setName(request.name().trim());
        vaccine.setManufacturer(request.manufacturer() != null ? request.manufacturer().trim() : null);
        vaccine.setDiseasePrevented(request.diseasePrevented().trim());
        vaccine.setTotalDoses(request.totalDoses());
        vaccine.setDescription(request.description() != null ? request.description().trim() : null);
        vaccine.setActive(true);

        return vaccineRepository.save(vaccine);
    }

    @Transactional
    @CacheEvict(value = "vaccines", allEntries = true)
    public VaccineEntity updateVaccine(Long id, CreateVaccineRequest request) {
        VaccineEntity vaccine = vaccineRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Vaccine not found with id: " + id));

        vaccineRepository.findByName(request.name().trim())
                .ifPresent(existing -> {
                    if (!existing.getId().equals(id)) {
                        throw new IllegalArgumentException("Vaccine name already exists: " + request.name());
                    }
                });

        vaccine.setName(request.name().trim());
        vaccine.setManufacturer(request.manufacturer() != null ? request.manufacturer().trim() : null);
        vaccine.setDiseasePrevented(request.diseasePrevented().trim());
        vaccine.setTotalDoses(request.totalDoses());
        vaccine.setDescription(request.description() != null ? request.description().trim() : null);

        return vaccineRepository.save(vaccine);
    }

    @Cacheable(value = "vaccines", key = "'all'")
    public List<VaccineEntity> getAllVaccines() {
        return vaccineRepository.findAll();
    }

    @Cacheable(value = "vaccines", key = "'active'")
    public List<VaccineEntity> getActiveVaccines() {
        return vaccineRepository.findByIsActiveTrueOrderByNameAsc();
    }

    @Transactional
    @CacheEvict(value = "vaccines", allEntries = true)
    public VaccineScheduleConfigEntity createScheduleConfig(Long vaccineId, CreateScheduleConfigRequest request) {
        VaccineEntity vaccine = vaccineRepository.findById(vaccineId)
                .orElseThrow(() -> new ResourceNotFoundException("Vaccine not found with id: " + vaccineId));

        configRepository.findByVaccineIdAndDoseNumber(vaccineId, request.doseNumber())
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Schedule configuration already exists for dose " + request.doseNumber());
                });

        VaccineScheduleConfigEntity config = new VaccineScheduleConfigEntity();
        config.setVaccine(vaccine);
        config.setDoseNumber(request.doseNumber());
        config.setRecommendedAgeMonths(request.recommendedAgeMonths());
        config.setMinDaysSincePreviousDose(request.minDaysSincePreviousDose());

        return configRepository.save(config);
    }

    public List<VaccineScheduleConfigEntity> getScheduleConfigs(Long vaccineId) {
        return configRepository.findByVaccineIdOrderByDoseNumberAsc(vaccineId);
    }
}
