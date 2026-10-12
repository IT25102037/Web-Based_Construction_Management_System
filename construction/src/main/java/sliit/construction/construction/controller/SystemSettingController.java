package sliit.construction.construction.controller;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sliit.construction.construction.dto.SystemSettingDtos;
import sliit.construction.construction.service.SystemSettingService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/settings")
@PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
public class SystemSettingController {

    private final SystemSettingService systemSettingService;

    public SystemSettingController(SystemSettingService systemSettingService) {
        this.systemSettingService = systemSettingService;
    }

    // =========================================================
    // 1. CREATE SETTING
    // =========================================================
    @PostMapping
    public ResponseEntity<SystemSettingDtos.Response> create(@Valid @RequestBody SystemSettingDtos.Request request) {
        SystemSettingDtos.Response response = systemSettingService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // =========================================================
    // 2. GET ALL SETTINGS (PAGINATED & FILTERED)
    // =========================================================
    @GetMapping
    public Page<SystemSettingDtos.Response> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            Pageable pageable
    ) {
        return systemSettingService.list(search, category, pageable);
    }

    // =========================================================
    // 3. GET ALL SETTINGS (LIST)
    // =========================================================
    @GetMapping("/all")
    public List<SystemSettingDtos.Response> getAllSettings() {
        return systemSettingService.getAllSettings();
    }

    // =========================================================
    // 4. GET SYSTEM SETTING STATS
    // =========================================================
    @GetMapping("/stats")
    public Map<String, Object> getSettingStats() {
        return systemSettingService.getSettingStats();
    }

    // =========================================================
    // 5. GET SETTING BY ID
    // =========================================================
    @GetMapping("/{id}")
    public SystemSettingDtos.Response get(@PathVariable Long id) {
        return systemSettingService.get(id);
    }

    // =========================================================
    // 6. GET SETTING BY KEY
    // =========================================================
    @GetMapping("/key/{key}")
    public SystemSettingDtos.Response getByKey(@PathVariable String key) {
        return systemSettingService.getByKey(key);
    }

    // =========================================================
    // 7. UPDATE SETTING
    // =========================================================
    @PutMapping("/{id}")
    public SystemSettingDtos.Response update(
            @PathVariable Long id,
            @Valid @RequestBody SystemSettingDtos.Request request
    ) {
        return systemSettingService.update(id, request);
    }

    // =========================================================
    // 8. DELETE SETTING
    // =========================================================
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        systemSettingService.delete(id);
        return ResponseEntity.ok(Map.of("message", "System setting deleted successfully."));
    }
}
