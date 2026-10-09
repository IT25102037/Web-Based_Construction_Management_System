package lk.sliit.web_based_construction_management_system.controller;

import sliit.construction.construction.dto.ProjectDtos;
import sliit.construction.construction.entity.ProjectStatus;
import sliit.construction.construction.service.ProjectService;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import org.springframework.security.access.prepost.PreAuthorize;

import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    private final ProjectService s;


    public ProjectController(
            ProjectService s
    ) {

        this.s = s;
    }


    // =========================================================
    // CREATE PROJECT
    // =========================================================

    @PostMapping
    @PreAuthorize("hasAnyRole('PROJECT_MANAGER', 'SYSTEM_ADMINISTRATOR')")
    public ProjectDtos.Response create(
            @Valid @RequestBody ProjectDtos.Request r
    ) {

        return s.create(r);
    }


    // =========================================================
    // GET PROJECTS
    // =========================================================

    @GetMapping
    public Page<ProjectDtos.Response> list(

            @RequestParam(
                    required = false
            )
            String search,

            @RequestParam(
                    required = false
            )
            ProjectStatus status,

            @RequestParam(
                    required = false
            )
            Long managerId,

            Pageable p
    ) {

        if (status != null) {

            return s.listByStatus(
                    status,
                    p
            );
        }


        if (managerId != null) {

            return s.listByManager(
                    managerId,
                    p
            );
        }


        return s.list(
                search,
                p
        );
    }


    // =========================================================
    // GET SINGLE PROJECT
    // =========================================================

    @GetMapping("/{id}")
    public ProjectDtos.Response get(
            @PathVariable Long id
    ) {

        return s.get(id);
    }


    // =========================================================
    // UPDATE PROJECT
    // =========================================================

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PROJECT_MANAGER', 'SYSTEM_ADMINISTRATOR')")
    public ProjectDtos.Response update(
            @PathVariable Long id,
            @Valid @RequestBody ProjectDtos.Request r
    ) {

        return s.update(
                id,
                r
        );
    }


    // =========================================================
    // DELETE PROJECT
    // =========================================================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('PROJECT_MANAGER', 'SYSTEM_ADMINISTRATOR')")
    public void delete(
            @PathVariable Long id
    ) {

        s.delete(id);
    }
}