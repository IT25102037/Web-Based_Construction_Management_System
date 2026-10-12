package sliit.construction.construction.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonProperty;
import sliit.construction.construction.entity.TaskPriority;
import sliit.construction.construction.entity.TaskStatus;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;

public final class TaskDtos {

 private TaskDtos() {
 }

 public record Request(

         @NotBlank(message = "Task title is required.")
         @Size(
                 max = 150,
                 message = "Task title cannot exceed 150 characters."
         )
         String title,

         @Size(
                 max = 2000,
                 message = "Description cannot exceed 2000 characters."
         )
         String description,

         @NotNull(message = "Deadline is required.")
         @JsonAlias({"deadline", "dueDate"})
         LocalDate deadline,

         @NotNull(message = "Task priority is required.")
         TaskPriority priority,

         @NotNull(message = "Task status is required.")
         TaskStatus status,

         @NotNull(message = "Project is required.")
         Long projectId,

         @NotNull(message = "Assignee is required.")
         Long assigneeId

 ) {
 }

 public record Response(

         Long id,

         String title,

         String description,

         LocalDate deadline,

         TaskPriority priority,

         TaskStatus status,

         Long projectId,

         String projectName,

         Long assigneeId,

         String assigneeName,

         LocalDateTime createdAt,

         LocalDateTime updatedAt

 ) {
     @JsonProperty("dueDate")
     public LocalDate dueDate() {
         return deadline;
     }
 }
}