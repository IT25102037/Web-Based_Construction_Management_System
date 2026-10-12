package sliit.construction.construction.controller;

import sliit.construction.construction.dto.MilestoneDtos;
import sliit.construction.construction.entity.MilestoneStatus;
import sliit.construction.construction.service.MilestoneService;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/milestones")
public class MilestoneController {

    private final MilestoneService service;


    public MilestoneController(MilestoneService service) {
        this.service = service;
    }


    // =========================================================
    // CREATE
    // =========================================================

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize(
            "hasAnyRole('PROJECT_MANAGER', 'SYSTEM_ADMINISTRATOR')"
    )
    public MilestoneDtos.Response create(
            @Valid @RequestBody MilestoneDtos.Request request) {

        return service.create(request);
    }


    // =========================================================
    // READ
    // =========================================================

    @GetMapping
    public Page<MilestoneDtos.Response> list(

            @RequestParam(required = false)
            Long projectId,

            @RequestParam(required = false)
            MilestoneStatus status,

            Pageable pageable) {

        return service.list(
                projectId,
                status,
                pageable
        );
    }


    // =========================================================
    // READ ONE
    // =========================================================

    @GetMapping("/{id}")
    public MilestoneDtos.Response get(
            @PathVariable Long id) {

        return service.get(id);
    }


    // =========================================================
    // UPDATE
    // =========================================================

    @PutMapping("/{id}")
    @PreAuthorize(
            "hasAnyRole('PROJECT_MANAGER', 'SYSTEM_ADMINISTRATOR')"
    )
    public MilestoneDtos.Response update(

            @PathVariable Long id,

            @Valid
            @RequestBody
            MilestoneDtos.Request request) {

        return service.update(
                id,
                request
        );
    }


    // =========================================================
    // DELETE
    // =========================================================

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize(
            "hasAnyRole('PROJECT_MANAGER', 'SYSTEM_ADMINISTRATOR')"
    )
    public void delete(
            @PathVariable Long id) {

        service.delete(id);
    }
}
