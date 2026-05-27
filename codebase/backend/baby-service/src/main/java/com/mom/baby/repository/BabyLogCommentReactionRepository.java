package com.mom.baby.repository;

import com.mom.baby.domain.BabyLogCommentReactionEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BabyLogCommentReactionRepository extends JpaRepository<BabyLogCommentReactionEntity, Long> {

    List<BabyLogCommentReactionEntity> findByCommentId(Long commentId);

    Optional<BabyLogCommentReactionEntity> findByCommentIdAndUserId(Long commentId, Long userId);

    List<BabyLogCommentReactionEntity> findByCommentIdIn(List<Long> commentIds);

    void deleteByCommentId(Long commentId);
}
