package lk.sliit.web_based_construction_management_system.service;

import sliit.construction.construction.dto.ProgressIssueDtos;
import sliit.construction.construction.entity.ProgressIssue;
import sliit.construction.construction.repository.ProgressIssueRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

@Service
public class ProgressIssueServiceImpl implements ProgressIssueService {

    private final ProgressIssueRepository repository;

    public ProgressIssueServiceImpl(
            ProgressIssueRepository repository) {

        this.repository = repository;
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

        if (projectId != null) {

            return repository
                    .findByProjectId(projectId, pageable)
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
                issue.getUpdatedAt()
        );
    }
}