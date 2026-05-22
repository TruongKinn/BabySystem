package com.mom.account.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
@Table(name = "family_quest_reward_redemptions")
public class FamilyQuestRewardRedemptionEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "family_id", nullable = false)
    private Long familyId;

    @Column(name = "reward_key", nullable = false, length = 120)
    private String rewardKey;

    @Column(name = "reward_name", nullable = false, length = 200)
    private String rewardName;

    @Column(name = "cost_points", nullable = false)
    private Integer costPoints;

    @Column(name = "redeemed_by_user_id")
    private Long redeemedByUserId;

    @Column(name = "redeemed_at", nullable = false)
    private OffsetDateTime redeemedAt = OffsetDateTime.now();
}
