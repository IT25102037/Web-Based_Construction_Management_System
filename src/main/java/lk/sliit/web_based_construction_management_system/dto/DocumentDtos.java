package lk.sliit.web_based_construction_management_system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public final class DocumentDtos {

    private DocumentDtos() {}

    public record Request(
            @NotBlank(message = "Document title is required")
            @Size(max = 180, message = "Title cannot exceed 180 characters")
            String title,

            @Size(max = 60)
            String documentType,

            @Size(max = 500)
            String fileUrl,

            @Size(max = 500)
            String filePath,

            @Size(max = 50)
            String fileSize,

            @Size(max = 20)
            String version,

            @Size(max = 1000)
            String description,

            @NotNull(message = "Project is required")
            Long projectId,

            @NotNull(message = "Uploader user ID is required")
            Long uploadedById
    ) {}

    public record Response(
            Long id,
            String title,
            String documentType,
            String fileUrl,
            String filePath,
            String fileSize,
            String version,
            String description,
            Long projectId,
            String projectName,
            Long uploadedById,
            String uploadedByName,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}

    public record StatsResponse(
            long total,
            long blueprints,
            long contracts,
            long permits,
            long reports,
            long specifications,
            long others
    ) {}
}