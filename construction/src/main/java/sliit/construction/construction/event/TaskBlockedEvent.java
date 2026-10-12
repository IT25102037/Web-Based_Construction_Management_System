package sliit.construction.construction.event;

import sliit.construction.construction.entity.Project;
import sliit.construction.construction.entity.Task;
import sliit.construction.construction.entity.User;

/**
 * Event published when a task status transitions to BLOCKED.
 * Acts as the Event object in the Observer Design Pattern.
 */
public class TaskBlockedEvent {

    private final Task task;
    private final Long taskId;
    private final String taskTitle;
    private final Long projectId;
    private final String projectName;
    private final Long managerId;
    private final String managerName;
    private final String assigneeName;

    public TaskBlockedEvent(Task task) {
        this.task = task;
        if (task != null) {
            this.taskId = task.getId();
            this.taskTitle = task.getTitle();

            Project project = task.getProject();
            if (project != null) {
                this.projectId = project.getId();
                this.projectName = project.getName();
                User manager = project.getManager();
                if (manager != null) {
                    this.managerId = manager.getId();
                    this.managerName = manager.getFullName() != null && !manager.getFullName().isBlank()
                            ? manager.getFullName()
                            : manager.getUsername();
                } else {
                    this.managerId = null;
                    this.managerName = null;
                }
            } else {
                this.projectId = null;
                this.projectName = null;
                this.managerId = null;
                this.managerName = null;
            }

            User assignee = task.getAssignee();
            if (assignee != null) {
                this.assigneeName = assignee.getFullName() != null && !assignee.getFullName().isBlank()
                        ? assignee.getFullName()
                        : assignee.getUsername();
            } else {
                this.assigneeName = "Unassigned";
            }
        } else {
            this.taskId = null;
            this.taskTitle = null;
            this.projectId = null;
            this.projectName = null;
            this.managerId = null;
            this.managerName = null;
            this.assigneeName = "Unassigned";
        }
    }

    public Task getTask() {
        return task;
    }

    public Long getTaskId() {
        return taskId;
    }

    public String getTaskTitle() {
        return taskTitle;
    }

    public Long getProjectId() {
        return projectId;
    }

    public String getProjectName() {
        return projectName;
    }

    public Long getManagerId() {
        return managerId;
    }

    public String getManagerName() {
        return managerName;
    }

    public String getAssigneeName() {
        return assigneeName;
    }
}
