package sliit.construction.construction.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sliit.construction.construction.dto.RoleDtos;
import sliit.construction.construction.entity.Role;
import sliit.construction.construction.entity.RoleEntity;
import sliit.construction.construction.exception.DuplicateResourceException;
import sliit.construction.construction.exception.ResourceNotFoundException;
import sliit.construction.construction.exception.UnauthorizedActionException;
import sliit.construction.construction.repository.RoleRepository;
import sliit.construction.construction.repository.UserRepository;

import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepo;
    private final UserRepository userRepo;

    public RoleServiceImpl(RoleRepository roleRepo, UserRepository userRepo) {
        this.roleRepo = roleRepo;
        this.userRepo = userRepo;
    }

    // =========================================================
    // CREATE ROLE
    // =========================================================
    @Override
    public RoleDtos.Response create(RoleDtos.Request request) {
        String normalizedCode = request.roleCode().trim().toUpperCase().replaceAll("[\\s-]+", "_");

        if (roleRepo.existsByRoleCodeIgnoreCase(normalizedCode)) {
            throw new DuplicateResourceException("Role code '" + normalizedCode + "' already exists.");
        }

        RoleEntity entity = RoleEntity.builder()
                .roleCode(normalizedCode)
                .roleName(request.roleName().trim())
                .description(request.description() != null ? request.description().trim() : "")
                .category(request.category() != null ? request.category().trim().toUpperCase() : "GENERAL")
                .color(request.color() != null && !request.color().isBlank() ? request.color().trim() : "#ff7a1a")
                .isSystemRole(false)
                .permissions(request.permissions() != null ? new HashSet<>(request.permissions()) : new HashSet<>())
                .build();

        RoleEntity saved = roleRepo.save(entity);
        return mapToDto(saved);
    }

    // =========================================================
    // LIST ROLES (PAGINATED & FILTERED)
    // =========================================================
    @Override
    @Transactional(readOnly = true)
    public Page<RoleDtos.Response> list(String search, String category, Pageable pageable) {
        Page<RoleEntity> page;

        if (category != null && !category.isBlank() && !category.equalsIgnoreCase("ALL")) {
            page = roleRepo.findByCategoryIgnoreCase(category.trim(), pageable);
        } else if (search != null && !search.isBlank()) {
            String q = search.trim();
            page = roleRepo.findByRoleNameContainingIgnoreCaseOrRoleCodeContainingIgnoreCaseOrDescriptionContainingIgnoreCase(
                    q, q, q, pageable
            );
        } else {
            page = roleRepo.findAll(pageable);
        }

        return page.map(this::mapToDto);
    }

    // =========================================================
    // GET ALL ROLES (FOR DROPDOWNS / ASSIGNMENTS)
    // =========================================================
    @Override
    @Transactional(readOnly = true)
    public List<RoleDtos.Response> getAllRoles() {
        return roleRepo.findAllByOrderByRoleNameAsc().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    // =========================================================
    // GET ROLE BY ID
    // =========================================================
    @Override
    @Transactional(readOnly = true)
    public RoleDtos.Response get(Long id) {
        return mapToDto(getEntity(id));
    }

    // =========================================================
    // GET ROLE BY CODE
    // =========================================================
    @Override
    @Transactional(readOnly = true)
    public RoleDtos.Response getByCode(String roleCode) {
        RoleEntity entity = roleRepo.findByRoleCodeIgnoreCase(roleCode.trim())
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with code: " + roleCode));
        return mapToDto(entity);
    }

    // =========================================================
    // UPDATE ROLE
    // =========================================================
    @Override
    public RoleDtos.Response update(Long id, RoleDtos.Request request) {
        RoleEntity entity = getEntity(id);

        String normalizedCode = request.roleCode().trim().toUpperCase().replaceAll("[\\s-]+", "_");

        // If code is modified, verify uniqueness
        if (!entity.getRoleCode().equalsIgnoreCase(normalizedCode)) {
            if (Boolean.TRUE.equals(entity.getIsSystemRole())) {
                throw new UnauthorizedActionException("System role code '" + entity.getRoleCode() + "' cannot be renamed.");
            }
            if (roleRepo.existsByRoleCodeIgnoreCase(normalizedCode)) {
                throw new DuplicateResourceException("Role code '" + normalizedCode + "' already exists.");
            }
            entity.setRoleCode(normalizedCode);
        }

        entity.setRoleName(request.roleName().trim());
        entity.setDescription(request.description() != null ? request.description().trim() : "");
        entity.setCategory(request.category() != null ? request.category().trim().toUpperCase() : "GENERAL");
        if (request.color() != null && !request.color().isBlank()) {
            entity.setColor(request.color().trim());
        }
        if (request.permissions() != null) {
            entity.setPermissions(new HashSet<>(request.permissions()));
        }

        RoleEntity updated = roleRepo.save(entity);
        return mapToDto(updated);
    }

    // =========================================================
    // DELETE ROLE (WITH INTEGRITY CHECKS)
    // =========================================================
    @Override
    public void delete(Long id) {
        RoleEntity entity = getEntity(id);

        // Disallow deletion of core SYSTEM_ADMINISTRATOR role
        if ("SYSTEM_ADMINISTRATOR".equalsIgnoreCase(entity.getRoleCode())) {
            throw new UnauthorizedActionException("The System Administrator role is protected and cannot be deleted.");
        }

        // Check if any users are assigned to this role
        long count = calculateUserCount(entity.getRoleCode());
        if (count > 0) {
            throw new UnauthorizedActionException("Cannot delete role '" + entity.getRoleName() +
                    "' because " + count + " user account(s) are currently assigned to it. Reassign users before deleting.");
        }

        roleRepo.delete(entity);
    }

    // =========================================================
    // GET ENTITY
    // =========================================================
    @Override
    @Transactional(readOnly = true)
    public RoleEntity getEntity(Long id) {
        return roleRepo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with ID: " + id));
    }

    // =========================================================
    // GET ROLE METRICS / STATS
    // =========================================================
    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getRoleStats() {
        List<RoleEntity> allRoles = roleRepo.findAll();
        long totalRoles = allRoles.size();
        long systemRoles = allRoles.stream().filter(r -> Boolean.TRUE.equals(r.getIsSystemRole())).count();
        long customRoles = totalRoles - systemRoles;

        Set<String> uniquePermissionsAssigned = allRoles.stream()
                .flatMap(r -> r.getPermissions().stream())
                .collect(Collectors.toSet());

        long totalUsersAssigned = userRepo.count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalRoles", totalRoles);
        stats.put("systemRoles", systemRoles);
        stats.put("customRoles", customRoles);
        stats.put("assignedPermissions", uniquePermissionsAssigned.size());
        stats.put("totalUsersAssigned", totalUsersAssigned);
        stats.put("totalAvailablePermissions", 36);

        return stats;
    }

    // =========================================================
    // AVAILABLE SYSTEM PERMISSIONS MATRIX
    // =========================================================
    @Override
    public List<RoleDtos.PermissionGroupDto> getAvailablePermissions() {
        List<RoleDtos.PermissionGroupDto> groups = new ArrayList<>();

        // 1. Projects
        groups.add(new RoleDtos.PermissionGroupDto(
                "PROJECTS", "Project Management", "bi bi-building",
                "Control project lifecycles, budgets, locations, and manager assignments.",
                List.of(
                        new RoleDtos.PermissionItemDto("PROJECT_VIEW", "View Projects", "Can view all construction projects and basic details", "READ"),
                        new RoleDtos.PermissionItemDto("PROJECT_CREATE", "Create Project", "Can create and initiate new construction projects", "WRITE"),
                        new RoleDtos.PermissionItemDto("PROJECT_EDIT", "Edit Project", "Can edit project scope, timeline, and financials", "WRITE"),
                        new RoleDtos.PermissionItemDto("PROJECT_DELETE", "Delete Project", "Can archive or delete project entries", "DELETE"),
                        new RoleDtos.PermissionItemDto("PROJECT_ASSIGN", "Assign Resources", "Can allocate managers, engineers, and workforce", "ADMIN")
                )
        ));

        // 2. Tasks & Assignments
        groups.add(new RoleDtos.PermissionGroupDto(
                "TASKS", "Tasks & Workforce", "bi bi-clipboard-check",
                "Manage construction task scheduling, priorities, and workforce assignments.",
                List.of(
                        new RoleDtos.PermissionItemDto("TASK_VIEW", "View Tasks", "Can view task lists and assignment rosters", "READ"),
                        new RoleDtos.PermissionItemDto("TASK_CREATE", "Create Tasks", "Can create new operational and field tasks", "WRITE"),
                        new RoleDtos.PermissionItemDto("TASK_EDIT", "Update Tasks", "Can update task status, progress, and dates", "WRITE"),
                        new RoleDtos.PermissionItemDto("TASK_DELETE", "Delete Tasks", "Can remove tasks from project schedules", "DELETE"),
                        new RoleDtos.PermissionItemDto("TASK_ASSIGN", "Assign Tasks", "Can assign tasks to site engineers and supervisors", "ADMIN")
                )
        ));

        // 3. Milestones
        groups.add(new RoleDtos.PermissionGroupDto(
                "MILESTONES", "Milestones Management", "bi bi-flag-fill",
                "Track structural milestones, target dates, and completion status.",
                List.of(
                        new RoleDtos.PermissionItemDto("MILESTONE_VIEW", "View Milestones", "Can view all project milestone timelines", "READ"),
                        new RoleDtos.PermissionItemDto("MILESTONE_CREATE", "Create Milestone", "Can add target project milestones", "WRITE"),
                        new RoleDtos.PermissionItemDto("MILESTONE_EDIT", "Edit Milestone", "Can edit milestone criteria and completion status", "WRITE"),
                        new RoleDtos.PermissionItemDto("MILESTONE_DELETE", "Delete Milestone", "Can remove milestones from project records", "DELETE")
                )
        ));

        // 4. Progress & Quality Issues
        groups.add(new RoleDtos.PermissionGroupDto(
                "PROGRESS", "Progress & Quality Control", "bi bi-graph-up-arrow",
                "Daily progress monitoring, delay logging, and structural issue resolution.",
                List.of(
                        new RoleDtos.PermissionItemDto("PROGRESS_VIEW", "View Progress", "Can view progress metrics, photos, and reports", "READ"),
                        new RoleDtos.PermissionItemDto("PROGRESS_UPDATE", "Submit Updates", "Can post daily on-site progress updates", "WRITE"),
                        new RoleDtos.PermissionItemDto("ISSUE_CREATE", "Log Progress Issues", "Can report safety, material, and site delays", "WRITE"),
                        new RoleDtos.PermissionItemDto("ISSUE_RESOLVE", "Resolve Issues", "Can inspect and mark issues as resolved", "ADMIN"),
                        new RoleDtos.PermissionItemDto("PROGRESS_REPORT", "Generate Reports", "Can generate automated progress summaries", "WRITE")
                )
        ));

        // 5. Materials & Inventory
        groups.add(new RoleDtos.PermissionGroupDto(
                "MATERIALS", "Materials & Stock Inventory", "bi bi-box-seam-fill",
                "Stock transactions, warehouse material catalog, unit pricing, and thresholds.",
                List.of(
                        new RoleDtos.PermissionItemDto("MATERIAL_VIEW", "View Inventory", "Can view material stock levels and pricing", "READ"),
                        new RoleDtos.PermissionItemDto("MATERIAL_CREATE", "Add Material", "Can register new items in the material catalog", "WRITE"),
                        new RoleDtos.PermissionItemDto("MATERIAL_EDIT", "Edit Material", "Can adjust prices, categories, and min stock", "WRITE"),
                        new RoleDtos.PermissionItemDto("MATERIAL_DELETE", "Delete Material", "Can remove materials from inventory", "DELETE"),
                        new RoleDtos.PermissionItemDto("STOCK_ADJUST", "Stock Adjustment", "Can perform incoming/outgoing stock transactions", "ADMIN")
                )
        ));

        // 6. Material Requests & Approvals
        groups.add(new RoleDtos.PermissionGroupDto(
                "MATERIAL_REQUESTS", "Material Requests & Procurement", "bi bi-file-earmark-plus-fill",
                "Requisition workflows, manager approvals, and fulfillment tracking.",
                List.of(
                        new RoleDtos.PermissionItemDto("MATERIAL_REQUEST_VIEW", "View Requests", "Can view all site material requests", "READ"),
                        new RoleDtos.PermissionItemDto("MATERIAL_REQUEST_CREATE", "Create Request", "Can submit material requisitions from sites", "WRITE"),
                        new RoleDtos.PermissionItemDto("MATERIAL_REQUEST_APPROVE", "Approve Request", "Can approve procurement requisitions", "ADMIN"),
                        new RoleDtos.PermissionItemDto("MATERIAL_REQUEST_REJECT", "Reject Request", "Can reject or send back requisitions", "ADMIN")
                )
        ));

        // 7. Suppliers & Vendors
        groups.add(new RoleDtos.PermissionGroupDto(
                "SUPPLIERS", "Supplier & Vendor Management", "bi bi-truck",
                "Vendor directory, contracts, delivery logs, and rating metrics.",
                List.of(
                        new RoleDtos.PermissionItemDto("SUPPLIER_VIEW", "View Suppliers", "Can view vendor contacts and details", "READ"),
                        new RoleDtos.PermissionItemDto("SUPPLIER_CREATE", "Register Supplier", "Can add new supplier profiles", "WRITE"),
                        new RoleDtos.PermissionItemDto("SUPPLIER_EDIT", "Edit Supplier", "Can modify supplier contracts and terms", "WRITE"),
                        new RoleDtos.PermissionItemDto("SUPPLIER_DELETE", "Delete Supplier", "Can archive or delete supplier records", "DELETE")
                )
        ));

        // 8. Documents & Blueprints
        groups.add(new RoleDtos.PermissionGroupDto(
                "DOCUMENTS", "Documents & Blueprints", "bi bi-file-earmark-text-fill",
                "Architectural drawings, structural permits, and inspection certificates.",
                List.of(
                        new RoleDtos.PermissionItemDto("DOCUMENT_VIEW", "View Documents", "Can view and download project files", "READ"),
                        new RoleDtos.PermissionItemDto("DOCUMENT_UPLOAD", "Upload Documents", "Can upload PDFs, blueprints, and permits", "WRITE"),
                        new RoleDtos.PermissionItemDto("DOCUMENT_DELETE", "Delete Documents", "Can delete project documents", "DELETE")
                )
        ));

        // 9. Reports & Audits
        groups.add(new RoleDtos.PermissionGroupDto(
                "REPORTS", "Reports & Analytics", "bi bi-bar-chart-line",
                "Executive analytics, cost distribution, milestone forecasting, and exports.",
                List.of(
                        new RoleDtos.PermissionItemDto("REPORT_VIEW", "View Analytics", "Can access reporting dashboards", "READ"),
                        new RoleDtos.PermissionItemDto("REPORT_EXPORT", "Export PDF/Excel", "Can export system logs and financial reports", "ADMIN")
                )
        ));

        // 10. System Administration & Roles
        groups.add(new RoleDtos.PermissionGroupDto(
                "ADMINISTRATION", "Administration & Security", "bi bi-shield-lock-fill",
                "Full user management, role creation, permission assignment, and security logs.",
                List.of(
                        new RoleDtos.PermissionItemDto("USER_VIEW", "View Users", "Can view staff and client accounts", "READ"),
                        new RoleDtos.PermissionItemDto("USER_MANAGE", "Manage Users", "Can create, edit, activate, or delete users", "ADMIN"),
                        new RoleDtos.PermissionItemDto("ROLE_MANAGE", "Manage Roles & Access", "Can create and configure custom roles & permissions", "ADMIN"),
                        new RoleDtos.PermissionItemDto("SYSTEM_CONFIG", "System Configuration", "Can alter system-wide parameters and audit logs", "ADMIN")
                )
        ));

        return groups;
    }

    // =========================================================
    // HELPER: CALCULATE ASSIGNED USERS
    // =========================================================
    private long calculateUserCount(String roleCode) {
        if (roleCode == null) return 0;
        try {
            Role enumRole = Role.valueOf(roleCode.toUpperCase());
            return userRepo.countByRole(enumRole);
        } catch (IllegalArgumentException e) {
            // For custom roles not in default enum, return 0 or query custom
            return 0;
        }
    }

    // =========================================================
    // MAPPER: ENTITY -> DTO
    // =========================================================
    private RoleDtos.Response mapToDto(RoleEntity entity) {
        long userCount = calculateUserCount(entity.getRoleCode());

        return new RoleDtos.Response(
                entity.getId(),
                entity.getRoleCode(),
                entity.getRoleName(),
                entity.getDescription(),
                entity.getCategory(),
                entity.getColor() != null ? entity.getColor() : "#ff7a1a",
                entity.getIsSystemRole(),
                entity.getPermissions() != null ? entity.getPermissions() : Collections.emptySet(),
                userCount,
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
