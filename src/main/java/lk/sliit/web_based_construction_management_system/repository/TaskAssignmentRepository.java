package lk.sliit.web_based_construction_management_system.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import sliit.construction.construction.entity.AssignmentStatus;
import sliit.construction.construction.entity.TaskAssignment;

import java.util.Optional;

public interface TaskAssignmentRepository
        extends JpaRepository<TaskAssignment, Long> {

    Page<TaskAssignment> findByTaskId(
            Long taskId,
            Pageable pageable
    );

    Page<TaskAssignment> findByStaffId(
            Long staffId,
            Pageable pageable
    );

    Page<TaskAssignment> findByStatus(
            AssignmentStatus status,
            Pageable pageable
    );

    Page<TaskAssignment> findByTaskIdAndStatus(
            Long taskId,
            AssignmentStatus status,
            Pageable pageable
    );

    boolean existsByTaskIdAndStaffId(
            Long taskId,
            Long staffId
    );

    boolean existsByTaskIdAndStaffIdAndIdNot(
            Long taskId,
            Long staffId,
            Long id
    );

    Optional<TaskAssignment> findByTaskIdAndStaffId(
            Long taskId,
            Long staffId
    );

    long countByStatus(
            AssignmentStatus status
    );

    void deleteByTaskId(
            Long taskId
    );

    void deleteByTaskIdIn(
            java.util.List<Long> taskIds
    );

    void deleteByStaffId(
            Long staffId
    );

    void deleteByStaff(
            sliit.construction.construction.entity.User staff
    );
}