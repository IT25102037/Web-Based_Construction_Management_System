package sliit.construction.construction;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import sliit.construction.construction.controller.NotificationController;
import sliit.construction.construction.dto.ClientProjectRequestDtos;
import sliit.construction.construction.dto.NotificationDtos;
import sliit.construction.construction.entity.*;
import sliit.construction.construction.repository.ClientProjectRequestRepository;
import sliit.construction.construction.repository.NotificationRepository;
import sliit.construction.construction.repository.ProjectRepository;
import sliit.construction.construction.repository.UserRepository;
import sliit.construction.construction.service.ClientProjectRequestServiceImpl;
import sliit.construction.construction.service.NotificationService;
import sliit.construction.construction.service.NotificationServiceImpl;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class NotificationSystemWorkflowUnitTest {

    @Mock
    private ClientProjectRequestRepository requestRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private ProjectRepository projectRepository;

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private NotificationService mockNotificationService;

    private ClientProjectRequestServiceImpl clientProjectRequestService;
    private NotificationServiceImpl realNotificationService;
    private NotificationController notificationController;

    private User clientUser;
    private User pmUser;
    private User siteEngUser;
    private User adminUser;

    @BeforeEach
    void setUp() {
        clientUser = new User();
        clientUser.setId(101L);
        clientUser.setUsername("apexclient");
        clientUser.setEmail("apex@client.com");
        clientUser.setFullName("Apex Client Corp");
        clientUser.setRole(Role.CLIENT);

        pmUser = new User();
        pmUser.setId(201L);
        pmUser.setUsername("projectmanager");
        pmUser.setEmail("pm@wbcms.com");
        pmUser.setFullName("David Miller (PM)");
        pmUser.setRole(Role.PROJECT_MANAGER);

        siteEngUser = new User();
        siteEngUser.setId(202L);
        siteEngUser.setUsername("siteengineer");
        siteEngUser.setEmail("se@wbcms.com");
        siteEngUser.setFullName("Sarah Jenkins (SE)");
        siteEngUser.setRole(Role.SITE_ENGINEER);

        adminUser = new User();
        adminUser.setId(203L);
        adminUser.setUsername("admin");
        adminUser.setEmail("admin@wbcms.com");
        adminUser.setFullName("System Admin");
        adminUser.setRole(Role.SYSTEM_ADMINISTRATOR);

        clientProjectRequestService = new ClientProjectRequestServiceImpl(
                requestRepository,
                userRepository,
                projectRepository,
                mockNotificationService
        );

        realNotificationService = new NotificationServiceImpl(
                notificationRepository,
                userRepository
        );

        notificationController = new NotificationController(
                realNotificationService,
                userRepository
        );
    }

    private Authentication createAuth(String username, String role) {
        return new UsernamePasswordAuthenticationToken(
                username,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + role))
        );
    }

    @Test
    @DisplayName("Workflow Step 1: Client submits project request -> Staff members receive notification")
    void testClientCreatesProjectRequest_StaffNotified() {
        // Arrange
        ClientProjectRequestDtos.Request requestDto = new ClientProjectRequestDtos.Request(
                "Skyline Commercial Tower",
                "Commercial High-Rise",
                "Downtown Colombo 03",
                "Constructing a 24-floor grade-A commercial office tower.",
                BigDecimal.valueOf(85000000.00),
                LocalDate.now().plusMonths(2)
        );

        when(userRepository.findByUsernameOrEmail("apexclient", "apexclient"))
                .thenReturn(Optional.of(clientUser));

        when(userRepository.findByRole(Role.PROJECT_MANAGER)).thenReturn(List.of(pmUser));
        when(userRepository.findByRole(Role.SITE_ENGINEER)).thenReturn(List.of(siteEngUser));
        when(userRepository.findByRole(Role.CONSTRUCTION_SUPERVISOR)).thenReturn(List.of());
        when(userRepository.findByRole(Role.SYSTEM_ADMINISTRATOR)).thenReturn(List.of(adminUser));

        when(requestRepository.save(any(ClientProjectRequest.class))).thenAnswer(invocation -> {
            ClientProjectRequest req = invocation.getArgument(0);
            req.setId(77L);
            req.setCreatedAt(LocalDateTime.now());
            return req;
        });

        // Act
        ClientProjectRequestDtos.Response response = clientProjectRequestService.create("apexclient", requestDto);

        // Assert
        assertNotNull(response);
        assertEquals("Skyline Commercial Tower", response.projectName());
        assertEquals(ProjectRequestStatus.PENDING, response.status());

        // Verify staff members received notifications
        ArgumentCaptor<NotificationDtos.Request> notifCaptor = ArgumentCaptor.forClass(NotificationDtos.Request.class);
        verify(mockNotificationService, times(3)).create(notifCaptor.capture());

        List<NotificationDtos.Request> capturedNotifs = notifCaptor.getAllValues();
        assertEquals(3, capturedNotifs.size());

        // Check recipients
        List<Long> recipientIds = capturedNotifs.stream().map(NotificationDtos.Request::recipientId).toList();
        assertTrue(recipientIds.contains(201L), "Project Manager must be notified");
        assertTrue(recipientIds.contains(202L), "Site Engineer must be notified");
        assertTrue(recipientIds.contains(203L), "Admin must be notified");

        // Check content
        NotificationDtos.Request pmNotif = capturedNotifs.stream().filter(n -> n.recipientId().equals(201L)).findFirst().orElseThrow();
        assertTrue(pmNotif.title().contains("Skyline Commercial Tower"));
        assertTrue(pmNotif.message().contains("Apex Client Corp"));
        assertTrue(pmNotif.message().contains("Downtown Colombo 03"));
        assertEquals("PROJECT_REQUEST:77", pmNotif.type());
    }

    @Test
    @DisplayName("Workflow Step 2: Project Manager accepts/approves request -> Client receives decision notification")
    void testProjectManagerApprovesRequest_ClientNotified() {
        // Arrange
        ClientProjectRequest existingRequest = ClientProjectRequest.builder()
                .id(77L)
                .client(clientUser)
                .projectName("Skyline Commercial Tower")
                .projectType("Commercial High-Rise")
                .location("Downtown Colombo 03")
                .description("Constructing a 24-floor grade-A commercial office tower.")
                .estimatedBudget(BigDecimal.valueOf(85000000.00))
                .preferredStartDate(LocalDate.now().plusMonths(2))
                .status(ProjectRequestStatus.PENDING)
                .build();

        when(requestRepository.findById(77L)).thenReturn(Optional.of(existingRequest));
        when(userRepository.findByUsernameOrEmail("projectmanager", "projectmanager"))
                .thenReturn(Optional.of(pmUser));
        when(requestRepository.save(any(ClientProjectRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ClientProjectRequestDtos.StatusUpdateRequest statusUpdate = new ClientProjectRequestDtos.StatusUpdateRequest(
                ProjectRequestStatus.APPROVED,
                "Approved after reviewing architectural viability and environmental clearance."
        );

        // Act
        ClientProjectRequestDtos.Response updated = clientProjectRequestService.updateStatus(77L, statusUpdate, "projectmanager");

        // Assert
        assertEquals(ProjectRequestStatus.APPROVED, updated.status());

        ArgumentCaptor<NotificationDtos.Request> notifCaptor = ArgumentCaptor.forClass(NotificationDtos.Request.class);
        verify(mockNotificationService, times(1)).create(notifCaptor.capture());

        NotificationDtos.Request clientNotif = notifCaptor.getValue();
        assertEquals(101L, clientNotif.recipientId(), "Notification recipient must be the client");
        assertTrue(clientNotif.title().contains("Approved"), "Title must state Approved");
        assertTrue(clientNotif.title().contains("Skyline Commercial Tower"));
        assertTrue(clientNotif.message().contains("ACCEPTED / APPROVED"));
        assertTrue(clientNotif.message().contains("David Miller (PM)"));
        assertTrue(clientNotif.message().contains("Approved after reviewing architectural viability"));
        assertEquals("PROJECT_REQUEST_STATUS:APPROVED:77", clientNotif.type());
    }

    @Test
    @DisplayName("Workflow Step 3: Project Manager rejects request -> Client receives rejection notification with remarks")
    void testProjectManagerRejectsRequest_ClientNotifiedWithRemarks() {
        // Arrange
        ClientProjectRequest existingRequest = ClientProjectRequest.builder()
                .id(88L)
                .client(clientUser)
                .projectName("Beachfront Cabanas")
                .projectType("Hospitality")
                .location("Mirissa Beach")
                .description("Wooden eco-cabanas on active coast buffer zone.")
                .estimatedBudget(BigDecimal.valueOf(12000000.00))
                .preferredStartDate(LocalDate.now().plusMonths(1))
                .status(ProjectRequestStatus.PENDING)
                .build();

        when(requestRepository.findById(88L)).thenReturn(Optional.of(existingRequest));
        when(userRepository.findByUsernameOrEmail("projectmanager", "projectmanager"))
                .thenReturn(Optional.of(pmUser));
        when(requestRepository.save(any(ClientProjectRequest.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ClientProjectRequestDtos.StatusUpdateRequest statusUpdate = new ClientProjectRequestDtos.StatusUpdateRequest(
                ProjectRequestStatus.REJECTED,
                "Zoning laws prohibit permanent construction in coastal buffer reserve."
        );

        // Act
        ClientProjectRequestDtos.Response updated = clientProjectRequestService.updateStatus(88L, statusUpdate, "projectmanager");

        // Assert
        assertEquals(ProjectRequestStatus.REJECTED, updated.status());

        ArgumentCaptor<NotificationDtos.Request> notifCaptor = ArgumentCaptor.forClass(NotificationDtos.Request.class);
        verify(mockNotificationService, times(1)).create(notifCaptor.capture());

        NotificationDtos.Request clientNotif = notifCaptor.getValue();
        assertEquals(101L, clientNotif.recipientId());
        assertTrue(clientNotif.title().contains("Rejected"));
        assertTrue(clientNotif.message().contains("REJECTED"));
        assertTrue(clientNotif.message().contains("Zoning laws prohibit permanent construction"));
        assertEquals("PROJECT_REQUEST_STATUS:REJECTED:88", clientNotif.type());
    }

    @Test
    @DisplayName("Security & Role-Based Access: Client cannot access or modify PM's notification")
    void testRoleBasedAccess_ClientCannotModifyPMNotification() {
        // Arrange: Notification belonging to PM (ID 201)
        Notification pmNotification = Notification.builder()
                .id(501L)
                .title("New Client Request")
                .message("Review request #77")
                .type("PROJECT_REQUEST:77")
                .readFlag(false)
                .recipient(pmUser)
                .build();

        when(notificationRepository.findById(501L)).thenReturn(Optional.of(pmNotification));
        when(userRepository.findByUsernameOrEmail("apexclient", "apexclient")).thenReturn(Optional.of(clientUser));

        Authentication clientAuth = createAuth("apexclient", "CLIENT");

        // Act & Assert: Client attempting to read or mark PM notification as read throws AccessDeniedException
        assertThrows(AccessDeniedException.class, () -> {
            notificationController.get(clientAuth, 501L);
        }, "Client must not be able to read PM's notification");

        assertThrows(AccessDeniedException.class, () -> {
            notificationController.markAsReadPost(clientAuth, 501L);
        }, "Client must not be able to mark PM's notification as read");
    }

    @Test
    @DisplayName("Seen / Unseen State: Marking notification as read updates readFlag in database")
    void testMarkAsReadAndUnread_StateToggledSuccessfully() {
        // Arrange
        Notification clientNotification = Notification.builder()
                .id(601L)
                .title("Project Request Approved")
                .message("Great news!")
                .type("PROJECT_REQUEST_STATUS:APPROVED:77")
                .readFlag(false)
                .recipient(clientUser)
                .build();

        when(notificationRepository.findById(601L)).thenReturn(Optional.of(clientNotification));
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userRepository.findByUsernameOrEmail("apexclient", "apexclient")).thenReturn(Optional.of(clientUser));

        Authentication clientAuth = createAuth("apexclient", "CLIENT");

        // Act: Mark as read
        NotificationDtos.Response response = notificationController.markAsReadPost(clientAuth, 601L);

        // Assert
        assertTrue(response.readFlag(), "Notification must now be marked as read (seen)");
        assertTrue(clientNotification.getReadFlag());

        // Act: Mark back as unread
        NotificationDtos.Response unreadResponse = notificationController.markAsUnreadPost(clientAuth, 601L);
        assertFalse(unreadResponse.readFlag(), "Notification must now be marked as unread (unseen)");
        assertFalse(clientNotification.getReadFlag());
    }

    @Test
    @DisplayName("Role-Based Filtering: Effective recipient ID restricts queries to current user's notifications")
    void testListAll_RestrictedToAuthenticatedUser() {
        // Arrange: User Apex Client is logged in
        when(userRepository.findByUsernameOrEmail("apexclient", "apexclient")).thenReturn(Optional.of(clientUser));

        Notification clientNotif = Notification.builder()
                .id(701L)
                .title("Approved")
                .message("Good job")
                .type("PROJECT_REQUEST_STATUS:APPROVED:77")
                .readFlag(false)
                .recipient(clientUser)
                .build();

        when(notificationRepository.findByRecipientIdOrderByCreatedAtDesc(101L))
                .thenReturn(List.of(clientNotif));

        Authentication clientAuth = createAuth("apexclient", "CLIENT");

        // Act: Client queries /api/notifications/all
        List<NotificationDtos.Response> list = notificationController.listAll(clientAuth, null, null);

        // Assert
        assertEquals(1, list.size());
        assertEquals(101L, list.get(0).recipientId());
        verify(notificationRepository, times(1)).findByRecipientIdOrderByCreatedAtDesc(101L);
        verify(notificationRepository, never()).findAllByOrderByCreatedAtDesc();
    }
}
