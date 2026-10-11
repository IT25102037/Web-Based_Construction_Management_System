package sliit.construction.construction.event;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import sliit.construction.construction.dto.NotificationDtos;
import sliit.construction.construction.service.NotificationService;

/**
 * Observer in the Observer Design Pattern.
 * Listens for TaskBlockedEvent using Spring's @EventListener and automatically
 * triggers notification creation for the project manager via NotificationService.
 */
@Component
public class TaskEventListener {

    private static final Logger log = LoggerFactory.getLogger(TaskEventListener.class);

    private final NotificationService notificationService;

    public TaskEventListener(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @EventListener
    public void handleTaskBlockedEvent(TaskBlockedEvent event) {
        if (event == null) {
            log.warn("TaskBlockedEvent received is null, ignoring.");
            return;
        }

        Long managerId = event.getManagerId();
        if (managerId == null) {
            log.warn("Cannot notify project manager for task ID {}: project manager ID is missing.", event.getTaskId());
            return;
        }

        String taskTitle = event.getTaskTitle() != null ? event.getTaskTitle() : "Untitled Task";
        String projectName = event.getProjectName() != null ? event.getProjectName() : "Unknown Project";
        Long taskId = event.getTaskId();
        String assigneeName = event.getAssigneeName() != null ? event.getAssigneeName() : "Unassigned";

        String title = "Task Blocked: " + taskTitle;
        if (title.length() > 180) {
            title = title.substring(0, 177) + "...";
        }

        String message = String.format(
                "Task '%s' (ID: #%s) in project '%s' has been marked as BLOCKED. Assigned to: %s.",
                taskTitle,
                taskId != null ? taskId : "N/A",
                projectName,
                assigneeName
        );
        if (message.length() > 2000) {
            message = message.substring(0, 1997) + "...";
        }

        String type = taskId != null ? "TASK_BLOCKED:" + taskId : "TASK_BLOCKED";
        if (type.length() > 50) {
            type = "TASK_BLOCKED";
        }

        try {
            notificationService.create(new NotificationDtos.Request(
                    title,
                    message,
                    type,
                    managerId
            ));
            log.info("Observer pattern triggered: notification created for manager ID {} regarding BLOCKED task ID {}.",
                    managerId, taskId);
        } catch (Exception e) {
            log.error("Failed to create notification for BLOCKED task ID {}: {}", taskId, e.getMessage(), e);
        }
    }
}
