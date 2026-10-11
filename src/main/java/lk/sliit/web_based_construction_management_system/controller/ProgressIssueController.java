package lk.sliit.web_based_construction_management_system.controller;

import sliit.construction.construction.dto.ProgressIssueDtos;
import sliit.construction.construction.service.ProgressIssueService;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/progress-issues")
public class ProgressIssueController {

    private final ProgressIssueService service;

    public ProgressIssueController(
            ProgressIssueService service) {

        this.service = service;
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('SITE_ENGINEER','CONSTRUCTION_SUPERVISOR')")
    public ProgressIssueDtos.Response create(
            @Valid @RequestBody ProgressIssueDtos.Request request) {

        return service.create(request);
    }

    @GetMapping
    public Page<ProgressIssueDtos.Response> list(
            @RequestParam(required = false) Long projectId,
            Pageable pageable) {

        return service.list(projectId, pageable);
    }

    @GetMapping("/{id}")
    public ProgressIssueDtos.Response get(
            @PathVariable Long id) {

        return service.get(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('SITE_ENGINEER','CONSTRUCTION_SUPERVISOR')")
    public ProgressIssueDtos.Response update(
            @PathVariable Long id,
            @Valid @RequestBody ProgressIssueDtos.Request request) {

        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('SITE_ENGINEER','CONSTRUCTION_SUPERVISOR')")
    public void delete(@PathVariable Long id) {

        service.delete(id);
    }
}