package sliit.construction.construction.dto;

import sliit.construction.construction.entity.ProgressStatus;
import jakarta.validation.constraints.*;

import java.time.LocalDateTime;

public final class ProgressDtos {

    private ProgressDtos() {}

    public record Request(
            @NotNull
            @Min(0)
            @Max(100)
            Integer completionPercentage,

            @NotBlank
            @Size(max = 2000)
            String statusUpdate,

            ProgressStatus status,

            @NotNull
            Long projectId,

            Long taskId,

            Long reportedById
    ) {}

    public record Response(
            Long id,
            Integer completionPercentage,
            String statusUpdate,
            ProgressStatus status,
            Long projectId,
            String projectName,
            Long taskId,
            String taskTitle,
            Long reportedById,
            String reportedByName,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}
}
