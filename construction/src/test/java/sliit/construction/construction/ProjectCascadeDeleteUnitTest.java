package sliit.construction.construction;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import sliit.construction.construction.entity.Project;
import sliit.construction.construction.entity.Task;
import sliit.construction.construction.repository.*;
import sliit.construction.construction.service.ProjectServiceImpl;
import sliit.construction.construction.service.TaskServiceImpl;

import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class ProjectCascadeDeleteUnitTest {

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private TaskAssignmentRepository taskAssignmentRepository;

    @Mock
    private ProgressReportRepository progressReportRepository;

    @Mock
    private ProgressIssueRepository progressIssueRepository;

    @Mock
    private MilestoneRepository milestoneRepository;

    @Mock
    private DocumentRepository documentRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private ProjectServiceImpl projectService;

    @InjectMocks
    private TaskServiceImpl taskService;

    private Project testProject;
    private Task task1;
    private Task task2;

    @BeforeEach
    void setUp() {
        testProject = new Project();
        testProject.setId(10L);
        testProject.setName("Highway Construction Project");

        task1 = new Task();
        task1.setId(101L);
        task1.setTitle("Task 1 - Surveying");
        task1.setProject(testProject);

        task2 = new Task();
        task2.setId(102L);
        task2.setTitle("Task 2 - Foundation");
        task2.setProject(testProject);
    }

    @Test
    @DisplayName("Should successfully cascade-delete tasks, assignments, reports, issues, milestones, and documents when project is deleted")
    void testDeleteProject_CascadesAllRelatedEntities() {
        // Arrange
        when(projectRepository.findById(10L)).thenReturn(Optional.of(testProject));
        when(taskRepository.findByProjectId(10L)).thenReturn(List.of(task1, task2));

        // Act
        projectService.delete(10L);

        // Assert - Task related cascades
        verify(taskAssignmentRepository, times(1)).deleteByTaskIdIn(List.of(101L, 102L));
        verify(progressReportRepository, times(1)).deleteByTaskIdIn(List.of(101L, 102L));
        verify(progressIssueRepository, times(1)).deleteByTaskIdIn(List.of(101L, 102L));
        verify(taskRepository, times(1)).deleteByProjectId(10L);

        // Assert - Project related cascades
        verify(progressReportRepository, times(1)).deleteByProjectId(10L);
        verify(progressIssueRepository, times(1)).deleteByProjectId(10L);
        verify(milestoneRepository, times(1)).deleteByProjectId(10L);
        verify(documentRepository, times(1)).deleteByProjectId(10L);

        // Assert - Project deletion
        verify(projectRepository, times(1)).delete(testProject);
    }

    @Test
    @DisplayName("Should successfully delete project even when no tasks are assigned")
    void testDeleteProject_WhenNoTasksAssigned() {
        // Arrange
        when(projectRepository.findById(10L)).thenReturn(Optional.of(testProject));
        when(taskRepository.findByProjectId(10L)).thenReturn(List.of());

        // Act
        projectService.delete(10L);

        // Assert - Task bulk deletes should not be triggered if task list is empty
        verify(taskAssignmentRepository, never()).deleteByTaskIdIn(any());

        // Assert - Project level cleanups should still occur
        verify(progressReportRepository, times(1)).deleteByProjectId(10L);
        verify(progressIssueRepository, times(1)).deleteByProjectId(10L);
        verify(milestoneRepository, times(1)).deleteByProjectId(10L);
        verify(documentRepository, times(1)).deleteByProjectId(10L);
        verify(projectRepository, times(1)).delete(testProject);
    }

    @Test
    @DisplayName("Should successfully clean up assignments, reports, and issues when a single task is deleted")
    void testDeleteTask_CleansUpAssignmentsReportsAndIssues() {
        // Arrange
        when(taskRepository.findById(101L)).thenReturn(Optional.of(task1));

        // Act
        taskService.delete(101L);

        // Assert
        verify(taskAssignmentRepository, times(1)).deleteByTaskId(101L);
        verify(progressReportRepository, times(1)).deleteByTaskId(101L);
        verify(progressIssueRepository, times(1)).deleteByTaskId(101L);
        verify(taskRepository, times(1)).delete(task1);
    }
}
