package sliit.construction.construction.controller;

import sliit.construction.construction.dto.TaskDtos;
import sliit.construction.construction.entity.TaskStatus;
import sliit.construction.construction.service.TaskService;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import org.springframework.http.HttpStatus;

import org.springframework.security.access.prepost.PreAuthorize;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("""
            hasAnyRole(
                'PROJECT_MANAGER',
                'SITE_ENGINEER',
                'CONSTRUCTION_SUPERVISOR',
                'SYSTEM_ADMINISTRATOR'
            )
            """)
    public TaskDtos.Response create(
            @Valid @RequestBody TaskDtos.Request request
    ) {

        return taskService.create(request);
    }

    @GetMapping
    public Page<TaskDtos.Response> list(
            @RequestParam(required = false) TaskStatus status,
            @RequestParam(required = false) Long projectId,
            Pageable pageable
    ) {

        return taskService.list(
                status,
                projectId,
                pageable
        );
    }

    @GetMapping("/assigned-to/{userId}")
    public Page<TaskDtos.Response> assigned(
            @PathVariable Long userId,
            Pageable pageable
    ) {

        return taskService.assignedTo(
                userId,
                pageable
        );
    }

    @GetMapping("/{id}")
    public TaskDtos.Response get(
            @PathVariable Long id
    ) {

        return taskService.get(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize("""
            hasAnyRole(
                'PROJECT_MANAGER',
                'SITE_ENGINEER',
                'CONSTRUCTION_SUPERVISOR',
                'SYSTEM_ADMINISTRATOR'
            )
            """)
    public TaskDtos.Response update(
            @PathVariable Long id,
            @Valid @RequestBody TaskDtos.Request request
    ) {

        return taskService.update(
                id,
                request
        );
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("""
            hasAnyRole(
                'PROJECT_MANAGER',
                'SITE_ENGINEER',
                'CONSTRUCTION_SUPERVISOR',
                'SYSTEM_ADMINISTRATOR'
            )
            """)
    public void delete(
            @PathVariable Long id
    ) {

        taskService.delete(id);
    }
}