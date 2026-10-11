package lk.sliit.web_based_construction_management_system.dto;

import sliit.construction.construction.entity.IssueSeverity;
import sliit.construction.construction.entity.IssueStatus;

import jakarta.validation.constraints.*;

import java.time.LocalDateTime;

public final class ProgressIssueDtos {

    private ProgressIssueDtos() {}

    public record Request(

            @NotNull
            Long projectId,

            Long taskId,

            @NotBlank
            @Size(max = 200)
            String issueTitle,

            @NotBlank
            @Size(max = 2000)
            String description,

            @NotNull
            IssueSeverity severity,

            @NotNull
            IssueStatus status,

            @Size(max = 2000)
            String resolution,

            @NotNull
            Long reportedById

    ) {}

    public record Response(

            Long id,

            Long projectId,

            Long taskId,

            String issueTitle,

            String description,

            IssueSeverity severity,

            IssueStatus status,

            String resolution,

            Long reportedById,

            LocalDateTime createdAt,

            LocalDateTime updatedAt

    ) {}
}