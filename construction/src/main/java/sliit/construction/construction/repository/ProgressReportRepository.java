package sliit.construction.construction.repository;

import sliit.construction.construction.entity.ProgressReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.lang.NonNull;

import java.util.Optional;

public interface ProgressReportRepository extends JpaRepository<ProgressReport, Long> {

    @Override
    @NonNull
    @EntityGraph(attributePaths = {"project", "task", "reportedBy"})
    Page<ProgressReport> findAll(@NonNull Pageable pageable);

    @Override
    @NonNull
    @EntityGraph(attributePaths = {"project", "task", "reportedBy"})
    Optional<ProgressReport> findById(@NonNull Long id);

    @EntityGraph(attributePaths = {"project", "task", "reportedBy"})
    Page<ProgressReport> findByProjectId(
            Long projectId,
            Pageable pageable
    );

    @EntityGraph(attributePaths = {"project", "task", "reportedBy"})
    Page<ProgressReport> findByTaskId(
            Long taskId,
            Pageable pageable
    );

    void deleteByProjectId(Long projectId);

    void deleteByTaskId(Long taskId);

    void deleteByTaskIdIn(java.util.List<Long> taskIds);

    java.util.List<ProgressReport> findByReportedBy(sliit.construction.construction.entity.User reportedBy);

    java.util.List<ProgressReport> findByReportedById(Long reportedById);
}