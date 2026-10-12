package sliit.construction.construction.controller;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import sliit.construction.construction.dto.MaterialRequestDtos;
import sliit.construction.construction.entity.MaterialRequestStatus;
import sliit.construction.construction.service.MaterialRequestService;

@RestController
@RequestMapping("/api/material-requests")
public class MaterialRequestController {

    private final MaterialRequestService service;

    public MaterialRequestController(
            MaterialRequestService service) {

        this.service = service;
    }

    // CREATE
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("""
            hasAnyRole(
            'SITE_ENGINEER',
            'CONSTRUCTION_SUPERVISOR',
            'PROJECT_MANAGER',
            'PROCUREMENT_OFFICER',
            'SYSTEM_ADMINISTRATOR'
            )
            """)
    public MaterialRequestDtos.Response create(
            @Valid @RequestBody MaterialRequestDtos.Request request) {

        return service.create(request);
    }

    // READ ALL
    @GetMapping
    public Page<MaterialRequestDtos.Response> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) MaterialRequestStatus status,
            Pageable pageable) {

        return service.list(search, status, pageable);
    }

    // READ ONE
    @GetMapping("/{id}")
    public MaterialRequestDtos.Response get(
            @PathVariable Long id) {

        return service.get(id);
    }

    // UPDATE
    @PutMapping("/{id}")
    @PreAuthorize("""
            hasAnyRole(
            'SITE_ENGINEER',
            'CONSTRUCTION_SUPERVISOR',
            'PROJECT_MANAGER',
            'PROCUREMENT_OFFICER',
            'SYSTEM_ADMINISTRATOR'
            )
            """)
    public MaterialRequestDtos.Response update(
            @PathVariable Long id,
            @Valid @RequestBody MaterialRequestDtos.Request request) {

        return service.update(id, request);
    }

    // DELETE
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("""
            hasAnyRole(
            'PROJECT_MANAGER',
            'PROCUREMENT_OFFICER',
            'SYSTEM_ADMINISTRATOR'
            )
            """)
    public void delete(@PathVariable Long id) {

        service.delete(id);
    }
}