package sliit.construction.construction.dto;

import sliit.construction.construction.entity.AssignmentStatus;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;

public final class TaskAssignmentDtos {

    private TaskAssignmentDtos() {
    }

    public record Request(

            @NotNull(message = "Task is required.")
            Long taskId,

            @NotNull(message = "Staff member is required.")
            Long staffId,

            @NotNull(message = "Assigned date is required.")
            LocalDate assignedDate,

            @NotBlank(message = "Responsibility is required.")
            @Size(
                    max = 500,
                    message = "Responsibility cannot exceed 500 characters."
            )
            String responsibility,

            @NotNull(message = "Assignment status is required.")
            AssignmentStatus status

    ) {
    }

    public record Response(

            Long id,

            Long taskId,

            String taskTitle,

            Long staffId,

            String staffName,

            String staffUsername,

            String staffRole,

            LocalDate assignedDate,

            String responsibility,

            AssignmentStatus status,

            LocalDateTime createdAt,

            LocalDateTime updatedAt

    ) {
    }
}