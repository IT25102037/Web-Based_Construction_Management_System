package sliit.construction.construction.controller;

import sliit.construction.construction.dto.ClientProjectRequestDtos;
import sliit.construction.construction.service.ClientProjectRequestService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/client/project-requests")
@PreAuthorize("hasRole('CLIENT')")
public class ClientProjectRequestController {

    private final ClientProjectRequestService service;


    public ClientProjectRequestController(
            ClientProjectRequestService service
    ) {

        this.service = service;
    }


    /*
     * ==========================================
     * CREATE
     * POST /api/client/project-requests
     * ==========================================
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ClientProjectRequestDtos.Response create(
            Authentication authentication,
            @Valid @RequestBody
            ClientProjectRequestDtos.Request request
    ) {

        return service.create(
                authentication.getName(),
                request
        );
    }


    /*
     * ==========================================
     * READ ALL
     * GET /api/client/project-requests
     * ==========================================
     */
    @GetMapping
    public List<ClientProjectRequestDtos.Response>
    getMyRequests(
            Authentication authentication
    ) {

        return service.getMyRequests(
                authentication.getName()
        );
    }


    /*
     * ==========================================
     * READ ONE
     * GET /api/client/project-requests/{id}
     * ==========================================
     */
    @GetMapping("/{id}")
    public ClientProjectRequestDtos.Response getMyRequest(
            Authentication authentication,
            @PathVariable Long id
    ) {

        return service.getMyRequest(
                authentication.getName(),
                id
        );
    }


    /*
     * ==========================================
     * UPDATE
     * PUT /api/client/project-requests/{id}
     * ==========================================
     */
    @PutMapping("/{id}")
    public ClientProjectRequestDtos.Response update(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody
            ClientProjectRequestDtos.Request request
    ) {

        return service.update(
                authentication.getName(),
                id,
                request
        );
    }


    /*
     * ==========================================
     * DELETE
     * DELETE /api/client/project-requests/{id}
     * ==========================================
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(
            Authentication authentication,
            @PathVariable Long id
    ) {

        service.delete(
                authentication.getName(),
                id
        );
    }
}
