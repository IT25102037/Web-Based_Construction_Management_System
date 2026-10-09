package lk.sliit.web_based_construction_management_system.dto;

import sliit.construction.construction.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public final class ClientProfileDtos {

    private ClientProfileDtos() {
    }

    /*
     * ==========================================
     * UPDATE CLIENT PROFILE REQUEST
     * ==========================================
     */
    public record UpdateRequest(

            @NotBlank(message = "Full name is required.")
            @Size(
                    max = 120,
                    message = "Full name must not exceed 120 characters."
            )
            String fullName,

            @NotBlank(message = "Username is required.")
            @Size(
                    max = 50,
                    message = "Username must not exceed 50 characters."
            )
            @Pattern(
                    regexp = "^[a-zA-Z0-9._-]+$",
                    message = "Username can contain only letters, numbers, dots, underscores and hyphens."
            )
            String username,

            @NotBlank(message = "Email is required.")
            @Email(message = "Please enter a valid email address.")
            @Size(
                    max = 120,
                    message = "Email must not exceed 120 characters."
            )
            String email,

            @Size(
                    max = 30,
                    message = "Phone number must not exceed 30 characters."
            )
            String phoneNumber,

            @Pattern(
                    regexp = "^$|^.{8,100}$",
                    message = "Password must contain between 8 and 100 characters if changed."
            )
            String password,

            String profilePicture
    ) {
    }


    /*
     * ==========================================
     * CLIENT PROFILE RESPONSE
     * ==========================================
     */
    public record Response(

            Long id,
            String username,
            String email,
            Role role,
            String fullName,
            String phoneNumber,
            String profilePicture,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
    }


    /*
     * ==========================================
     * UPDATE RESPONSE
     *
     * Returns the updated profile together
     * with a new JWT token.
     *
     * This is important when the username
     * has been changed.
     * ==========================================
     */
    public record UpdateResponse(

            Response profile,
            String token

    ) {
    }
}
