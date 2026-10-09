package lk.sliit.web_based_construction_management_system.dto;

import sliit.construction.construction.entity.ProjectStatus;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public final class ProjectDtos {

 private ProjectDtos() {
 }


 // =========================================================
 // REQUEST
 // =========================================================

 public record Request(

         @NotBlank
         @Size(max = 150)
         String name,


         @Size(max = 2000)
         String description,


         @Size(max = 1500)
         String location,


         @NotNull
         LocalDate startDate,


         LocalDate endDate,


         LocalDate actualEndDate,


         @PositiveOrZero
         BigDecimal budget,


         @Size(max = 2000)
         String resourceAllocation,


         @NotNull
         ProjectStatus status,


         Long managerId

 ) {
 }


 // =========================================================
 // RESPONSE
 // =========================================================

 public record Response(

         Long id,

         String name,

         String description,

         String location,

         LocalDate startDate,

         LocalDate endDate,

         LocalDate actualEndDate,

         BigDecimal budget,

         String resourceAllocation,

         ProjectStatus status,

         Long managerId,

         String managerName,

         LocalDateTime createdAt,

         LocalDateTime updatedAt

 ) {
 }
}