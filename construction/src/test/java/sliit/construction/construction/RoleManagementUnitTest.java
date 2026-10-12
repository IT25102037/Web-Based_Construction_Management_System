package sliit.construction.construction;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import sliit.construction.construction.dto.RoleDtos;
import sliit.construction.construction.entity.Role;
import sliit.construction.construction.entity.RoleEntity;
import sliit.construction.construction.exception.DuplicateResourceException;
import sliit.construction.construction.exception.ResourceNotFoundException;
import sliit.construction.construction.exception.UnauthorizedActionException;
import sliit.construction.construction.repository.RoleRepository;
import sliit.construction.construction.repository.UserRepository;
import sliit.construction.construction.service.RoleServiceImpl;

import java.time.LocalDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class RoleManagementUnitTest {

    private RoleRepository roleRepo;
    private UserRepository userRepo;
    private RoleServiceImpl roleService;

    @BeforeEach
    void setUp() {
        roleRepo = mock(RoleRepository.class);
        userRepo = mock(UserRepository.class);
        roleService = new RoleServiceImpl(roleRepo, userRepo);
    }

    @Test
    @DisplayName("Create Role: Successfully creates a new custom role with uppercase code and permissions")
    void testCreateRoleSuccess() {
        RoleDtos.Request request = new RoleDtos.Request(
                "quality_auditor",
                "Quality Auditor",
                "Audits structural quality and code standards.",
                "SAFETY_QUALITY",
                "#10b981",
                Set.of("PROJECT_VIEW", "PROGRESS_VIEW", "DOCUMENT_VIEW")
        );

        when(roleRepo.existsByRoleCodeIgnoreCase("QUALITY_AUDITOR")).thenReturn(false);
        when(roleRepo.save(any(RoleEntity.class))).thenAnswer(invocation -> {
            RoleEntity entity = invocation.getArgument(0);
            entity.setId(10L);
            entity.setCreatedAt(LocalDateTime.now());
            entity.setUpdatedAt(LocalDateTime.now());
            return entity;
        });

        RoleDtos.Response created = roleService.create(request);

        assertNotNull(created);
        assertEquals(10L, created.id());
        assertEquals("QUALITY_AUDITOR", created.roleCode());
        assertEquals("Quality Auditor", created.roleName());
        assertEquals("SAFETY_QUALITY", created.category());
        assertEquals("#10b981", created.color());
        assertFalse(created.isSystemRole());
        assertEquals(3, created.permissions().size());
        assertTrue(created.permissions().contains("PROJECT_VIEW"));
        verify(roleRepo, times(1)).save(any(RoleEntity.class));
    }

    @Test
    @DisplayName("Create Role: Throws DuplicateResourceException if roleCode already exists")
    void testCreateRoleDuplicateError() {
        RoleDtos.Request request = new RoleDtos.Request(
                "PROJECT_MANAGER",
                "Duplicate PM",
                "Duplicate description",
                "MANAGEMENT",
                "#38bdf8",
                Set.of("PROJECT_VIEW")
        );

        when(roleRepo.existsByRoleCodeIgnoreCase("PROJECT_MANAGER")).thenReturn(true);

        assertThrows(DuplicateResourceException.class, () -> roleService.create(request));
        verify(roleRepo, never()).save(any(RoleEntity.class));
    }

    @Test
    @DisplayName("Read Roles: Successfully lists and filters roles with pagination")
    void testListRoles() {
        RoleEntity r1 = RoleEntity.builder()
                .id(1L)
                .roleCode("SITE_ENGINEER")
                .roleName("Site Engineer")
                .category("ENGINEERING")
                .color("#34d399")
                .isSystemRole(true)
                .permissions(Set.of("PROJECT_VIEW", "TASK_VIEW"))
                .build();

        Pageable pageable = PageRequest.of(0, 10);
        Page<RoleEntity> page = new PageImpl<>(List.of(r1), pageable, 1);

        when(roleRepo.findAll(pageable)).thenReturn(page);
        when(userRepo.countByRole(Role.SITE_ENGINEER)).thenReturn(3L);

        Page<RoleDtos.Response> result = roleService.list(null, "ALL", pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        RoleDtos.Response first = result.getContent().get(0);
        assertEquals("SITE_ENGINEER", first.roleCode());
        assertEquals(3L, first.userCount());
    }

    @Test
    @DisplayName("Read Single Role: Returns role by ID and throws 404 when not found")
    void testGetRoleById() {
        RoleEntity r1 = RoleEntity.builder()
                .id(5L)
                .roleCode("PROCUREMENT_OFFICER")
                .roleName("Procurement Officer")
                .category("PROCUREMENT")
                .color("#fbbf24")
                .isSystemRole(true)
                .permissions(Set.of("MATERIAL_VIEW", "SUPPLIER_VIEW"))
                .build();

        when(roleRepo.findById(5L)).thenReturn(Optional.of(r1));
        when(roleRepo.findById(99L)).thenReturn(Optional.empty());

        RoleDtos.Response found = roleService.get(5L);
        assertNotNull(found);
        assertEquals("PROCUREMENT_OFFICER", found.roleCode());

        assertThrows(ResourceNotFoundException.class, () -> roleService.get(99L));
    }

    @Test
    @DisplayName("Update Role: Successfully updates details and permissions")
    void testUpdateRoleSuccess() {
        RoleEntity existing = RoleEntity.builder()
                .id(20L)
                .roleCode("SAFETY_OFFICER")
                .roleName("Old Safety Title")
                .description("Old description")
                .category("OPERATIONS")
                .color("#ff0000")
                .isSystemRole(false)
                .permissions(new HashSet<>(Set.of("PROJECT_VIEW")))
                .build();

        when(roleRepo.findById(20L)).thenReturn(Optional.of(existing));
        when(roleRepo.save(any(RoleEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        RoleDtos.Request updateRequest = new RoleDtos.Request(
                "SAFETY_OFFICER",
                "Senior Health & Safety Officer",
                "Oversees safety compliance and hazardous site audits.",
                "SAFETY_QUALITY",
                "#f97316",
                Set.of("PROJECT_VIEW", "PROGRESS_VIEW", "ISSUE_CREATE", "ISSUE_RESOLVE")
        );

        RoleDtos.Response updated = roleService.update(20L, updateRequest);

        assertNotNull(updated);
        assertEquals("Senior Health & Safety Officer", updated.roleName());
        assertEquals("SAFETY_QUALITY", updated.category());
        assertEquals("#f97316", updated.color());
        assertEquals(4, updated.permissions().size());
        assertTrue(updated.permissions().contains("ISSUE_RESOLVE"));
    }

    @Test
    @DisplayName("Update Role: Renaming system role code is blocked with UnauthorizedActionException")
    void testUpdateSystemRoleCodeBlocked() {
        RoleEntity sysRole = RoleEntity.builder()
                .id(1L)
                .roleCode("SYSTEM_ADMINISTRATOR")
                .roleName("System Administrator")
                .category("ADMINISTRATION")
                .isSystemRole(true)
                .build();

        when(roleRepo.findById(1L)).thenReturn(Optional.of(sysRole));

        RoleDtos.Request renameRequest = new RoleDtos.Request(
                "SUPER_ADMIN",
                "System Administrator",
                "Desc",
                "ADMINISTRATION",
                "#f87171",
                Set.of("USER_MANAGE")
        );

        assertThrows(UnauthorizedActionException.class, () -> roleService.update(1L, renameRequest));
        verify(roleRepo, never()).save(any(RoleEntity.class));
    }

    @Test
    @DisplayName("Delete Role: Successfully deletes unassigned custom role")
    void testDeleteRoleSuccess() {
        RoleEntity customRole = RoleEntity.builder()
                .id(50L)
                .roleCode("TEMPORARY_INTERN")
                .roleName("Intern")
                .isSystemRole(false)
                .build();

        when(roleRepo.findById(50L)).thenReturn(Optional.of(customRole));

        roleService.delete(50L);

        verify(roleRepo, times(1)).delete(customRole);
    }

    @Test
    @DisplayName("Delete Role: Cannot delete SYSTEM_ADMINISTRATOR role")
    void testDeleteAdminRoleBlocked() {
        RoleEntity adminRole = RoleEntity.builder()
                .id(1L)
                .roleCode("SYSTEM_ADMINISTRATOR")
                .roleName("System Administrator")
                .isSystemRole(true)
                .build();

        when(roleRepo.findById(1L)).thenReturn(Optional.of(adminRole));

        UnauthorizedActionException ex = assertThrows(UnauthorizedActionException.class, () -> roleService.delete(1L));
        assertTrue(ex.getMessage().contains("System Administrator role is protected"));
        verify(roleRepo, never()).delete(any(RoleEntity.class));
    }

    @Test
    @DisplayName("Delete Role: Cannot delete role if active user accounts are assigned to it")
    void testDeleteRoleWithUsersBlocked() {
        RoleEntity pmRole = RoleEntity.builder()
                .id(2L)
                .roleCode("PROJECT_MANAGER")
                .roleName("Project Manager")
                .isSystemRole(true)
                .build();

        when(roleRepo.findById(2L)).thenReturn(Optional.of(pmRole));
        when(userRepo.countByRole(Role.PROJECT_MANAGER)).thenReturn(2L);

        UnauthorizedActionException ex = assertThrows(UnauthorizedActionException.class, () -> roleService.delete(2L));
        assertTrue(ex.getMessage().contains("user account(s) are currently assigned"));
        verify(roleRepo, never()).delete(any(RoleEntity.class));
    }

    @Test
    @DisplayName("Permissions Catalog & Stats: Returns categorized permission groups and correct counters")
    void testPermissionsAndStats() {
        List<RoleDtos.PermissionGroupDto> groups = roleService.getAvailablePermissions();
        assertNotNull(groups);
        assertFalse(groups.isEmpty());
        assertTrue(groups.stream().anyMatch(g -> g.module().equals("PROJECTS")));
        assertTrue(groups.stream().anyMatch(g -> g.module().equals("MATERIALS")));
        assertTrue(groups.stream().anyMatch(g -> g.module().equals("ADMINISTRATION")));

        RoleEntity r1 = RoleEntity.builder().id(1L).roleCode("SYSTEM_ADMINISTRATOR").isSystemRole(true).permissions(Set.of("P1", "P2")).build();
        RoleEntity r2 = RoleEntity.builder().id(2L).roleCode("CUSTOM_ROLE").isSystemRole(false).permissions(Set.of("P2", "P3")).build();

        when(roleRepo.findAll()).thenReturn(List.of(r1, r2));
        when(userRepo.count()).thenReturn(6L);

        Map<String, Object> stats = roleService.getRoleStats();
        assertEquals(2L, stats.get("totalRoles"));
        assertEquals(1L, stats.get("systemRoles"));
        assertEquals(1L, stats.get("customRoles"));
        assertEquals(3, stats.get("assignedPermissions"));
        assertEquals(6L, stats.get("totalUsersAssigned"));
    }
}
