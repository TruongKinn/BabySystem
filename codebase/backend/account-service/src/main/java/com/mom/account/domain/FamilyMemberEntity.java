package com.mom.account.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.OffsetDateTime;

@Getter
@Setter
@Entity
@Table(name = "family_members")
public class FamilyMemberEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "family_id", nullable = false)
    private Long familyId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FamilyRole role;

    @Enumerated(EnumType.STRING)
    @Column(name = "relation", nullable = false)
    private FamilyRelation relation = FamilyRelation.THANH_VIEN_KHAC;

    @Column(name = "parent_user_id")
    private Long parentUserId;

    @Column(name = "joined_at", nullable = false)
    private OffsetDateTime joinedAt = OffsetDateTime.now();

    @Column(name = "is_host", nullable = false)
    private Boolean isHost = false;
}
