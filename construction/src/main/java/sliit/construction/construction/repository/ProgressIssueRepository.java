package sliit.construction.construction.repository;

import sliit.construction.construction.entity.ProgressIssue;
import sliit.construction.construction.entity.IssueStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProgressIssueRepository
        extends JpaRepository<ProgressIssue, Long> {

    Page<ProgressIssue> findByProjectId(
            Long projectId,
            Pageable pageable
    );

    Page<ProgressIssue> findByStatus(
            IssueStatus status,
            Pageable pageable
    );

    Page<ProgressIssue> findByProjectIdAndStatus(
            Long projectId,
            IssueStatus status,
            Pageable pageable
    );

    void deleteByProjectId(Long projectId);

    void deleteByTaskId(Long taskId);

    void deleteByTaskIdIn(java.util.List<Long> taskIds);

    java.util.List<ProgressIssue> findByReportedById(Long reportedById);
}