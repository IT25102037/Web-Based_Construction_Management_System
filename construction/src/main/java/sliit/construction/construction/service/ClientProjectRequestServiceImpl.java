package sliit.construction.construction.service;

import sliit.construction.construction.dto.ClientProjectRequestDtos;
import sliit.construction.construction.dto.NotificationDtos;
import sliit.construction.construction.dto.ProjectDtos;
import sliit.construction.construction.entity.*;
import sliit.construction.construction.exception.ResourceNotFoundException;
import sliit.construction.construction.repository.ClientProjectRequestRepository;
import sliit.construction.construction.repository.ProjectRepository;
import sliit.construction.construction.repository.UserRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class ClientProjectRequestServiceImpl
        implements ClientProjectRequestService {

    private final ClientProjectRequestRepository requestRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final NotificationService notificationService;

    public ClientProjectRequestServiceImpl(
            ClientProjectRequestRepository requestRepository,
            UserRepository userRepository,
            ProjectRepository projectRepository,
            NotificationService notificationService
    ) {
        this.requestRepository = requestRepository;
        this.userRepository = userRepository;
        this.projectRepository = projectRepository;
        this.notificationService = notificationService;
    }

    /*
     * ==========================================
     * CREATE (CLIENT)
     * ==========================================
     */
    @Override
    @Transactional
    public ClientProjectRequestDtos.Response create(
            String username,
            ClientProjectRequestDtos.Request request
    ) {
        User client = getClient(username);

        ClientProjectRequest projectRequest =
                ClientProjectRequest.builder()
                        .client(client)
                        .projectName(request.projectName().trim())
                        .projectType(request.projectType().trim())
                        .location(request.location().trim())
                        .description(request.description().trim())
                        .estimatedBudget(request.estimatedBudget())
                        .preferredStartDate(request.preferredStartDate())
                        .status(ProjectRequestStatus.PENDING)
                        .build();

        ClientProjectRequest saved = requestRepository.save(projectRequest);

        // Notify Project Managers & Admins about new client request
        notifyManagersNewRequest(client, saved);

        return map(saved);
    }

    /*
     * ==========================================
     * READ ALL MY REQUESTS (CLIENT)
     * ==========================================
     */
    @Override
    @Transactional(readOnly = true)
    public List<ClientProjectRequestDtos.Response> getMyRequests(String username) {
        User client = getClient(username);

        return requestRepository
                .findByClient_IdOrderByCreatedAtDesc(client.getId())
                .stream()
                .map(this::map)
                .toList();
    }

    /*
     * ==========================================
     * READ ONE REQUEST (CLIENT)
     * ==========================================
     */
    @Override
    @Transactional(readOnly = true)
    public ClientProjectRequestDtos.Response getMyRequest(
            String username,
            Long id
    ) {
        ClientProjectRequest request = getMyEntity(username, id);
        return map(request);
    }

    /*
     * ==========================================
     * UPDATE (CLIENT)
     * ==========================================
     */
    @Override
    @Transactional
    public ClientProjectRequestDtos.Response update(
            String username,
            Long id,
            ClientProjectRequestDtos.Request request
    ) {
        ClientProjectRequest existing = getMyEntity(username, id);

        if (existing.getStatus() != ProjectRequestStatus.PENDING) {
            throw new IllegalStateException(
                    "Only pending project requests can be updated."
            );
        }

        existing.setProjectName(request.projectName().trim());
        existing.setProjectType(request.projectType().trim());
        existing.setLocation(request.location().trim());
        existing.setDescription(request.description().trim());
        existing.setEstimatedBudget(request.estimatedBudget());
        existing.setPreferredStartDate(request.preferredStartDate());

        return map(requestRepository.save(existing));
    }

    /*
     * ==========================================
     * DELETE (CLIENT)
     * ==========================================
     */
    @Override
    @Transactional
    public void delete(
            String username,
            Long id
    ) {
        ClientProjectRequest request = getMyEntity(username, id);

        if (request.getStatus() != ProjectRequestStatus.PENDING) {
            throw new IllegalStateException(
                    "Only pending project requests can be deleted."
            );
        }

        requestRepository.delete(request);
    }

    /*
     * ==========================================
     * GET ALL REQUESTS (STAFF / PROJECT MANAGER)
     * ==========================================
     */
    @Override
    @Transactional(readOnly = true)
    public List<ClientProjectRequestDtos.Response> getAllRequests(ProjectRequestStatus status) {
        List<ClientProjectRequest> list;
        if (status == null) {
            list = requestRepository.findAllByOrderByCreatedAtDesc();
        } else {
            list = requestRepository.findByStatusOrderByCreatedAtDesc(status);
        }
        return list.stream().map(this::map).toList();
    }

    /*
     * ==========================================
     * GET REQUEST BY ID (STAFF / PROJECT MANAGER)
     * ==========================================
     */
    @Override
    @Transactional(readOnly = true)
    public ClientProjectRequestDtos.Response getRequestById(Long id) {
        ClientProjectRequest request = requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project request not found: " + id));
        return map(request);
    }

    /*
     * ==========================================
     * UPDATE STATUS (STAFF / PROJECT MANAGER: ACCEPT, REJECT, PENDING)
     * ==========================================
     */
    @Override
    @Transactional
    public ClientProjectRequestDtos.Response updateStatus(
            Long id,
            ClientProjectRequestDtos.StatusUpdateRequest updateRequest,
            String staffUsername
    ) {
        ClientProjectRequest request = requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project request not found: " + id));

        User staffUser = userRepository.findByUsernameOrEmail(staffUsername, staffUsername)
                .orElse(null);

        String staffName = staffUser != null ? staffUser.getFullName() : "Project Management";
        ProjectRequestStatus newStatus = updateRequest.status();
        request.setStatus(newStatus);

        ClientProjectRequest saved = requestRepository.save(request);

        // Send real-time notification to client
        notifyClientStatusChange(request, newStatus, staffName, updateRequest.remarks());

        return map(saved);
    }

    /*
     * ==========================================
     * CONVERT APPROVED REQUEST TO ACTIVE PROJECT
     * ==========================================
     */
    @Override
    @Transactional
    public ProjectDtos.Response convertToProject(
            Long id,
            String staffUsername
    ) {
        ClientProjectRequest request = requestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project request not found: " + id));

        User manager = userRepository.findByUsernameOrEmail(staffUsername, staffUsername)
                .orElseThrow(() -> new ResourceNotFoundException("Staff user not found: " + staffUsername));

        // Create Project entity
        Project project = Project.builder()
                .name(request.getProjectName())
                .description("Client: " + request.getClient().getFullName() + " (" + request.getClient().getEmail() + ")\nType: " + request.getProjectType() + "\nScope: " + request.getDescription())
                .location(request.getLocation())
                .startDate(request.getPreferredStartDate() != null ? request.getPreferredStartDate() : LocalDate.now())
                .budget(request.getEstimatedBudget())
                .status(ProjectStatus.PLANNED)
                .manager(manager)
                .resourceAllocation("Project initiated from Client Request #" + request.getId())
                .build();

        Project savedProject = projectRepository.save(project);

        // Mark client request as APPROVED
        request.setStatus(ProjectRequestStatus.APPROVED);
        requestRepository.save(request);

        // Dispatch notification to client
        try {
            notificationService.create(new NotificationDtos.Request(
                    "Project Request Approved: " + request.getProjectName(),
                    "Great news! Your project request '" + request.getProjectName() + "' was APPROVED and converted into active project #PRJ-" + savedProject.getId() + " by Project Manager " + manager.getFullName() + ".",
                    "PROJECT_REQUEST_STATUS:APPROVED:" + request.getId(),
                    request.getClient().getId()
            ));
        } catch (Exception e) {
            // Non-blocking notification dispatch
        }

        return new ProjectDtos.Response(
                savedProject.getId(),
                savedProject.getName(),
                savedProject.getDescription(),
                savedProject.getLocation(),
                savedProject.getStartDate(),
                savedProject.getEndDate(),
                savedProject.getActualEndDate(),
                savedProject.getBudget(),
                savedProject.getResourceAllocation(),
                savedProject.getStatus(),
                manager.getId(),
                manager.getFullName(),
                savedProject.getCreatedAt(),
                savedProject.getUpdatedAt()
        );
    }

    /*
     * ==========================================
     * NOTIFICATION HELPERS
     * ==========================================
     */
    private void notifyManagersNewRequest(User client, ClientProjectRequest req) {
        try {
            java.util.Map<Long, User> staffMap = new java.util.LinkedHashMap<>();
            userRepository.findByRole(Role.PROJECT_MANAGER).forEach(u -> staffMap.put(u.getId(), u));
            userRepository.findByRole(Role.SITE_ENGINEER).forEach(u -> staffMap.put(u.getId(), u));
            userRepository.findByRole(Role.CONSTRUCTION_SUPERVISOR).forEach(u -> staffMap.put(u.getId(), u));
            userRepository.findByRole(Role.SYSTEM_ADMINISTRATOR).forEach(u -> staffMap.put(u.getId(), u));

            for (User staff : staffMap.values()) {
                notificationService.create(new NotificationDtos.Request(
                        "New Client Project Request: " + req.getProjectName(),
                        "Client " + client.getFullName() + " submitted a new project request: '" + req.getProjectName() + "' (" + req.getProjectType() + ") in " + req.getLocation() + ". Budget: $" + (req.getEstimatedBudget() != null ? req.getEstimatedBudget() : "TBD"),
                        "PROJECT_REQUEST:" + req.getId(),
                        staff.getId()
                ));
            }
        } catch (Exception e) {
            System.err.println("Failed to dispatch staff notifications for new request #" + req.getId() + ": " + e.getMessage());
        }
    }

    private void notifyClientStatusChange(ClientProjectRequest req, ProjectRequestStatus status, String staffName, String remarks) {
        try {
            String title;
            String message;
            String note = (remarks != null && !remarks.isBlank()) ? " Remarks: " + remarks.trim() : "";

            switch (status) {
                case APPROVED -> {
                    title = "Project Request Approved: " + req.getProjectName();
                    message = "Great news! Your project request '" + req.getProjectName() + "' was ACCEPTED / APPROVED by Project Manager " + staffName + "." + note;
                }
                case REJECTED -> {
                    title = "Project Request Rejected: " + req.getProjectName();
                    message = "Your project request '" + req.getProjectName() + "' was REJECTED by Project Manager " + staffName + "." + note;
                }
                case COMPLETED -> {
                    title = "Project Request Completed: " + req.getProjectName();
                    message = "Your project request '" + req.getProjectName() + "' has been marked COMPLETED by Project Manager " + staffName + "." + note;
                }
                case PENDING -> {
                    title = "Project Request Under Review: " + req.getProjectName();
                    message = "Your project request '" + req.getProjectName() + "' is currently marked PENDING / under review by Project Manager " + staffName + "." + note;
                }
                default -> {
                    title = "Project Request Status Updated: " + req.getProjectName();
                    message = "Your project request '" + req.getProjectName() + "' status changed to " + status + " by " + staffName + "." + note;
                }
            }

            notificationService.create(new NotificationDtos.Request(
                    title,
                    message,
                    "PROJECT_REQUEST_STATUS:" + status.name() + ":" + req.getId(),
                    req.getClient().getId()
            ));
        } catch (Exception ignored) {
        }
    }

    /*
     * ==========================================
     * FIND CLIENT
     * ==========================================
     */
    private User getClient(String identifier) {
        User client = userRepository
                .findByUsernameOrEmail(identifier, identifier)
                .orElseThrow(() -> new ResourceNotFoundException("Client account not found."));

        if (client.getRole() != Role.CLIENT) {
            throw new ResourceNotFoundException("Client account not found.");
        }

        return client;
    }

    /*
     * ==========================================
     * FIND MY REQUEST
     * ==========================================
     */
    private ClientProjectRequest getMyEntity(
            String username,
            Long id
    ) {
        User client = getClient(username);

        ClientProjectRequest request = requestRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project request not found."));

        if (!request.getClient().getId().equals(client.getId())) {
            throw new ResourceNotFoundException("Project request not found.");
        }

        return request;
    }

    /*
     * ==========================================
     * MAP ENTITY → DTO
     * ==========================================
     */
    private ClientProjectRequestDtos.Response map(
            ClientProjectRequest request
    ) {
        User client = request.getClient();

        return new ClientProjectRequestDtos.Response(
                request.getId(),
                client != null ? client.getId() : null,
                client != null ? client.getFullName() : "Client",
                client != null ? client.getEmail() : "",
                client != null ? client.getPhoneNumber() : "",
                request.getProjectName(),
                request.getProjectType(),
                request.getLocation(),
                request.getDescription(),
                request.getEstimatedBudget(),
                request.getPreferredStartDate(),
                request.getStatus(),
                request.getCreatedAt(),
                request.getUpdatedAt()
        );
    }
}