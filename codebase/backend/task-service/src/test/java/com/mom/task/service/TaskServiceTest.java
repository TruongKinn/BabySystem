package com.mom.task.service;

import com.mom.common.context.UserContext;
import com.mom.task.controller.dto.CreateTaskRequest;
import com.mom.task.controller.dto.TaskOverviewResponse;
import com.mom.task.domain.TaskStatus;
import com.mom.task.event.TaskEventPublisher;
import com.mom.task.repository.RecurringTaskRepository;
import com.mom.task.repository.TaskCategoryRepository;
import com.mom.task.repository.TaskRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock
    private TaskCategoryRepository taskCategoryRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private RecurringTaskRepository recurringTaskRepository;

    @Mock
    private TaskEventPublisher taskEventPublisher;

    @InjectMocks
    private TaskService taskService;

    @BeforeEach
    void setUpUserContext() {
        UserContext.setFamilyIds(List.of(1L));
    }

    @AfterEach
    void clearUserContext() {
        UserContext.clear();
    }

    @Test
    void getOverviewShouldReturnAggregatedMetrics() {
        Long familyId = 1L;
        when(taskRepository.countByFamilyId(familyId)).thenReturn(10L);
        when(taskRepository.countByFamilyIdAndStatus(familyId, TaskStatus.PENDING)).thenReturn(4L);
        when(taskRepository.countByFamilyIdAndStatus(familyId, TaskStatus.IN_PROGRESS)).thenReturn(3L);
        when(taskRepository.countByFamilyIdAndStatus(familyId, TaskStatus.DONE)).thenReturn(3L);
        when(taskRepository.countByFamilyIdAndAssigneeUserIdIsNull(familyId)).thenReturn(2L);
        when(taskRepository.countByFamilyIdAndStatusInAndDueAtBefore(eq(familyId), anyCollection(), any(OffsetDateTime.class)))
                .thenReturn(2L);
        when(taskRepository.countByFamilyIdAndStatusInAndDueAtGreaterThanEqualAndDueAtLessThan(
                eq(familyId),
                anyCollection(),
                any(OffsetDateTime.class),
                any(OffsetDateTime.class)
        )).thenReturn(3L);

        TaskOverviewResponse response = taskService.getOverview(familyId);

        assertEquals(familyId, response.familyId());
        assertEquals(10L, response.totalTasks());
        assertEquals(4L, response.pendingTasks());
        assertEquals(3L, response.inProgressTasks());
        assertEquals(3L, response.doneTasks());
        assertEquals(2L, response.overdueTasks());
        assertEquals(3L, response.dueTodayTasks());
        assertEquals(2L, response.unassignedTasks());
        assertEquals(30.0, response.completionRate());
    }

    @Test
    void createTaskShouldRejectBlankTitle() {
        CreateTaskRequest request = new CreateTaskRequest(1L, "   ", null, null, null, null, null);
        assertThrows(IllegalArgumentException.class, () -> taskService.createTask(request));
    }
}
