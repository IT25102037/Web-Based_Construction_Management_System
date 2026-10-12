package sliit.construction.construction;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import sliit.construction.construction.dto.NotificationDtos;
import sliit.construction.construction.dto.TaskDtos;
import sliit.construction.construction.entity.*;
import sliit.construction.construction.event.TaskBlockedEvent;
import sliit.construction.construction.event.TaskEventListener;
import sliit.construction.construction.repository.*;
import sliit.construction.construction.service.NotificationService;
import sliit.construction.construction.service.TaskServiceImpl;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TaskObserverPatternUnitTest {

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TaskAssignmentRepository taskAssignmentRepository;

    @Mock
    private ProgressReportRepository progressReportRepository;

    @Mock
    private ProgressIssueRepository progressIssueRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    @Mock
    private NotificationService notificationService;

    private TaskServiceImpl taskService;
    private TaskEventListener taskEventListener;

    private User manager;
    private User assignee;
    private Project project;
    private Task existingTask;

    @BeforeEach
    void setUp() {
        taskService = new TaskServiceImpl(
                taskRepository,
                projectRepository,
                userRepository,
                taskAssignmentRepository,
                progressReportRepository,
                progressIssueRepository,
                eventPublisher
        );

        taskEventListener = new TaskEventListener(notificationService);

        manager = new User();
        manager.setId(10L);
        manager.setFullName("John Manager");
        manager.setUsername("manager1");
        manager.setEmail("manager@construction.com");

        assignee = new User();
        assignee.setId(20L);
        assignee.setFullName("Bob Builder");
        assignee.setUsername("worker1");

        project = new Project();
        project.setId(100L);
        project.setName("Sky Tower Project");
        project.setManager(manager);

        existingTask = new Task();
        existingTask.setId(500L);
        existingTask.setTitle("Excavation Work");
        existingTask.setDescription("Initial soil excavation");
        existingTask.setDeadline(LocalDate.now().plusDays(10));
        existingTask.setPriority(TaskPriority.HIGH);
        existingTask.setStatus(TaskStatus.TODO);
        existingTask.setProject(project);
        existingTask.setAssignee(assignee);
    }

    @Test
    @DisplayName("Observer Pattern: TaskEventListener should create notification for project manager when TaskBlockedEvent is handled")
    void testTaskEventListener_CreatesNotificationForManager() {
        // Arrange
        existingTask.setStatus(TaskStatus.BLOCKED);
        TaskBlockedEvent event = new TaskBlockedEvent(existingTask);

        // Act
        taskEventListener.handleTaskBlockedEvent(event);

        // Assert
        ArgumentCaptor<NotificationDtos.Request> requestCaptor = ArgumentCaptor.forClass(NotificationDtos.Request.class);
        verify(notificationService, times(1)).create(requestCaptor.capture());

        NotificationDtos.Request captured = requestCaptor.getValue();
        assertEquals(10L, captured.recipientId(), "Notification recipient must be project manager ID");
        assertTrue(captured.title().contains("Task Blocked"), "Title should indicate Task Blocked");
        assertTrue(captured.title().contains("Excavation Work"), "Title should contain task title");
        assertTrue(captured.message().contains("Sky Tower Project"), "Message should mention project name");
        assertTrue(captured.message().contains("BLOCKED"), "Message should mention BLOCKED status");
        assertEquals("TASK_BLOCKED:500", captured.type());
    }

    @Test
    @DisplayName("Observer Pattern: TaskEventListener should safely skip notification if project manager is missing")
    void testTaskEventListener_SkipsWhenManagerMissing() {
        // Arrange
        project.setManager(null);
        TaskBlockedEvent event = new TaskBlockedEvent(existingTask);

        // Act
        taskEventListener.handleTaskBlockedEvent(event);

        // Assert
        verify(notificationService, never()).create(any());
    }

    @Test
    @DisplayName("Subject (TaskServiceImpl): Status changed to BLOCKED in update triggers TaskBlockedEvent publication")
    void testUpdateTask_StatusChangesToBlocked_PublishesEvent() {
        // Arrange
        TaskDtos.Request updateRequest = new TaskDtos.Request(
                "Excavation Work",
                "Soil issues encountered",
                LocalDate.now().plusDays(10),
                TaskPriority.HIGH,
                TaskStatus.BLOCKED,
                100L,
                20L
        );

        when(taskRepository.findById(500L)).thenReturn(Optional.of(existingTask));
        when(projectRepository.findById(100L)).thenReturn(Optional.of(project));
        when(userRepository.findById(20L)).thenReturn(Optional.of(assignee));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        taskService.update(500L, updateRequest);

        // Assert
        ArgumentCaptor<TaskBlockedEvent> eventCaptor = ArgumentCaptor.forClass(TaskBlockedEvent.class);
        verify(eventPublisher, times(1)).publishEvent(eventCaptor.capture());

        TaskBlockedEvent publishedEvent = eventCaptor.getValue();
        assertNotNull(publishedEvent);
        assertEquals(500L, publishedEvent.getTaskId());
        assertEquals(10L, publishedEvent.getManagerId());
        assertEquals("Sky Tower Project", publishedEvent.getProjectName());
    }

    @Test
    @DisplayName("Subject (TaskServiceImpl): Duplicate prevention - already BLOCKED status does NOT republish event")
    void testUpdateTask_AlreadyBlocked_DoesNotPublishDuplicateEvent() {
        // Arrange: task is already BLOCKED
        existingTask.setStatus(TaskStatus.BLOCKED);

        TaskDtos.Request updateRequest = new TaskDtos.Request(
                "Excavation Work - Updated Description",
                "Still blocked by weather",
                LocalDate.now().plusDays(10),
                TaskPriority.HIGH,
                TaskStatus.BLOCKED,
                100L,
                20L
        );

        when(taskRepository.findById(500L)).thenReturn(Optional.of(existingTask));
        when(projectRepository.findById(100L)).thenReturn(Optional.of(project));
        when(userRepository.findById(20L)).thenReturn(Optional.of(assignee));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        taskService.update(500L, updateRequest);

        // Assert: NO event should be published because status was already BLOCKED
        verify(eventPublisher, never()).publishEvent(any(TaskBlockedEvent.class));
    }

    @Test
    @DisplayName("Subject (TaskServiceImpl): Status changes from BLOCKED to COMPLETED does NOT publish TaskBlockedEvent")
    void testUpdateTask_StatusChangesToCompleted_DoesNotPublishEvent() {
        // Arrange: task was BLOCKED, now changing to COMPLETED
        existingTask.setStatus(TaskStatus.BLOCKED);

        TaskDtos.Request updateRequest = new TaskDtos.Request(
                "Excavation Work",
                "Work resolved and completed",
                LocalDate.now().plusDays(10),
                TaskPriority.HIGH,
                TaskStatus.COMPLETED,
                100L,
                20L
        );

        when(taskRepository.findById(500L)).thenReturn(Optional.of(existingTask));
        when(projectRepository.findById(100L)).thenReturn(Optional.of(project));
        when(userRepository.findById(20L)).thenReturn(Optional.of(assignee));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Act
        taskService.update(500L, updateRequest);

        // Assert: NO TaskBlockedEvent published
        verify(eventPublisher, never()).publishEvent(any(TaskBlockedEvent.class));
    }

    @Test
    @DisplayName("Subject (TaskServiceImpl): Creating task directly with BLOCKED status publishes TaskBlockedEvent")
    void testCreateTask_DirectlyBlocked_PublishesEvent() {
        // Arrange
        TaskDtos.Request createRequest = new TaskDtos.Request(
                "New Blocked Task",
                "Started blocked",
                LocalDate.now().plusDays(5),
                TaskPriority.HIGH,
                TaskStatus.BLOCKED,
                100L,
                20L
        );

        when(projectRepository.findById(100L)).thenReturn(Optional.of(project));
        when(userRepository.findById(20L)).thenReturn(Optional.of(assignee));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> {
            Task t = invocation.getArgument(0);
            t.setId(999L);
            return t;
        });

        // Act
        taskService.create(createRequest);

        // Assert
        verify(eventPublisher, times(1)).publishEvent(any(TaskBlockedEvent.class));
    }

    @Test
    @DisplayName("Subject (TaskServiceImpl): Creating task with TODO status does NOT publish TaskBlockedEvent")
    void testCreateTask_WithTodoStatus_DoesNotPublishEvent() {
        // Arrange
        TaskDtos.Request createRequest = new TaskDtos.Request(
                "Regular Task",
                "Starting normally",
                LocalDate.now().plusDays(5),
                TaskPriority.MEDIUM,
                TaskStatus.TODO,
                100L,
                20L
        );

        when(projectRepository.findById(100L)).thenReturn(Optional.of(project));
        when(userRepository.findById(20L)).thenReturn(Optional.of(assignee));
        when(taskRepository.save(any(Task.class))).thenAnswer(invocation -> {
            Task t = invocation.getArgument(0);
            t.setId(999L);
            return t;
        });

        // Act
        taskService.create(createRequest);

        // Assert
        verify(eventPublisher, never()).publishEvent(any(TaskBlockedEvent.class));
    }
}
