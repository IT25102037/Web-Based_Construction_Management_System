package sliit.construction.construction.dto;

import sliit.construction.construction.entity.Role;

import jakarta.validation.constraints.*;

import java.time.LocalDateTime;

public final class UserDtos {

 private UserDtos() {
 }


 // =========================================================
 // USER REQUEST
 // =========================================================

 public record Request(

         @NotBlank
         @Size(max = 50)
         String username,


         @NotBlank
         @Email
         @Size(max = 120)
         String email,


         @Size(
                 max = 100
         )
         String password,


         @NotNull
         Role role,


         @NotBlank
         @Size(max = 120)
         String fullName,


         @Size(max = 30)
         String phoneNumber

 ) {
 }


 // =========================================================
 // USER RESPONSE
 // =========================================================

 public record Response(

         Long id,

         String username,

         String email,

         Role role,

         String fullName,

         String phoneNumber,

         LocalDateTime createdAt,

         LocalDateTime updatedAt

 ) {
 }


 // =========================================================
 // PROFILE UPDATE REQUEST & RESPONSE
 // =========================================================

 public record ProfileUpdateRequest(

         @NotBlank(message = "Username is required.")
         @Size(max = 50, message = "Username must not exceed 50 characters.")
         @Pattern(
                 regexp = "^[a-zA-Z0-9._-]+$",
                 message = "Username can contain only letters, numbers, dots, underscores and hyphens."
         )
         String username,

         @NotBlank(message = "Email is required.")
         @Email(message = "Please enter a valid email address.")
         @Size(max = 120, message = "Email must not exceed 120 characters.")
         String email,

         @NotBlank(message = "Full name is required.")
         @Size(max = 120, message = "Full name must not exceed 120 characters.")
         String fullName,

         @Size(max = 30, message = "Phone number must not exceed 30 characters.")
         String phoneNumber,

         @Pattern(
                 regexp = "^$|^.{8,100}$",
                 message = "Password must contain between 8 and 100 characters if changed."
         )
         String password

 ) {
 }

 public record ProfileUpdateResponse(
         Response profile,
         String token
 ) {
 }
}
