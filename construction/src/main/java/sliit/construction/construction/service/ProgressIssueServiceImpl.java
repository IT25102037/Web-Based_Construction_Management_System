package sliit.construction.construction.service;

import sliit.construction.construction.dto.ProgressIssueDtos;
import sliit.construction.construction.entity.ProgressIssue;
import sliit.construction.construction.repository.ProgressIssueRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class ProgressIssueServiceImpl implements ProgressIssueService {

    private final ProgressIssueRepository repository;
    private final sliit.construction.construction.repository.ProjectRepository projectRepository;
    private final sliit.construction.construction.repository.TaskRepository taskRepository;
    private final sliit.construction.construction.repository.UserRepository userRepository;

    public ProgressIssueServiceImpl(
            ProgressIssueRepository repository,
            sliit.construction.construction.repository.ProjectRepository projectRepository,
            sliit.construction.construction.repository.TaskRepository taskRepository,
            sliit.construction.construction.repository.UserRepository userRepository) {

        this.repository = repository;
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    @Override
    public ProgressIssueDtos.Response create(
            ProgressIssueDtos.Request request) {

        ProgressIssue issue = new ProgressIssue();

        mapRequestToEntity(request, issue);

        ProgressIssue saved = repository.save(issue);

        return mapToResponse(saved);
    }

    @Override
    public Page<ProgressIssueDtos.Response> list(
            Long projectId,
            Pageable pageable) {

        return list(projectId, null, pageable);
    }

    @Override
    public Page<ProgressIssueDtos.Response> list(
            Long projectId,
            sliit.construction.construction.entity.IssueStatus status,
            Pageable pageable) {

        if (projectId != null && status != null) {
            return repository
                    .findByProjectIdAndStatus(projectId, status, pageable)
                    .map(this::mapToResponse);
        } else if (projectId != null) {
            return repository
                    .findByProjectId(projectId, pageable)
                    .map(this::mapToResponse);
        } else if (status != null) {
            return repository
                    .findByStatus(status, pageable)
                    .map(this::mapToResponse);
        }

        return repository
                .findAll(pageable)
                .map(this::mapToResponse);
    }

    @Override
    public ProgressIssueDtos.Response get(Long id) {

        ProgressIssue issue = repository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Progress issue not found with id: " + id
                        )
                );

        return mapToResponse(issue);
    }

    @Override
    public ProgressIssueDtos.Response update(
            Long id,
            ProgressIssueDtos.Request request) {

        ProgressIssue issue = repository.findById(id)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Progress issue not found with id: " + id
                        )
                );

        mapRequestToEntity(request, issue);

        ProgressIssue updated = repository.save(issue);

        return mapToResponse(updated);
    }

    @Override
    public void delete(Long id) {

        if (!repository.existsById(id)) {

            throw new RuntimeException(
                    "Progress issue not found with id: " + id
            );
        }

        repository.deleteById(id);
    }

    private void mapRequestToEntity(
            ProgressIssueDtos.Request request,
            ProgressIssue issue) {

        issue.setProjectId(request.projectId());
        issue.setTaskId(request.taskId());
        issue.setIssueTitle(request.issueTitle());
        issue.setDescription(request.description());
        issue.setSeverity(request.severity());
        issue.setStatus(request.status());
        issue.setResolution(request.resolution());
        issue.setReportedById(request.reportedById());
    }

    private ProgressIssueDtos.Response mapToResponse(
            ProgressIssue issue) {

        String projectName = issue.getProjectId() != null
                ? projectRepository.findById(issue.getProjectId())
                        .map(sliit.construction.construction.entity.Project::getName)
                        .orElse("Project #" + issue.getProjectId())
                : "General";

        String taskTitle = issue.getTaskId() != null
                ? taskRepository.findById(issue.getTaskId())
                        .map(sliit.construction.construction.entity.Task::getTitle)
                        .orElse("Task #" + issue.getTaskId())
                : "Site-wide";

        String reportedByName = issue.getReportedById() != null
                ? userRepository.findById(issue.getReportedById())
                        .map(sliit.construction.construction.entity.User::getFullName)
                        .orElse("Staff #" + issue.getReportedById())
                : "Staff";

        return new ProgressIssueDtos.Response(
                issue.getId(),
                issue.getProjectId(),
                issue.getTaskId(),
                issue.getIssueTitle(),
                issue.getDescription(),
                issue.getSeverity(),
                issue.getStatus(),
                issue.getResolution(),
                issue.getReportedById(),
                issue.getCreatedAt(),
                issue.getUpdatedAt(),
                projectName,
                taskTitle,
                reportedByName
        );
    }
}