package com.mom.baby.domain;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@Entity
@Table(name = "travel_plans")
public class TravelPlanEntity {

    @Id
    @Column(name = "id", length = 50, nullable = false)
    private String id;

    @Column(name = "family_id", nullable = false)
    private Long familyId;

    @Column(name = "title", length = 100, nullable = false)
    private String title;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "ai_ideas", columnDefinition = "TEXT")
    private String aiIdeas;

    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true, fetch = jakarta.persistence.FetchType.EAGER)
    private List<TravelDestinationEntity> destinations = new ArrayList<>();

    @OneToMany(mappedBy = "plan", cascade = CascadeType.ALL, orphanRemoval = true, fetch = jakarta.persistence.FetchType.EAGER)
    private List<TravelChecklistItemEntity> checklist = new ArrayList<>();

    public void setDestinations(List<TravelDestinationEntity> destinations) {
        this.destinations.clear();
        if (destinations != null) {
            destinations.forEach(d -> d.setPlan(this));
            this.destinations.addAll(destinations);
        }
    }

    public void setChecklist(List<TravelChecklistItemEntity> checklist) {
        this.checklist.clear();
        if (checklist != null) {
            checklist.forEach(c -> c.setPlan(this));
            this.checklist.addAll(checklist);
        }
    }
}
