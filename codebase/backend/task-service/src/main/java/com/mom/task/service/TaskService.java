package com.mom.task.service;

import com.mom.common.exception.ResourceNotFoundException;
import com.mom.task.controller.dto.CreateRecurringTaskRequest;
import com.mom.task.controller.dto.CreateTaskCategoryRequest;
import com.mom.task.controller.dto.CreateTaskRequest;
import com.mom.task.controller.dto.RecurringTaskResponse;
import com.mom.task.controller.dto.TaskCategoryResponse;
import com.mom.task.controller.dto.TaskPendingCountResponse;
import com.mom.task.controller.dto.TaskResponse;
import com.mom.task.controller.dto.UpdateTaskRequest;
import com.mom.task.domain.RecurringTaskEntity;
import com.mom.task.domain.TaskCategoryEntity;
import com.mom.task.domain.TaskEntity;
import com.mom.task.domain.TaskStatus;
import com.mom.task.event.TaskChangedPayload;
import com.mom.task.event.TaskEventPublisher;
import com.mom.task.repository.RecurringTaskRepository;
import com.mom.task.repository.TaskCategoryRepository;
import com.mom.task.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TaskService {

    private final TaskCategoryRepository taskCategoryRepository;
    private final TaskRepository taskRepository;
    private final RecurringTaskRepository recurringTaskRepository;
    private final TaskEventPublisher taskEventPublisher;

    @Transactional
    public TaskCategoryResponse createCategory(CreateTaskCategoryRequest request) {
        if (taskCategoryRepository.existsByFamilyIdAndNameIgnoreCase(request.familyId(), request.name().trim())) {
            throw new IllegalArgumentException("Task category name already exists in this family");
        }
        TaskCategoryEntity category = new TaskCategoryEntity();
        category.setFamilyId(request.familyId());
        category.setName(request.name().trim());
        category.setColorCode(normalizeColor(request.colorCode()));
        return toTaskCategoryResponse(taskCategoryRepository.save(category));
    }

    public List<TaskCategoryResponse> getCategories(Long familyId) {
        return taskCategoryRepository.findByFamilyIdOrderByNameAsc(familyId).stream()
                .map(this::toTaskCategoryResponse)
                .toList();
    }

    @Transactional
    @CacheEvict(value = "task-pending-count", allEntries = true)
    public TaskResponse createTask(CreateTaskRequest request) {
        if (request.categoryId() != null) {
            validateCategoryBelongsToFamily(request.categoryId(), request.familyId());
        }

        TaskEntity task = new TaskEntity();
        task.setFamilyId(request.familyId());
        task.setTitle(request.title().trim());
        task.setDescription(trimToNull(request.description()));
        task.setCategoryId(request.categoryId());
        task.setAssigneeUserId(request.assigneeUserId());
        task.setDueAt(request.dueAt());
        task.setStatus(TaskStatus.PENDING);
        TaskEntity saved = taskRepository.save(task);

        taskEventPublisher.publishTaskCreated(toTaskChangedPayload(saved));
        return toTaskResponse(saved, getCategoryName(saved.getCategoryId()));
    }

    public TaskResponse getTask(Long taskId) {
        TaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        return toTaskResponse(task, getCategoryName(task.getCategoryId()));
    }

    public List<TaskResponse> getTasks(Long familyId, TaskStatus status, Long assigneeUserId) {
        List<TaskEntity> tasks;
        if (status != null && assigneeUserId != null) {
            tasks = taskRepository.findByFamilyIdAndStatusAndAssigneeUserIdOrderByDueAtAscCreatedAtDesc(
                    familyId,
                    status,
                    assigneeUserId
            );
        } else if (status != null) {
            tasks = taskRepository.findByFamilyIdAndStatusOrderByDueAtAscCreatedAtDesc(familyId, status);
        } else if (assigneeUserId != null) {
            tasks = taskRepository.findByFamilyIdAndAssigneeUserIdOrderByDueAtAscCreatedAtDesc(familyId, assigneeUserId);
        } else {
            tasks = taskRepository.findByFamilyIdOrderByDueAtAscCreatedAtDesc(familyId);
        }

        Map<Long, String> categoryNames = loadCategoryNames(tasks.stream()
                .map(TaskEntity::getCategoryId)
                .collect(Collectors.toSet()));
        return tasks.stream()
                .map(task -> toTaskResponse(task, categoryNames.getOrDefault(task.getCategoryId(), null)))
                .toList();
    }

    @Transactional
    @CacheEvict(value = "task-pending-count", allEntries = true)
    public TaskResponse updateTask(Long taskId, UpdateTaskRequest request) {
        TaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        TaskStatus previousStatus = task.getStatus();

        if (request.title() != null) {
            task.setTitle(request.title().trim());
        }
        if (request.description() != null) {
            task.setDescription(trimToNull(request.description()));
        }
        if (request.categoryId() != null) {
            validateCategoryBelongsToFamily(request.categoryId(), task.getFamilyId());
            task.setCategoryId(request.categoryId());
        }
        if (request.assigneeUserId() != null) {
            task.setAssigneeUserId(request.assigneeUserId());
        }
        if (request.dueAt() != null) {
            task.setDueAt(request.dueAt());
        }
        if (request.status() != null) {
            task.setStatus(request.status());
            if (request.status() == TaskStatus.DONE) {
                task.setCompletedAt(OffsetDateTime.now());
            } else {
                task.setCompletedAt(null);
            }
        }

        TaskEntity saved = taskRepository.save(task);
        if (previousStatus != TaskStatus.DONE && saved.getStatus() == TaskStatus.DONE) {
            taskEventPublisher.publishTaskCompleted(toTaskChangedPayload(saved));
        }
        return toTaskResponse(saved, getCategoryName(saved.getCategoryId()));
    }

    @Transactional
    @CacheEvict(value = "task-pending-count", allEntries = true)
    public TaskResponse completeTask(Long taskId) {
        TaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));

        if (task.getStatus() != TaskStatus.DONE) {
            task.setStatus(TaskStatus.DONE);
            task.setCompletedAt(OffsetDateTime.now());
            task = taskRepository.save(task);
            taskEventPublisher.publishTaskCompleted(toTaskChangedPayload(task));
        }
        return toTaskResponse(task, getCategoryName(task.getCategoryId()));
    }

    @Transactional
    @CacheEvict(value = "task-pending-count", allEntries = true)
    public void deleteTask(Long taskId) {
        TaskEntity task = taskRepository.findById(taskId)
                .orElseThrow(() -> new ResourceNotFoundException("Task not found"));
        taskRepository.delete(task);
    }

    @Cacheable(value = "task-pending-count", key = "#familyId")
    public TaskPendingCountResponse getPendingCount(Long familyId) {
        long pendingCount = taskRepository.countByFamilyIdAndStatus(familyId, TaskStatus.PENDING);
        return new TaskPendingCountResponse(familyId, pendingCount);
    }

    @Transactional
    public RecurringTaskResponse createRecurringTask(CreateRecurringTaskRequest request) {
        if (request.categoryId() != null) {
            validateCategoryBelongsToFamily(request.categoryId(), request.familyId());
        }

        RecurringTaskEntity recurringTask = new RecurringTaskEntity();
        recurringTask.setFamilyId(request.familyId());
        recurringTask.setTitle(request.title().trim());
        recurringTask.setDescription(trimToNull(request.description()));
        recurringTask.setCategoryId(request.categoryId());
        recurringTask.setAssigneeUserId(request.assigneeUserId());
        recurringTask.setRecurrenceRule(request.recurrenceRule().trim());
        recurringTask.setNextRunAt(request.nextRunAt());
        recurringTask.setActive(request.active() == null || request.active());
        RecurringTaskEntity saved = recurringTaskRepository.save(recurringTask);
        return toRecurringTaskResponse(saved, getCategoryName(saved.getCategoryId()));
    }

    public List<RecurringTaskResponse> getRecurringTasks(Long familyId) {
        List<RecurringTaskEntity> recurringTasks = recurringTaskRepository.findByFamilyIdOrderByCreatedAtDesc(familyId);
        Map<Long, String> categoryNames = loadCategoryNames(recurringTasks.stream()
                .map(RecurringTaskEntity::getCategoryId)
                .collect(Collectors.toSet()));
        return recurringTasks.stream()
                .map(task -> toRecurringTaskResponse(task, categoryNames.getOrDefault(task.getCategoryId(), null)))
                .toList();
    }

    private void validateCategoryBelongsToFamily(Long categoryId, Long familyId) {
        TaskCategoryEntity category = taskCategoryRepository.findById(categoryId)
                .orElseThrow(() -> new ResourceNotFoundException("Task category not found"));
        if (!category.getFamilyId().equals(familyId)) {
            throw new IllegalArgumentException("Task category does not belong to this family");
        }
    }

    private String getCategoryName(Long categoryId) {
        if (categoryId == null) {
            return null;
        }
        return taskCategoryRepository.findById(categoryId)
                .map(TaskCategoryEntity::getName)
                .orElse(null);
    }

    private Map<Long, String> loadCategoryNames(Set<Long> categoryIds) {
        Set<Long> filteredIds = categoryIds.stream()
                .filter(id -> id != null)
                .collect(Collectors.toSet());
        return taskCategoryRepository.findAllById(filteredIds).stream()
                .collect(Collectors.toMap(TaskCategoryEntity::getId, TaskCategoryEntity::getName));
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeColor(String colorCode) {
        if (colorCode == null || colorCode.isBlank()) {
            return null;
        }
        String trimmed = colorCode.trim().toUpperCase();
        return trimmed.startsWith("#") ? trimmed : "#" + trimmed;
    }

    private TaskCategoryResponse toTaskCategoryResponse(TaskCategoryEntity category) {
        return new TaskCategoryResponse(
                category.getId(),
                category.getFamilyId(),
                category.getName(),
                category.getColorCode()
        );
    }

    private TaskResponse toTaskResponse(TaskEntity task, String categoryName) {
        return new TaskResponse(
                task.getId(),
                task.getFamilyId(),
                task.getTitle(),
                task.getDescription(),
                task.getCategoryId(),
                categoryName,
                task.getStatus(),
                task.getAssigneeUserId(),
                task.getDueAt(),
                task.getCompletedAt()
        );
    }

    private RecurringTaskResponse toRecurringTaskResponse(RecurringTaskEntity recurringTask, String categoryName) {
        return new RecurringTaskResponse(
                recurringTask.getId(),
                recurringTask.getFamilyId(),
                recurringTask.getTitle(),
                recurringTask.getDescription(),
                recurringTask.getCategoryId(),
                categoryName,
                recurringTask.getAssigneeUserId(),
                recurringTask.getRecurrenceRule(),
                recurringTask.getNextRunAt(),
                recurringTask.isActive()
        );
    }

    private TaskChangedPayload toTaskChangedPayload(TaskEntity task) {
        return new TaskChangedPayload(
                task.getId(),
                task.getFamilyId(),
                task.getTitle(),
                task.getStatus(),
                task.getAssigneeUserId(),
                task.getDueAt(),
                task.getCompletedAt()
        );
    }
}
