package lk.sliit.web_based_construction_management_system.dto;

import sliit.construction.construction.entity.ProjectRequestStatus;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public final class ClientProjectRequestDtos {

    private ClientProjectRequestDtos() {
    }


    /*
     * ==========================================
     * CREATE / UPDATE REQUEST
     * ==========================================
     */
    public record Request(

            @NotBlank(message = "Project name is required.")
            @Size(
                    max = 150,
                    message = "Project name must not exceed 150 characters."
            )
            String projectName,


            @NotBlank(message = "Project type is required.")
            @Size(
                    max = 80,
                    message = "Project type must not exceed 80 characters."
            )
            String projectType,


            @NotBlank(message = "Location is required.")
            @Size(
                    max = 200,
                    message = "Location must not exceed 200 characters."
            )
            String location,


            @NotBlank(message = "Project description is required.")
            @Size(
                    max = 1000,
                    message = "Description must not exceed 1000 characters."
            )
            String description,


            @NotNull(message = "Estimated budget is required.")
            @DecimalMin(
                    value = "0.01",
                    message = "Estimated budget must be greater than zero."
            )
            BigDecimal estimatedBudget,


            @NotNull(message = "Preferred start date is required.")
            @FutureOrPresent(
                    message = "Preferred start date cannot be in the past."
            )
            LocalDate preferredStartDate
    ) {
    }


    /*
     * ==========================================
     * RESPONSE
     * ==========================================
     */
    public record Response(

            Long id,

            Long clientId,

            String clientName,

            String clientEmail,

            String clientPhone,

            String projectName,

            String projectType,

            String location,

            String description,

            BigDecimal estimatedBudget,

            LocalDate preferredStartDate,

            ProjectRequestStatus status,

            LocalDateTime createdAt,

            LocalDateTime updatedAt
    ) {
    }


    /*
     * ==========================================
     * STATUS UPDATE REQUEST (FOR PROJECT MANAGERS)
     * ==========================================
     */
    public record StatusUpdateRequest(

            @NotNull(message = "Status is required.")
            ProjectRequestStatus status,

            @Size(
                    max = 1000,
                    message = "Remarks cannot exceed 1000 characters."
            )
            String remarks
    ) {
    }
}
