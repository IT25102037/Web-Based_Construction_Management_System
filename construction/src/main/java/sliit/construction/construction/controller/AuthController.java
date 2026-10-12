package sliit.construction.construction.controller;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import org.springframework.web.bind.annotation.*;

import sliit.construction.construction.config.JwtService;
import sliit.construction.construction.dto.AuthDtos;
import sliit.construction.construction.dto.UserDtos;
import sliit.construction.construction.entity.Role;
import sliit.construction.construction.entity.User;
import sliit.construction.construction.service.UserService;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserService users;

    private final AuthenticationManager auth;

    private final JwtService jwt;


    public AuthController(
            UserService users,
            AuthenticationManager auth,
            JwtService jwt) {

        this.users = users;

        this.auth = auth;

        this.jwt = jwt;
    }


    // ==========================================
    // CLIENT REGISTRATION
    // ==========================================

    @PostMapping("/register")
    public ResponseEntity<UserDtos.Response> register(
            @Valid @RequestBody AuthDtos.RegisterRequest request) {

        Role assignedRole = request.role() != null ? request.role() : Role.CLIENT;

        UserDtos.Response response =
                users.create(

                        new UserDtos.Request(

                                request.username(),

                                request.email(),

                                request.password(),

                                assignedRole,

                                request.fullName(),

                                request.phoneNumber()

                        )

                );


        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(response);
    }


    // ==========================================
    // LOGIN (Supports Username OR Email, Role Checking, Remember-Me)
    // ==========================================

    @PostMapping("/login")
    public AuthDtos.AuthResponse login(
            @Valid @RequestBody AuthDtos.LoginRequest request) {

        /*
         * Authenticate username / email + password.
         */
        auth.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.username(),
                        request.password()
                )
        );

        /*
         * Get the authenticated user by username or email.
         */
        User user = users.getByUsernameOrEmail(request.username());

        /*
         * Check portal segregation.
         */
        if ("STAFF".equalsIgnoreCase(request.portalType()) && user.getRole() == Role.CLIENT) {
            throw new BadCredentialsException("This is a Client account. Please use the Client Portal.");
        }

        if ("CLIENT".equalsIgnoreCase(request.portalType()) && user.getRole() != Role.CLIENT) {
            throw new BadCredentialsException("This is a Staff account. Please use the Staff Portal.");
        }

        /*
         * Verify expected role if requested by role-specific form.
         */
        if (request.expectedRole() != null && !request.expectedRole().isBlank()) {
            if (!user.getRole().name().equalsIgnoreCase(request.expectedRole().trim())) {
                throw new BadCredentialsException("The selected role does not match this account's assigned role.");
            }
        }

        /*
         * Generate JWT token with optional Remember-Me (30-day token).
         */
        boolean rememberMe = Boolean.TRUE.equals(request.rememberMe());
        String token = jwt.generate(
                user.getUsername(),
                user.getRole().name(),
                rememberMe
        );

        long expiresIn = rememberMe ? (30L * 24 * 60 * 60 * 1000L) : 86400000L;

        return new AuthDtos.AuthResponse(
                token,
                user.getId(),
                user.getUsername(),
                user.getRole().name(),
                user.getFullName(),
                expiresIn
        );
    }


    // ==========================================
    // CHANGE PASSWORD (Secure Authenticated User Action)
    // ==========================================

    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            Authentication authentication,
            @Valid @RequestBody AuthDtos.ChangePasswordRequest request) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "You must be signed in to change your password."));
        }

        users.changePassword(
                authentication.getName(),
                request.currentPassword(),
                request.newPassword(),
                request.confirmNewPassword()
        );

        return ResponseEntity.ok(Map.of(
                "message", "Password changed successfully. Please sign in with your new credentials on your next session."
        ));
    }


    // ==========================================
    // CURRENT USER INFO
    // ==========================================

    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        User user = users.getByUsernameOrEmail(authentication.getName());

        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "username", user.getUsername(),
                "email", user.getEmail(),
                "fullName", user.getFullName(),
                "role", user.getRole().name()
        ));
    }


    // ==========================================
    // LOGOUT
    // ==========================================

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout() {
        return ResponseEntity.ok(Map.of("message", "Logged out successfully."));
    }

}