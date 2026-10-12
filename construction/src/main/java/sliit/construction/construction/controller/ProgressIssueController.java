package sliit.construction.construction.controller;

import sliit.construction.construction.dto.ProgressIssueDtos;
import sliit.construction.construction.service.ProgressIssueService;

import jakarta.validation.Valid;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/progress-issues")
@PreAuthorize("hasAnyRole('PROJECT_MANAGER','SITE_ENGINEER','CONSTRUCTION_SUPERVISOR','SYSTEM_ADMINISTRATOR')")
public class ProgressIssueController {

    private final ProgressIssueService service;

    public ProgressIssueController(
            ProgressIssueService service) {

        this.service = service;
    }

    @PostMapping
    public ProgressIssueDtos.Response create(
            @Valid @RequestBody ProgressIssueDtos.Request request) {

        return service.create(request);
    }

    @GetMapping
    public Page<ProgressIssueDtos.Response> list(
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) sliit.construction.construction.entity.IssueStatus status,
            Pageable pageable) {

        return service.list(projectId, status, pageable);
    }

    @GetMapping("/{id}")
    public ProgressIssueDtos.Response get(
            @PathVariable Long id) {

        return service.get(id);
    }

    @PutMapping("/{id}")
    public ProgressIssueDtos.Response update(
            @PathVariable Long id,
            @Valid @RequestBody ProgressIssueDtos.Request request) {

        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {

        service.delete(id);
    }
}