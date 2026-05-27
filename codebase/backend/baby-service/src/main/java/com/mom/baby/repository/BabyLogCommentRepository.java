package com.mom.baby.repository;

import com.mom.baby.domain.BabyLogCommentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BabyLogCommentRepository extends JpaRepository<BabyLogCommentEntity, Long> {

    List<BabyLogCommentEntity> findByBabyLogIdOrderByCreatedAtAsc(Long babyLogId);

    void deleteByBabyLogId(Long babyLogId);
}
