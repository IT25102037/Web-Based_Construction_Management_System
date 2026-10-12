package sliit.construction.construction.controller;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import sliit.construction.construction.dto.ClientProjectRequestDtos;
import sliit.construction.construction.dto.ProjectDtos;
import sliit.construction.construction.entity.ProjectRequestStatus;
import sliit.construction.construction.service.ClientProjectRequestService;

import java.util.List;

@RestController
@RequestMapping("/api/client-project-requests")
@PreAuthorize("hasAnyRole('PROJECT_MANAGER', 'SYSTEM_ADMINISTRATOR', 'SITE_ENGINEER', 'CONSTRUCTION_SUPERVISOR', 'CLIENT')")
public class StaffClientProjectRequestController {

    private final ClientProjectRequestService service;

    public StaffClientProjectRequestController(ClientProjectRequestService service) {
        this.service = service;
    }

    /*
     * ==========================================
     * LIST ALL CLIENT PROJECT REQUESTS (STAFF)
     * GET /api/client-project-requests
     * GET /api/client-project-requests?status=PENDING
     * ==========================================
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('PROJECT_MANAGER', 'SYSTEM_ADMINISTRATOR', 'SITE_ENGINEER', 'CONSTRUCTION_SUPERVISOR')")
    public List<ClientProjectRequestDtos.Response> getAllRequests(
            @RequestParam(required = false) ProjectRequestStatus status
    ) {
        return service.getAllRequests(status);
    }

    /*
     * ==========================================
     * GET ONE REQUEST DETAILS (STAFF OR CLIENT)
     * GET /api/client-project-requests/{id}
     * ==========================================
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ClientProjectRequestDtos.Response getRequestById(@PathVariable Long id) {
        return service.getRequestById(id);
    }

    /*
     * ==========================================
     * UPDATE REQUEST STATUS (ACCEPT, REJECT, PENDING)
     * PATCH /api/client-project-requests/{id}/status
     * PUT /api/client-project-requests/{id}/status
     * ==========================================
     */
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('PROJECT_MANAGER', 'SYSTEM_ADMINISTRATOR')")
    public ClientProjectRequestDtos.Response updateStatusPatch(
            @PathVariable Long id,
            @Valid @RequestBody ClientProjectRequestDtos.StatusUpdateRequest request,
            Authentication authentication
    ) {
        return service.updateStatus(id, request, authentication.getName());
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('PROJECT_MANAGER', 'SYSTEM_ADMINISTRATOR')")
    public ClientProjectRequestDtos.Response updateStatusPut(
            @PathVariable Long id,
            @Valid @RequestBody ClientProjectRequestDtos.StatusUpdateRequest request,
            Authentication authentication
    ) {
        return service.updateStatus(id, request, authentication.getName());
    }

    /*
     * ==========================================
     * CONVERT APPROVED REQUEST TO ACTIVE PROJECT
     * POST /api/client-project-requests/{id}/convert
     * ==========================================
     */
    @PostMapping("/{id}/convert")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('PROJECT_MANAGER', 'SYSTEM_ADMINISTRATOR')")
    public ProjectDtos.Response convertToProject(
            @PathVariable Long id,
            Authentication authentication
    ) {
        return service.convertToProject(id, authentication.getName());
    }
}
