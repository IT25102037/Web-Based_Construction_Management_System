package sliit.construction.construction.repository;

import sliit.construction.construction.entity.Project;
import sliit.construction.construction.entity.ProjectStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    @EntityGraph(attributePaths = {"manager"})
    Page<Project> findAll(Pageable pageable);

    @EntityGraph(attributePaths = {"manager"})
    Optional<Project> findById(Long id);

    @EntityGraph(attributePaths = {"manager"})
    Page<Project> findByNameContainingIgnoreCase(String name, Pageable pageable);

    @EntityGraph(attributePaths = {"manager"})
    Page<Project> findByStatus(ProjectStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"manager"})
    Page<Project> findByManagerId(Long managerId, Pageable pageable);

    java.util.List<Project> findByManager(sliit.construction.construction.entity.User manager);

    java.util.List<Project> findByManagerId(Long managerId);
}
