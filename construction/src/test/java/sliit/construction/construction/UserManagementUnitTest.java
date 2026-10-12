package sliit.construction.construction;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import sliit.construction.construction.dto.UserDtos;
import sliit.construction.construction.entity.Role;
import sliit.construction.construction.entity.User;
import sliit.construction.construction.exception.DuplicateResourceException;
import sliit.construction.construction.exception.ResourceNotFoundException;
import sliit.construction.construction.repository.*;
import sliit.construction.construction.service.UserServiceImpl;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UserManagementUnitTest {

    private UserRepository userRepo;
    private ProjectRepository projectRepo;
    private TaskRepository taskRepo;
    private TaskAssignmentRepository taskAssignmentRepo;
    private DocumentRepository documentRepo;
    private ProgressReportRepository progressReportRepo;
    private ProgressIssueRepository progressIssueRepo;
    private NotificationRepository notificationRepo;
    private ClientProjectRequestRepository clientProjectRequestRepo;
    private PasswordEncoder encoder;
    private UserServiceImpl userService;

    @BeforeEach
    void setUp() {
        userRepo = mock(UserRepository.class);
        projectRepo = mock(ProjectRepository.class);
        taskRepo = mock(TaskRepository.class);
        taskAssignmentRepo = mock(TaskAssignmentRepository.class);
        documentRepo = mock(DocumentRepository.class);
        progressReportRepo = mock(ProgressReportRepository.class);
        progressIssueRepo = mock(ProgressIssueRepository.class);
        notificationRepo = mock(NotificationRepository.class);
        clientProjectRequestRepo = mock(ClientProjectRequestRepository.class);
        encoder = new BCryptPasswordEncoder();
        userService = new UserServiceImpl(
                userRepo,
                encoder,
                projectRepo,
                taskRepo,
                taskAssignmentRepo,
                documentRepo,
                progressReportRepo,
                progressIssueRepo,
                notificationRepo,
                clientProjectRequestRepo
        );
    }

    @Test
    @DisplayName("Create User: Admin successfully creates a new user with BCrypt hashed password")
    void testCreateUserSuccess() {
        UserDtos.Request request = new UserDtos.Request(
                "john_engineer",
                "john.eng@wbcms.com",
                "Engineer#2026Secure",
                Role.SITE_ENGINEER,
                "John Engineer",
                "+94 77 123 4567"
        );

        when(userRepo.existsByUsername("john_engineer")).thenReturn(false);
        when(userRepo.existsByEmail("john.eng@wbcms.com")).thenReturn(false);
        when(userRepo.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(10L);
            u.setCreatedAt(LocalDateTime.now());
            u.setUpdatedAt(LocalDateTime.now());
            return u;
        });

        UserDtos.Response response = userService.create(request);

        assertNotNull(response);
        assertEquals(10L, response.id());
        assertEquals("john_engineer", response.username());
        assertEquals("john.eng@wbcms.com", response.email());
        assertEquals(Role.SITE_ENGINEER, response.role());
        assertEquals("John Engineer", response.fullName());
        assertEquals("+94 77 123 4567", response.phoneNumber());
        verify(userRepo, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("Create User: Duplicate username or email throws DuplicateResourceException")
    void testCreateUserDuplicateErrors() {
        UserDtos.Request req1 = new UserDtos.Request(
                "existinguser",
                "user@wbcms.com",
                "Password#123",
                Role.PROJECT_MANAGER,
                "Existing User",
                null
        );

        when(userRepo.existsByUsername("existinguser")).thenReturn(true);
        assertThrows(DuplicateResourceException.class, () -> userService.create(req1));

        UserDtos.Request req2 = new UserDtos.Request(
                "newuser",
                "existing@wbcms.com",
                "Password#123",
                Role.PROJECT_MANAGER,
                "New User",
                null
        );
        when(userRepo.existsByUsername("newuser")).thenReturn(false);
        when(userRepo.existsByEmail("existing@wbcms.com")).thenReturn(true);
        assertThrows(DuplicateResourceException.class, () -> userService.create(req2));
    }

    @Test
    @DisplayName("Read / List Users: Paginated search and role filter returns correct database items")
    void testListUsersWithFilter() {
        User u1 = User.builder()
                .id(1L)
                .username("siteengineer")
                .email("siteengineer@wbcms.com")
                .fullName("Sarah Jenkins")
                .role(Role.SITE_ENGINEER)
                .build();

        Pageable pageable = PageRequest.of(0, 10);
        Page<User> page = new PageImpl<>(List.of(u1), pageable, 1);

        when(userRepo.findByRole(Role.SITE_ENGINEER, pageable)).thenReturn(page);

        Page<UserDtos.Response> result = userService.list(null, "SITE_ENGINEER", pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        assertEquals("siteengineer", result.getContent().get(0).username());
    }

    @Test
    @DisplayName("Read Single User: Returns user response and throws ResourceNotFoundException on missing ID")
    void testGetUserById() {
        User u1 = User.builder()
                .id(5L)
                .username("procurement")
                .email("procurement@wbcms.com")
                .fullName("Elena Rostova")
                .role(Role.PROCUREMENT_OFFICER)
                .build();

        when(userRepo.findById(5L)).thenReturn(Optional.of(u1));
        when(userRepo.findById(99L)).thenReturn(Optional.empty());

        UserDtos.Response res = userService.get(5L);
        assertNotNull(res);
        assertEquals("procurement", res.username());

        assertThrows(ResourceNotFoundException.class, () -> userService.get(99L));
    }

    @Test
    @DisplayName("Update User: Successfully edits user details and keeps existing password when blank")
    void testUpdateUserKeepsPassword() {
        String originalHash = encoder.encode("InitialPassword#123");
        User existing = User.builder()
                .id(2L)
                .username("pm_user")
                .email("oldpm@wbcms.com")
                .passwordHash(originalHash)
                .fullName("Old Name")
                .phoneNumber("111")
                .role(Role.PROJECT_MANAGER)
                .build();

        when(userRepo.findById(2L)).thenReturn(Optional.of(existing));
        when(userRepo.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // Update with empty/blank password
        UserDtos.Request updateRequest = new UserDtos.Request(
                "pm_user",
                "newpm@wbcms.com",
                "",
                Role.PROJECT_MANAGER,
                "New Full Name",
                "222"
        );

        UserDtos.Response updated = userService.update(2L, updateRequest);

        assertNotNull(updated);
        assertEquals("New Full Name", updated.fullName());
        assertEquals("newpm@wbcms.com", updated.email());
        assertEquals("222", updated.phoneNumber());
        // Password hash must remain unchanged
        assertEquals(originalHash, existing.getPasswordHash());
    }

    @Test
    @DisplayName("Update User: Successfully hashes new password when provided")
    void testUpdateUserChangesPassword() {
        String originalHash = encoder.encode("OldPass#123");
        User existing = User.builder()
                .id(3L)
                .username("siteeng")
                .email("siteeng@wbcms.com")
                .passwordHash(originalHash)
                .fullName("Sarah")
                .role(Role.SITE_ENGINEER)
                .build();

        when(userRepo.findById(3L)).thenReturn(Optional.of(existing));
        when(userRepo.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserDtos.Request updateRequest = new UserDtos.Request(
                "siteeng",
                "siteeng@wbcms.com",
                "NewBrandNewPass#456",
                Role.SITE_ENGINEER,
                "Sarah",
                null
        );

        userService.update(3L, updateRequest);

        assertNotEquals(originalHash, existing.getPasswordHash());
        assertTrue(encoder.matches("NewBrandNewPass#456", existing.getPasswordHash()));
    }

    @Test
    @DisplayName("Delete User: Successfully deletes user entity and reassigns managed projects/tasks")
    void testDeleteUserSuccess() {
        User admin = User.builder()
                .id(1L)
                .username("admin")
                .role(Role.SYSTEM_ADMINISTRATOR)
                .build();

        User pmUser = User.builder()
                .id(15L)
                .username("pm_to_delete")
                .role(Role.PROJECT_MANAGER)
                .build();

        sliit.construction.construction.entity.Project project = sliit.construction.construction.entity.Project.builder()
                .id(100L)
                .name("Test Project")
                .manager(pmUser)
                .build();

        when(userRepo.findById(15L)).thenReturn(Optional.of(pmUser));
        when(userRepo.findByRole(Role.SYSTEM_ADMINISTRATOR)).thenReturn(List.of(admin));
        when(projectRepo.findByManager(pmUser)).thenReturn(List.of(project));

        userService.delete(15L);

        // Project manager should be reassigned to admin
        assertEquals(admin, project.getManager());
        verify(projectRepo, times(1)).save(project);
        verify(taskAssignmentRepo, times(1)).deleteByStaff(pmUser);
        verify(notificationRepo, times(1)).deleteByRecipient(pmUser);
        verify(userRepo, times(1)).delete(pmUser);
    }

    @Test
    @DisplayName("User Stats: Calculates real database metrics for all roles")
    void testGetUserStats() {
        when(userRepo.count()).thenReturn(10L);
        when(userRepo.countByRole(Role.PROJECT_MANAGER)).thenReturn(3L);
        when(userRepo.countByRole(Role.SITE_ENGINEER)).thenReturn(2L);
        when(userRepo.countByRole(Role.SYSTEM_ADMINISTRATOR)).thenReturn(1L);
        when(userRepo.countByRole(Role.CONSTRUCTION_SUPERVISOR)).thenReturn(2L);
        when(userRepo.countByRole(Role.PROCUREMENT_OFFICER)).thenReturn(1L);
        when(userRepo.countByRole(Role.CLIENT)).thenReturn(1L);

        Map<String, Object> stats = userService.getUserStats();

        assertEquals(10L, stats.get("totalUsers"));
        assertEquals(3L, stats.get("projectManagers"));
        assertEquals(2L, stats.get("siteEngineers"));
        assertEquals(1L, stats.get("administrators"));
    }
}
