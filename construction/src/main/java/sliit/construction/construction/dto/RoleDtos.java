package sliit.construction.construction.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

public final class RoleDtos {

    private RoleDtos() {
    }

    // =========================================================
    // ROLE REQUEST
    // =========================================================
    public record Request(
            @NotBlank(message = "Role code is required")
            @Size(max = 60, message = "Role code must not exceed 60 characters")
            String roleCode,

            @NotBlank(message = "Role name is required")
            @Size(max = 100, message = "Role name must not exceed 100 characters")
            String roleName,

            @Size(max = 500, message = "Description must not exceed 500 characters")
            String description,

            @NotBlank(message = "Category is required")
            @Size(max = 50, message = "Category must not exceed 50 characters")
            String category,

            @Size(max = 30, message = "Color code must not exceed 30 characters")
            String color,

            Set<String> permissions
    ) {
    }

    // =========================================================
    // ROLE RESPONSE
    // =========================================================
    public record Response(
            Long id,
            String roleCode,
            String roleName,
            String description,
            String category,
            String color,
            Boolean isSystemRole,
            Set<String> permissions,
            long userCount,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
    }

    // =========================================================
    // PERMISSION HIERARCHY DTOs
    // =========================================================
    public record PermissionGroupDto(
            String module,
            String moduleName,
            String icon,
            String description,
            List<PermissionItemDto> permissions
    ) {
    }

    public record PermissionItemDto(
            String code,
            String name,
            String description,
            String badge
    ) {
    }
}
