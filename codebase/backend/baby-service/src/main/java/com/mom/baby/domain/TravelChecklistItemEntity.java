package com.mom.baby.domain;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "travel_checklist_items")
public class TravelChecklistItemEntity {

    @Id
    @Column(name = "id", length = 50, nullable = false)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_id", nullable = false)
    @JsonIgnore
    private TravelPlanEntity plan;

    @Column(name = "task", nullable = false)
    private String task;

    @Column(name = "category", length = 50, nullable = false)
    private String category;

    @Column(name = "completed", nullable = false)
    private Boolean completed = false;
}
