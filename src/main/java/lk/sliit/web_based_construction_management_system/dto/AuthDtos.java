package lk.sliit.web_based_construction_management_system.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import sliit.construction.construction.entity.Role;

public final class AuthDtos {

    private AuthDtos() {
    }

    // ==========================================
    // CLIENT REGISTRATION
    // ==========================================

    public record RegisterRequest(

            @NotBlank
            @Size(max = 50)
            String username,

            @NotBlank
            @Email
            @Size(max = 120)
            String email,

            @NotBlank
            @Size(min = 8, max = 100)
            String password,

            @NotBlank
            @Size(max = 120)
            String fullName,

            @Size(max = 30)
            String phoneNumber,

            Role role

    ) {
    }


    // ==========================================
    // LOGIN
    // ==========================================

    public record LoginRequest(

            @NotBlank
            String username,

            @NotBlank
            String password,

            String expectedRole,

            String portalType,

            Boolean rememberMe

    ) {
        public LoginRequest(String username, String password) {
            this(username, password, null, null, false);
        }
    }


    // ==========================================
    // LOGIN RESPONSE
    // ==========================================

    public record AuthResponse(

            String token,
            Long userId,
            String username,
            String role,
            String fullName,
            Long expiresIn

    ) {
        public AuthResponse(String token, Long userId, String username, String role) {
            this(token, userId, username, role, null, null);
        }
    }


    // ==========================================
    // CHANGE PASSWORD
    // ==========================================

    public record ChangePasswordRequest(

            @NotBlank(message = "Current password is required")
            String currentPassword,

            @NotBlank(message = "New password is required")
            @Size(min = 8, max = 100, message = "New password must be at least 8 characters")
            String newPassword,

            @NotBlank(message = "Password confirmation is required")
            String confirmNewPassword

    ) {
    }

}