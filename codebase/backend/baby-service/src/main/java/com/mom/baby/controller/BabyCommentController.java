package com.mom.baby.controller;

import com.mom.baby.controller.dto.CommentResponse;
import com.mom.baby.controller.dto.CreateCommentRequest;
import com.mom.baby.service.BabyLogCommentService;
import com.mom.common.dto.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/babies")
@RequiredArgsConstructor
public class BabyCommentController {

    private final BabyLogCommentService commentService;

    @PostMapping("/logs/{logId}/comments")
    public ApiResponse<CommentResponse> createComment(
            @PathVariable("logId") Long logId,
            @Valid @RequestBody CreateCommentRequest request
    ) {
        return ApiResponse.ok("Comment created", commentService.createComment(logId, request));
    }

    @GetMapping("/logs/{logId}/comments")
    public ApiResponse<List<CommentResponse>> getComments(@PathVariable("logId") Long logId) {
        return ApiResponse.ok("Success", commentService.getComments(logId));
    }

    @DeleteMapping("/logs/comments/{commentId}")
    public ApiResponse<Object> deleteComment(@PathVariable("commentId") Long commentId) {
        commentService.deleteComment(commentId);
        return ApiResponse.ok("Comment deleted", null);
    }

    @PostMapping("/logs/comments/{commentId}/react")
    public ApiResponse<Object> reactComment(
            @PathVariable("commentId") Long commentId,
            @RequestParam("type") String reactionType
    ) {
        commentService.reactComment(commentId, reactionType);
        return ApiResponse.ok("Reaction submitted", null);
    }

    @DeleteMapping("/logs/comments/{commentId}/react")
    public ApiResponse<Object> unreactComment(@PathVariable("commentId") Long commentId) {
        commentService.unreactComment(commentId);
        return ApiResponse.ok("Reaction removed", null);
    }
}
