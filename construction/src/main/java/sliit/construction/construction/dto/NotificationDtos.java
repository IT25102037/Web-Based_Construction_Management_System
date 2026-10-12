package sliit.construction.construction.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public final class NotificationDtos {

    private NotificationDtos() {}

    public record Request(
            @NotBlank(message = "Title is required")
            @Size(max = 180)
            String title,

            @NotBlank(message = "Message is required")
            @Size(max = 2000)
            String message,

            @Size(max = 50)
            String type,

            @NotNull(message = "Recipient ID is required")
            Long recipientId
    ) {}

    public record UpdateRequest(
            @Size(max = 180)
            String title,

            @Size(max = 2000)
            String message,

            @Size(max = 50)
            String type,

            Boolean readFlag,

            Long recipientId
    ) {}

    public record Response(
            Long id,
            String title,
            String message,
            Boolean readFlag,
            String type,
            Long recipientId,
            String recipientName,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}

    public record UnreadCountResponse(
            long unreadCount,
            long totalCount
    ) {}
}
