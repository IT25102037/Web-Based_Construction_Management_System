package sliit.construction.construction.dto;

import sliit.construction.construction.entity.MilestoneStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;

public final class MilestoneDtos {

    private MilestoneDtos() {
    }


    // =========================================================
    // REQUEST
    // =========================================================

    public record Request(

            @NotBlank(message = "Milestone name is required.")
            @Size(max = 150)
            String name,

            @Size(max = 2000)
            String description,

            @NotNull(message = "Target date is required.")
            LocalDate targetDate,

            LocalDate completedDate,

            @NotNull(message = "Milestone status is required.")
            MilestoneStatus status,

            @NotNull(message = "Project is required.")
            Long projectId

    ) {
    }


    // =========================================================
    // RESPONSE
    // =========================================================

    public record Response(

            Long id,

            String name,

            String description,

            LocalDate targetDate,

            LocalDate completedDate,

            MilestoneStatus status,

            Long projectId,

            String projectName,

            LocalDateTime createdAt,

            LocalDateTime updatedAt

    ) {
    }
}
