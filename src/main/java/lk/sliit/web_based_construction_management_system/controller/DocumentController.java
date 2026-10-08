package lk.sliit.web_based_construction_management_system.controller;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import sliit.construction.construction.dto.DocumentDtos;
import sliit.construction.construction.service.DocumentService;

import java.util.Map;

@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService service;

    public DocumentController(DocumentService service) {
        this.service = service;
    }

    // =========================================================
    // CREATE DOCUMENT METADATA
    // =========================================================
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("""
            hasAnyRole(
                'PROJECT_MANAGER',
                'SITE_ENGINEER',
                'CONSTRUCTION_SUPERVISOR',
                'PROCUREMENT_OFFICER',
                'SYSTEM_ADMINISTRATOR'
            )
            """)
    public DocumentDtos.Response create(@Valid @RequestBody DocumentDtos.Request request) {
        return service.create(request);
    }

    // =========================================================
    // UPLOAD PHYSICAL FILE
    // =========================================================
    @PostMapping("/upload")
    @PreAuthorize("""
            hasAnyRole(
                'PROJECT_MANAGER',
                'SITE_ENGINEER',
                'CONSTRUCTION_SUPERVISOR',
                'PROCUREMENT_OFFICER',
                'SYSTEM_ADMINISTRATOR'
            )
            """)
    public ResponseEntity<Map<String, String>> uploadFile(@RequestParam("file") MultipartFile file) {
        String fileUrl = service.uploadFile(file);
        String originalName = file.getOriginalFilename() != null ? file.getOriginalFilename() : "document";
        long bytes = file.getSize();
        String sizeFormatted = bytes >= 1024 * 1024
                ? String.format("%.2f MB", bytes / (1024.0 * 1024.0))
                : String.format("%.1f KB", bytes / 1024.0);

        return ResponseEntity.ok(Map.of(
                "fileUrl", fileUrl,
                "fileName", originalName,
                "fileSize", sizeFormatted
        ));
    }

    // =========================================================
    // READ / SEARCH ALL
    // =========================================================
    @GetMapping
    public Page<DocumentDtos.Response> list(
            @RequestParam(required = false) Long projectId,
            @RequestParam(required = false) String documentType,
            @RequestParam(required = false) String search,
            Pageable pageable
    ) {
        return service.list(projectId, documentType, search, pageable);
    }

    // =========================================================
    // GET STATS COUNTS
    // =========================================================
    @GetMapping("/stats")
    public DocumentDtos.StatsResponse getStats() {
        return service.getStats();
    }

    // =========================================================
    // READ ONE
    // =========================================================
    @GetMapping("/{id}")
    public DocumentDtos.Response get(@PathVariable Long id) {
        return service.get(id);
    }

    // =========================================================
    // UPDATE
    // =========================================================
    @PutMapping("/{id}")
    @PreAuthorize("""
            hasAnyRole(
                'PROJECT_MANAGER',
                'SITE_ENGINEER',
                'CONSTRUCTION_SUPERVISOR',
                'PROCUREMENT_OFFICER',
                'SYSTEM_ADMINISTRATOR'
            )
            """)
    public DocumentDtos.Response update(
            @PathVariable Long id,
            @Valid @RequestBody DocumentDtos.Request request
    ) {
        return service.update(id, request);
    }

    // =========================================================
    // DELETE
    // =========================================================
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("""
            hasAnyRole(
                'PROJECT_MANAGER',
                'SITE_ENGINEER',
                'CONSTRUCTION_SUPERVISOR',
                'PROCUREMENT_OFFICER',
                'SYSTEM_ADMINISTRATOR'
            )
            """)
    public void delete(@PathVariable Long id) {
        service.delete(id);
    }
}
