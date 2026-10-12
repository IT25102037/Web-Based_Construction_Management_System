package sliit.construction.construction.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;

public final class SupplierDtos {

    private SupplierDtos() {}

    public record Request(
            @NotBlank(message = "Supplier name is required.")
            @Size(max = 150)
            String name,

            @Size(max = 120)
            String contactPerson,

            @Size(max = 40)
            String phone,

            @Email(message = "Invalid email format.")
            @Size(max = 120)
            String email,

            @Size(max = 500)
            String address,

            @Size(max = 30)
            String status
    ) {}

    public record Response(
            Long id,
            String name,
            String contactPerson,
            String phone,
            String email,
            String address,
            String status,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}
}
