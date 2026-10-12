package sliit.construction.construction.controller;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sliit.construction.construction.dto.RoleDtos;
import sliit.construction.construction.service.RoleService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/roles")
@PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
public class RoleController {

    private final RoleService roleService;

    public RoleController(RoleService roleService) {
        this.roleService = roleService;
    }

    // =========================================================
    // CREATE ROLE
    // =========================================================
    @PostMapping
    public ResponseEntity<RoleDtos.Response> create(@Valid @RequestBody RoleDtos.Request request) {
        RoleDtos.Response response = roleService.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // =========================================================
    // GET ALL ROLES (PAGINATED & SEARCHABLE)
    // =========================================================
    @GetMapping
    public Page<RoleDtos.Response> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            Pageable pageable) {
        return roleService.list(search, category, pageable);
    }

    // =========================================================
    // GET ALL ROLES (LIST FOR SELECTORS)
    // =========================================================
    @GetMapping("/all")
    public List<RoleDtos.Response> getAllRoles() {
        return roleService.getAllRoles();
    }

    // =========================================================
    // GET ROLE METRICS / STATS
    // =========================================================
    @GetMapping("/stats")
    public Map<String, Object> getRoleStats() {
        return roleService.getRoleStats();
    }

    // =========================================================
    // GET AVAILABLE PERMISSIONS MATRIX
    // =========================================================
    @GetMapping("/permissions")
    public List<RoleDtos.PermissionGroupDto> getAvailablePermissions() {
        return roleService.getAvailablePermissions();
    }

    // =========================================================
    // GET ROLE BY ID
    // =========================================================
    @GetMapping("/{id}")
    public RoleDtos.Response get(@PathVariable Long id) {
        return roleService.get(id);
    }

    // =========================================================
    // UPDATE ROLE
    // =========================================================
    @PutMapping("/{id}")
    public RoleDtos.Response update(
            @PathVariable Long id,
            @Valid @RequestBody RoleDtos.Request request) {
        return roleService.update(id, request);
    }

    // =========================================================
    // DELETE ROLE
    // =========================================================
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id) {
        roleService.delete(id);
        return ResponseEntity.ok(Map.of("message", "Role deleted successfully."));
    }
}
