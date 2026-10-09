package lk.sliit.web_based_construction_management_system.service;

import sliit.construction.construction.dto.MilestoneDtos;
import sliit.construction.construction.entity.Milestone;
import sliit.construction.construction.entity.MilestoneStatus;
import sliit.construction.construction.entity.Project;
import sliit.construction.construction.exception.ResourceNotFoundException;
import sliit.construction.construction.repository.MilestoneRepository;
import sliit.construction.construction.repository.ProjectRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MilestoneServiceImpl implements MilestoneService {

    private final MilestoneRepository repo;
    private final ProjectRepository projects;


    public MilestoneServiceImpl(
            MilestoneRepository repo,
            ProjectRepository projects) {

        this.repo = repo;
        this.projects = projects;
    }


    // =========================================================
    // CREATE
    // =========================================================

    @Override
    @Transactional
    public MilestoneDtos.Response create(
            MilestoneDtos.Request request) {

        Milestone milestone = new Milestone();

        build(milestone, request);

        return map(repo.save(milestone));
    }


    // =========================================================
    // READ
    // =========================================================

    @Override
    @Transactional(readOnly = true)
    public Page<MilestoneDtos.Response> list(
            Long projectId,
            MilestoneStatus status,
            Pageable pageable) {

        Page<Milestone> page;

        if (projectId != null && status != null) {

            page = repo.findByProjectIdAndStatus(
                    projectId,
                    status,
                    pageable
            );

        } else if (projectId != null) {

            page = repo.findByProjectId(
                    projectId,
                    pageable
            );

        } else if (status != null) {

            page = repo.findByStatus(
                    status,
                    pageable
            );

        } else {

            page = repo.findAll(pageable);
        }

        return page.map(this::map);
    }


    // =========================================================
    // GET ONE
    // =========================================================

    @Override
    @Transactional(readOnly = true)
    public MilestoneDtos.Response get(Long id) {

        return map(entity(id));
    }


    // =========================================================
    // UPDATE
    // =========================================================

    @Override
    @Transactional
    public MilestoneDtos.Response update(
            Long id,
            MilestoneDtos.Request request) {

        Milestone milestone = entity(id);

        build(milestone, request);

        return map(repo.save(milestone));
    }


    // =========================================================
    // DELETE
    // =========================================================

    @Override
    @Transactional
    public void delete(Long id) {

        repo.delete(entity(id));
    }


    // =========================================================
    // BUILD ENTITY
    // =========================================================

    private void build(
            Milestone milestone,
            MilestoneDtos.Request request) {

        if (request.completedDate() != null
                && request.targetDate() != null
                && request.completedDate()
                .isBefore(request.targetDate())) {

            // We allow early completion.
            // Therefore this is intentionally NOT treated as an error.
        }


        Project project = projects.findById(
                request.projectId()
        ).orElseThrow(() ->
                new ResourceNotFoundException(
                        "Project not found with ID: "
                                + request.projectId()
                )
        );


        milestone.setName(
                request.name().trim()
        );


        milestone.setDescription(
                request.description() != null
                        ? request.description().trim()
                        : null
        );


        milestone.setTargetDate(
                request.targetDate()
        );


        milestone.setCompletedDate(
                request.completedDate()
        );


        milestone.setStatus(
                request.status()
        );


        milestone.setProject(
                project
        );
    }


    // =========================================================
    // FIND ENTITY
    // =========================================================

    private Milestone entity(Long id) {

        return repo.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Milestone not found with ID: "
                                        + id
                        )
                );
    }


    // =========================================================
    // ENTITY → DTO
    // =========================================================

    private MilestoneDtos.Response map(
            Milestone milestone) {

        return new MilestoneDtos.Response(

                milestone.getId(),

                milestone.getName(),

                milestone.getDescription(),

                milestone.getTargetDate(),

                milestone.getCompletedDate(),

                milestone.getStatus(),

                milestone.getProject().getId(),

                milestone.getProject().getName(),

                milestone.getCreatedAt(),

                milestone.getUpdatedAt()
        );
    }
}