package com.mom.baby.service;

import com.mom.baby.controller.dto.CommentResponse;
import com.mom.baby.controller.dto.CreateCommentRequest;
import com.mom.baby.domain.BabyEntity;
import com.mom.baby.domain.BabyLogCommentEntity;
import com.mom.baby.domain.BabyLogCommentReactionEntity;
import com.mom.baby.domain.BabyLogEntity;
import com.mom.baby.repository.BabyLogCommentReactionRepository;
import com.mom.baby.repository.BabyLogCommentRepository;
import com.mom.baby.repository.BabyLogRepository;
import com.mom.baby.repository.BabyRepository;
import com.mom.common.context.UserContext;
import com.mom.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BabyLogCommentService {

    private final BabyLogCommentRepository commentRepository;
    private final BabyLogRepository babyLogRepository;
    private final BabyLogCommentReactionRepository reactionRepository;
    private final BabyRepository babyRepository;
    private final RestClient.Builder restClientBuilder;

    @Value("${app.notification-service-uri:http://localhost:8098}")
    private String notificationServiceUri;

    @Transactional
    public CommentResponse createComment(Long babyLogId, CreateCommentRequest request) {
        // 1. Kiểm tra tồn tại của dòng nhật ký
        BabyLogEntity babyLog = babyLogRepository.findById(babyLogId)
                .orElseThrow(() -> new ResourceNotFoundException("Baby log not found with id: " + babyLogId));

        Long userId = UserContext.getUserId();
        if (userId == null) {
            throw new IllegalArgumentException("User not authenticated");
        }

        // 2. Nếu là bình luận con (reply), kiểm tra bình luận cha có tồn tại không
        if (request.parentId() != null) {
            BabyLogCommentEntity parentComment = commentRepository.findById(request.parentId())
                    .orElseThrow(() -> new ResourceNotFoundException("Parent comment not found with id: " + request.parentId()));
            
            // Không cho phép phân cấp quá 2 cấp (Chỉ cho phép parentId của cha là null)
            if (parentComment.getParentId() != null) {
                throw new IllegalArgumentException("Comment hierarchy cannot exceed 2 levels");
            }
        }

        BabyLogCommentEntity comment = new BabyLogCommentEntity();
        comment.setBabyLogId(babyLogId);
        comment.setUserId(userId);
        comment.setParentId(request.parentId());
        comment.setContent(request.content());

        BabyLogCommentEntity saved = commentRepository.save(comment);

        // 3. Nếu có tag thành viên, thực hiện bắn thông báo không đồng bộ qua REST call
        if (request.taggedUserIds() != null && !request.taggedUserIds().isEmpty()) {
            sendMentionNotificationsAsync(saved, babyLog.getBabyId(), request.taggedUserIds());
        }

        return mapToResponse(saved, new ArrayList<>(), new HashMap<>(), null);
    }

    @Transactional(readOnly = true)
    public List<CommentResponse> getComments(Long babyLogId) {
        if (!babyLogRepository.existsById(babyLogId)) {
            throw new ResourceNotFoundException("Baby log not found with id: " + babyLogId);
        }

        Long currentUserId = UserContext.getUserId();

        // 1. Lấy toàn bộ bình luận của dòng nhật ký
        List<BabyLogCommentEntity> allComments = commentRepository.findByBabyLogIdOrderByCreatedAtAsc(babyLogId);
        if (allComments.isEmpty()) {
            return new ArrayList<>();
        }

        List<Long> commentIds = allComments.stream().map(BabyLogCommentEntity::getId).toList();

        // 2. Lấy toàn bộ reactions của các comment này để tránh truy vấn N+1
        List<BabyLogCommentReactionEntity> allReactions = reactionRepository.findByCommentIdIn(commentIds);
        Map<Long, List<BabyLogCommentReactionEntity>> reactionsByCommentId = allReactions.stream()
                .collect(Collectors.groupingBy(BabyLogCommentReactionEntity::getCommentId));

        // 3. Phân tách bình luận gốc (Parent) và bình luận trả lời (Child)
        List<BabyLogCommentEntity> parentEntities = allComments.stream()
                .filter(c -> c.getParentId() == null)
                .toList();

        List<BabyLogCommentEntity> childEntities = allComments.stream()
                .filter(c -> c.getParentId() != null)
                .toList();

        Map<Long, List<BabyLogCommentEntity>> childrenByParentId = childEntities.stream()
                .collect(Collectors.groupingBy(BabyLogCommentEntity::getParentId));

        // 4. Map sang cấu trúc cây phân cấp
        List<CommentResponse> result = new ArrayList<>();
        for (BabyLogCommentEntity parent : parentEntities) {
            List<BabyLogCommentEntity> children = childrenByParentId.getOrDefault(parent.getId(), new ArrayList<>());
            
            List<CommentResponse> childResponses = children.stream().map(child -> {
                List<BabyLogCommentReactionEntity> reactions = reactionsByCommentId.getOrDefault(child.getId(), new ArrayList<>());
                return mapToResponse(child, new ArrayList<>(), buildReactionCounts(reactions), getMyReaction(reactions, currentUserId));
            }).collect(Collectors.toList());

            List<BabyLogCommentReactionEntity> parentReactions = reactionsByCommentId.getOrDefault(parent.getId(), new ArrayList<>());
            result.add(mapToResponse(parent, childResponses, buildReactionCounts(parentReactions), getMyReaction(parentReactions, currentUserId)));
        }

        return result;
    }

    @Transactional
    public void deleteComment(Long commentId) {
        BabyLogCommentEntity comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new ResourceNotFoundException("Comment not found with id: " + commentId));

        Long userId = UserContext.getUserId();
        boolean isAdmin = UserContext.isAdmin();

        if (userId == null) {
            throw new IllegalArgumentException("User not authenticated");
        }

        if (!comment.getUserId().equals(userId) && !isAdmin) {
            throw new AccessDeniedException("You do not have permission to delete this comment");
        }

        commentRepository.delete(comment);
    }

    @Transactional
    public void reactComment(Long commentId, String reactionType) {
        if (!commentRepository.existsById(commentId)) {
            throw new ResourceNotFoundException("Comment not found with id: " + commentId);
        }

        Long userId = UserContext.getUserId();
        if (userId == null) {
            throw new IllegalArgumentException("User not authenticated");
        }

        // Kiểm tra xem user đã thả biểu cảm nào cho comment này chưa
        Optional<BabyLogCommentReactionEntity> existingOpt = reactionRepository.findByCommentIdAndUserId(commentId, userId);
        if (existingOpt.isPresent()) {
            BabyLogCommentReactionEntity reaction = existingOpt.get();
            reaction.setReactionType(reactionType.toUpperCase());
            reactionRepository.save(reaction);
        } else {
            BabyLogCommentReactionEntity reaction = new BabyLogCommentReactionEntity();
            reaction.setCommentId(commentId);
            reaction.setUserId(userId);
            reaction.setReactionType(reactionType.toUpperCase());
            reactionRepository.save(reaction);
        }
    }

    @Transactional
    public void unreactComment(Long commentId) {
        Long userId = UserContext.getUserId();
        if (userId == null) {
            throw new IllegalArgumentException("User not authenticated");
        }

        reactionRepository.findByCommentIdAndUserId(commentId, userId)
                .ifPresent(reactionRepository::delete);
    }

    private void sendMentionNotificationsAsync(BabyLogCommentEntity comment, Long babyId, List<Long> taggedUserIds) {
        CompletableFuture.runAsync(() -> {
            try {
                // 1. Truy vấn thông tin của Bé để lấy ra familyId chính xác
                BabyEntity baby = babyRepository.findById(babyId)
                        .orElseThrow(() -> new ResourceNotFoundException("Baby not found"));
                Long familyId = baby.getFamilyId();

                String title = "Bạn được nhắc tên trong bình luận";
                String contentPreview = comment.getContent() != null ? comment.getContent() : "";
                if (contentPreview.length() > 150) {
                    contentPreview = contentPreview.substring(0, 147) + "...";
                }
                String message = String.format("Một thành viên đã nhắc tên bạn trong nhật ký của bé %s: \"%s\"", baby.getName(), contentPreview);

                RestClient restClient = restClientBuilder.build();

                for (Long taggedUserId : taggedUserIds) {
                    // Tránh tự gửi thông báo cho chính bản thân mình
                    if (comment.getUserId().equals(taggedUserId)) {
                        continue;
                    }

                    Map<String, Object> payload = new HashMap<>();
                    payload.put("familyId", familyId);
                    payload.put("userId", taggedUserId);
                    payload.put("channel", "PUSH");
                    payload.put("type", "INFO");
                    payload.put("title", title);
                    payload.put("message", message);

                    restClient.post()
                            .uri(notificationServiceUri + "/api/notifications")
                            .header("X-User-Id", String.valueOf(comment.getUserId()))
                            .header("X-Family-Ids", String.valueOf(familyId))
                            .header("X-User-Admin", String.valueOf(UserContext.isAdmin()))
                            .body(payload)
                            .retrieve()
                            .toBodilessEntity();
                    
                    log.info("Sent mention notification to userId={} for commentId={}", taggedUserId, comment.getId());
                }
            } catch (Exception ex) {
                log.error("Failed to send mention notifications for commentId={}: {}", comment.getId(), ex.getMessage());
            }
        });
    }

    private CommentResponse mapToResponse(BabyLogCommentEntity entity, List<CommentResponse> replies, Map<String, Long> reactionCounts, String myReaction) {
        return new CommentResponse(
                entity.getId(),
                entity.getBabyLogId(),
                entity.getUserId(),
                entity.getContent(),
                entity.getCreatedAt(),
                entity.getParentId(),
                replies,
                reactionCounts,
                myReaction
        );
    }

    private Map<String, Long> buildReactionCounts(List<BabyLogCommentReactionEntity> reactions) {
        return reactions.stream()
                .collect(Collectors.groupingBy(BabyLogCommentReactionEntity::getReactionType, Collectors.counting()));
    }

    private String getMyReaction(List<BabyLogCommentReactionEntity> reactions, Long currentUserId) {
        if (currentUserId == null) {
            return null;
        }
        return reactions.stream()
                .filter(r -> currentUserId.equals(r.getUserId()))
                .map(BabyLogCommentReactionEntity::getReactionType)
                .findFirst()
                .orElse(null);
    }
}
