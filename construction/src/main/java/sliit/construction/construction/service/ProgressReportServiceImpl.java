package sliit.construction.construction.service;

import sliit.construction.construction.dto.ProgressDtos;
import sliit.construction.construction.entity.*;
import sliit.construction.construction.exception.ResourceNotFoundException;
import sliit.construction.construction.repository.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProgressReportServiceImpl implements ProgressReportService {

    private final ProgressReportRepository repo;
    private final ProjectRepository projects;
    private final TaskRepository tasks;
    private final UserRepository users;

    public ProgressReportServiceImpl(ProgressReportRepository r, ProjectRepository p, TaskRepository t, UserRepository u) {
        this.repo = r;
        this.projects = p;
        this.tasks = t;
        this.users = u;
    }

    @Override
    @Transactional
    public ProgressDtos.Response create(ProgressDtos.Request r) {
        ProgressReport report = build(new ProgressReport(), r);
        ProgressReport saved = repo.save(report);

        // Synchronize Project status if completed
        if (saved.getProject() != null && r.completionPercentage() != null) {
            if (r.completionPercentage() >= 100) {
                saved.getProject().setStatus(ProjectStatus.COMPLETED);
                projects.save(saved.getProject());
            } else if (r.completionPercentage() > 0 && saved.getProject().getStatus() == ProjectStatus.PLANNED) {
                saved.getProject().setStatus(ProjectStatus.IN_PROGRESS);
                projects.save(saved.getProject());
            }
        }

        return map(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ProgressDtos.Response> list(Long projectId, Pageable p) {
        Page<ProgressReport> page = (projectId == null) ? repo.findAll(p) : repo.findByProjectId(projectId, p);
        return page.map(this::map);
    }

    @Override
    @Transactional(readOnly = true)
    public ProgressDtos.Response get(Long id) {
        return map(entity(id));
    }

    @Override
    @Transactional
    public ProgressDtos.Response update(Long id, ProgressDtos.Request r) {
        ProgressReport existing = entity(id);
        ProgressReport updated = build(existing, r);
        ProgressReport saved = repo.save(updated);

        // Synchronize Project status if completed
        if (saved.getProject() != null && r.completionPercentage() != null) {
            if (r.completionPercentage() >= 100) {
                saved.getProject().setStatus(ProjectStatus.COMPLETED);
                projects.save(saved.getProject());
            } else if (r.completionPercentage() > 0 && saved.getProject().getStatus() == ProjectStatus.PLANNED) {
                saved.getProject().setStatus(ProjectStatus.IN_PROGRESS);
                projects.save(saved.getProject());
            }
        }

        return map(saved);
    }

    @Override
    @Transactional
    public void delete(Long id) {
        ProgressReport report = entity(id);
        repo.delete(report);
    }

    private ProgressReport entity(Long id) {
        return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Progress report not found: " + id));
    }

    private ProgressReport build(ProgressReport x, ProgressDtos.Request r) {
        x.setCompletionPercentage(r.completionPercentage() != null ? r.completionPercentage() : 0);
        x.setStatusUpdate(r.statusUpdate() != null ? r.statusUpdate() : "");
        x.setStatus(r.status() != null ? r.status() : ProgressStatus.ON_TRACK);

        Project project = projects.findById(r.projectId())
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + r.projectId()));
        x.setProject(project);

        if (r.taskId() != null && r.taskId() > 0) {
            Task task = tasks.findById(r.taskId()).orElse(null);
            x.setTask(task);
        } else {
            x.setTask(null);
        }

        User reportedBy = null;
        if (r.reportedById() != null && r.reportedById() > 0) {
            reportedBy = users.findById(r.reportedById()).orElse(null);
        }

        if (reportedBy == null) {
            // Try resolving currently authenticated user
            try {
                Authentication auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth != null && auth.getName() != null && !auth.getName().isBlank()) {
                    reportedBy = users.findByUsernameOrEmail(auth.getName(), auth.getName()).orElse(null);
                }
            } catch (Exception ignored) {}
        }

        if (reportedBy == null) {
            // Fallback to project manager or first user in system
            reportedBy = project.getManager() != null ? project.getManager() : users.findAll().stream().findFirst().orElse(null);
        }

        if (reportedBy == null) {
            throw new ResourceNotFoundException("No valid reporter user found.");
        }

        x.setReportedBy(reportedBy);
        return x;
    }

    private ProgressDtos.Response map(ProgressReport x) {
        Long projId = (x.getProject() != null) ? x.getProject().getId() : null;
        String projName = (x.getProject() != null) ? x.getProject().getName() : "Unknown Project";
        Long taskId = (x.getTask() != null) ? x.getTask().getId() : null;
        String taskTitle = (x.getTask() != null) ? x.getTask().getTitle() : null;
        Long reporterId = (x.getReportedBy() != null) ? x.getReportedBy().getId() : null;
        String reporterName = (x.getReportedBy() != null) ? x.getReportedBy().getFullName() : "Supervisor User";

        return new ProgressDtos.Response(
                x.getId(),
                x.getCompletionPercentage(),
                x.getStatusUpdate(),
                x.getStatus(),
                projId,
                projName,
                taskId,
                taskTitle,
                reporterId,
                reporterName,
                x.getCreatedAt(),
                x.getUpdatedAt()
        );
    }
}
