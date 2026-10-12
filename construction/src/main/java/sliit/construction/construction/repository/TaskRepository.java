package sliit.construction.construction.repository;

import sliit.construction.construction.entity.Task;
import sliit.construction.construction.entity.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TaskRepository extends JpaRepository<Task, Long> {

    @EntityGraph(attributePaths = {"project", "assignee"})
    Page<Task> findAll(Pageable pageable);

    @EntityGraph(attributePaths = {"project", "assignee"})
    Optional<Task> findById(Long id);

    @EntityGraph(attributePaths = {"project", "assignee"})
    Page<Task> findByProjectId(Long projectId, Pageable pageable);

    @EntityGraph(attributePaths = {"project", "assignee"})
    Page<Task> findByAssigneeId(Long userId, Pageable pageable);

    @EntityGraph(attributePaths = {"project", "assignee"})
    Page<Task> findByStatus(TaskStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"project", "assignee"})
    Page<Task> findByProjectIdAndStatus(Long projectId, TaskStatus status, Pageable pageable);

    java.util.List<Task> findByProjectId(Long projectId);

    java.util.List<Task> findByAssignee(sliit.construction.construction.entity.User assignee);

    java.util.List<Task> findByAssigneeId(Long assigneeId);

    void deleteByProjectId(Long projectId);
}
