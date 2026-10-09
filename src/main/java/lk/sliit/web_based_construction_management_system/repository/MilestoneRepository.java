package lk.sliit.web_based_construction_management_system.repository;

import sliit.construction.construction.entity.Milestone;
import sliit.construction.construction.entity.MilestoneStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MilestoneRepository extends JpaRepository<Milestone, Long> {

    Page<Milestone> findByProjectId(Long projectId, Pageable pageable);

    Page<Milestone> findByStatus(
            MilestoneStatus status,
            Pageable pageable
    );

    Page<Milestone> findByProjectIdAndStatus(
            Long projectId,
            MilestoneStatus status,
            Pageable pageable
    );

    long countByStatus(MilestoneStatus status);

    long countByProjectId(Long projectId);

    java.util.List<Milestone> findByProjectId(Long projectId);

    void deleteByProjectId(Long projectId);
}
