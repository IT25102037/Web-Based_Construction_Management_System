package sliit.construction.construction.dto;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import sliit.construction.construction.entity.MaterialRequestStatus;

public final class MaterialRequestDtos {

    private MaterialRequestDtos() {
    }

    public record Request(

            @NotBlank(message = "Request code is required.")
            @Size(max = 50)
            String requestCode,

            @NotBlank(message = "Material name is required.")
            @Size(max = 150)
            String materialName,

            @NotNull(message = "Quantity is required.")
            @Positive(message = "Quantity must be greater than zero.")
            BigDecimal quantity,

            @NotBlank(message = "Unit is required.")
            @Size(max = 30)
            String unit,

            @NotBlank(message = "Project name is required.")
            @Size(max = 150)
            String projectName,

            @NotBlank(message = "Requested by is required.")
            @Size(max = 120)
            String requestedBy,

            @NotNull(message = "Required date is required.")
            LocalDate requiredDate,

            @Size(max = 1000)
            String reason,

            MaterialRequestStatus status
    ) {
    }

    public record Response(

            Long id,
            String requestCode,
            String materialName,
            BigDecimal quantity,
            String unit,
            String projectName,
            String requestedBy,
            LocalDate requiredDate,
            String reason,
            MaterialRequestStatus status,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
    }
}
