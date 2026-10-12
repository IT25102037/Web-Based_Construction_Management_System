package sliit.construction.construction.controller;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import sliit.construction.construction.dto.NotificationDtos;
import sliit.construction.construction.entity.Role;
import sliit.construction.construction.entity.User;
import sliit.construction.construction.repository.UserRepository;
import sliit.construction.construction.service.NotificationService;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService service;
    private final UserRepository userRepository;

    public NotificationController(NotificationService service, UserRepository userRepository) {
        this.service = service;
        this.userRepository = userRepository;
    }

    private User getAuthenticatedUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new org.springframework.security.access.AccessDeniedException("User is not authenticated");
        }
        return userRepository.findByUsernameOrEmail(authentication.getName(), authentication.getName())
                .orElseThrow(() -> new sliit.construction.construction.exception.ResourceNotFoundException("Authenticated user not found: " + authentication.getName()));
    }

    private Long resolveEffectiveRecipientId(Authentication authentication, Long explicitRecipientId) {
        User currentUser = getAuthenticatedUser(authentication);
        if (currentUser.getRole() == Role.SYSTEM_ADMINISTRATOR && explicitRecipientId != null) {
            return explicitRecipientId;
        }
        return currentUser.getId();
    }

    private void checkOwnership(Authentication authentication, Long notificationId) {
        User currentUser = getAuthenticatedUser(authentication);
        if (currentUser.getRole() == Role.SYSTEM_ADMINISTRATOR) {
            return;
        }
        NotificationDtos.Response notif = service.get(notificationId);
        if (notif.recipientId() == null || !notif.recipientId().equals(currentUser.getId())) {
            throw new org.springframework.security.access.AccessDeniedException("Access denied: You can only view or modify your own notifications.");
        }
    }

    // =========================================================
    // CREATE NOTIFICATION
    // =========================================================
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("isAuthenticated()")
    public NotificationDtos.Response create(@Valid @RequestBody NotificationDtos.Request request) {
        return service.create(request);
    }

    // =========================================================
    // LIST PAGINATED NOTIFICATIONS
    // =========================================================
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public Page<NotificationDtos.Response> list(
            Authentication authentication,
            @RequestParam(required = false) Long recipientId,
            @RequestParam(required = false) Boolean read,
            Pageable pageable
    ) {
        return service.list(resolveEffectiveRecipientId(authentication, recipientId), read, pageable);
    }

    // =========================================================
    // LIST ALL NOTIFICATIONS
    // =========================================================
    @GetMapping("/all")
    @PreAuthorize("isAuthenticated()")
    public List<NotificationDtos.Response> listAll(
            Authentication authentication,
            @RequestParam(required = false) Long recipientId,
            @RequestParam(required = false) Boolean read
    ) {
        return service.listAll(resolveEffectiveRecipientId(authentication, recipientId), read);
    }

    // =========================================================
    // GET UNREAD COUNT
    // =========================================================
    @GetMapping("/unread-count")
    @PreAuthorize("isAuthenticated()")
    public NotificationDtos.UnreadCountResponse getUnreadCount(
            Authentication authentication,
            @RequestParam(required = false) Long recipientId
    ) {
        return service.getUnreadCount(resolveEffectiveRecipientId(authentication, recipientId));
    }

    // =========================================================
    // READ ONE NOTIFICATION
    // =========================================================
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public NotificationDtos.Response get(Authentication authentication, @PathVariable Long id) {
        checkOwnership(authentication, id);
        return service.get(id);
    }

    // =========================================================
    // MARK AS READ (SEEN)
    // =========================================================
    @PatchMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public NotificationDtos.Response markAsReadPatch(Authentication authentication, @PathVariable Long id) {
        checkOwnership(authentication, id);
        return service.markAsRead(id);
    }

    @PostMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public NotificationDtos.Response markAsReadPost(Authentication authentication, @PathVariable Long id) {
        checkOwnership(authentication, id);
        return service.markAsRead(id);
    }

    @PatchMapping("/{id}/unread")
    @PreAuthorize("isAuthenticated()")
    public NotificationDtos.Response markAsUnreadPatch(Authentication authentication, @PathVariable Long id) {
        checkOwnership(authentication, id);
        return service.markAsUnread(id);
    }

    @PostMapping("/{id}/unread")
    @PreAuthorize("isAuthenticated()")
    public NotificationDtos.Response markAsUnreadPost(Authentication authentication, @PathVariable Long id) {
        checkOwnership(authentication, id);
        return service.markAsUnread(id);
    }

    @PostMapping("/{id}/toggle")
    @PreAuthorize("isAuthenticated()")
    public NotificationDtos.Response toggleRead(Authentication authentication, @PathVariable Long id) {
        checkOwnership(authentication, id);
        return service.toggleRead(id);
    }

    // =========================================================
    // MARK ALL NOTIFICATIONS AS READ (SEEN)
    // =========================================================
    @PostMapping("/mark-all-read")
    @PreAuthorize("isAuthenticated()")
    public void markAllAsRead(
            Authentication authentication,
            @RequestParam(required = false) Long recipientId
    ) {
        service.markAllAsRead(resolveEffectiveRecipientId(authentication, recipientId));
    }

    // =========================================================
    // UPDATE NOTIFICATION
    // =========================================================
    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public NotificationDtos.Response update(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody NotificationDtos.UpdateRequest request
    ) {
        checkOwnership(authentication, id);
        return service.update(id, request);
    }

    // =========================================================
    // DELETE NOTIFICATION
    // =========================================================
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("isAuthenticated()")
    public void delete(Authentication authentication, @PathVariable Long id) {
        checkOwnership(authentication, id);
        service.delete(id);
    }

    // =========================================================
    // CLEAR READ NOTIFICATIONS
    // =========================================================
    @DeleteMapping("/clear-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("isAuthenticated()")
    public void clearAll(
            Authentication authentication,
            @RequestParam(required = false) Long recipientId
    ) {
        service.clearAll(resolveEffectiveRecipientId(authentication, recipientId));
    }
}
