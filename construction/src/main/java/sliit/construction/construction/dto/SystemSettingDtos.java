package sliit.construction.construction.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public final class SystemSettingDtos {

    private SystemSettingDtos() {
    }

    public record Request(
            @NotBlank(message = "Setting key is required")
            @Size(max = 100, message = "Setting key must not exceed 100 characters")
            String settingKey,

            @NotBlank(message = "Setting value is required")
            @Size(max = 2000, message = "Setting value must not exceed 2000 characters")
            String settingValue,

            @NotBlank(message = "Category is required")
            @Size(max = 50, message = "Category must not exceed 50 characters")
            String category,

            @Size(max = 500, message = "Description must not exceed 500 characters")
            String description,

            @Size(max = 30, message = "Data type must not exceed 30 characters")
            String dataType,

            @Size(max = 30, message = "Status must not exceed 30 characters")
            String status
    ) {
    }

    public record Response(
            Long id,
            String settingKey,
            String settingValue,
            String category,
            String description,
            String dataType,
            String status,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
    }
}
