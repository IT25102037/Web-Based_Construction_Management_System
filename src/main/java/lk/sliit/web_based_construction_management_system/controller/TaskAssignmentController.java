package lk.sliit.web_based_construction_management_system.controller;

import sliit.construction.construction.dto.TaskAssignmentDtos;
import sliit.construction.construction.entity.AssignmentStatus;
import sliit.construction.construction.service.TaskAssignmentService;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/task-assignments")
public class TaskAssignmentController {

    private final TaskAssignmentService assignmentService;

    public TaskAssignmentController(
            TaskAssignmentService assignmentService
    ) {
        this.assignmentService = assignmentService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("""
            hasAnyRole(
                'PROJECT_MANAGER',
                'SITE_ENGINEER',
                'SYSTEM_ADMINISTRATOR'
            )
            """)
    public TaskAssignmentDtos.Response create(
            @Valid
            @RequestBody
            TaskAssignmentDtos.Request request
    ) {

        return assignmentService.create(request);
    }

    @GetMapping
    public Page<TaskAssignmentDtos.Response> list(
            @RequestParam(required = false) Long taskId,
            @RequestParam(required = false) Long staffId,
            @RequestParam(required = false) AssignmentStatus status,
            Pageable pageable
    ) {

        if (taskId != null) {

            return assignmentService.listByTask(
                    taskId,
                    pageable
            );
        }

        if (staffId != null) {

            return assignmentService.listByStaff(
                    staffId,
                    pageable
            );
        }

        if (status != null) {

            return assignmentService.listByStatus(
                    status,
                    pageable
            );
        }

        return assignmentService.list(pageable);
    }

    @GetMapping("/{id}")
    public TaskAssignmentDtos.Response get(
            @PathVariable Long id
    ) {

        return assignmentService.get(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize("""
            hasAnyRole(
                'PROJECT_MANAGER',
                'SITE_ENGINEER',
                'SYSTEM_ADMINISTRATOR'
            )
            """)
    public TaskAssignmentDtos.Response update(
            @PathVariable Long id,
            @Valid
            @RequestBody
            TaskAssignmentDtos.Request request
    ) {

        return assignmentService.update(
                id,
                request
        );
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("""
            hasAnyRole(
                'PROJECT_MANAGER',
                'SYSTEM_ADMINISTRATOR'
            )
            """)
    public void delete(
            @PathVariable Long id
    ) {

        assignmentService.delete(id);
    }
}