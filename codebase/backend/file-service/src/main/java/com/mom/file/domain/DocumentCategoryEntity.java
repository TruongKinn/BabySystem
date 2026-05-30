package com.mom.file.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Table(name = "document_category")
@Getter
@Setter
public class DocumentCategoryEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "family_id")
    private Long familyId;

    @Column(nullable = false)
    private String name;

    private String icon;

    private String color;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;
}
