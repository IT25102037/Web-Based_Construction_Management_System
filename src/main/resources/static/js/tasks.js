const token = localStorage.getItem("wbcms_token");
const userType = localStorage.getItem("wbcms_user_type");

if (!token || userType === "CLIENT") {
    window.location.replace("/staff-login.html");
}

const API = "/api/tasks";

let allTasks = [];
let allProjects = [];
let allUsers = [];
let editingTaskId = null;

document.addEventListener("DOMContentLoaded", async () => {
    setupEvents();
    loadProfile();
    await loadProjects();
    await loadUsers();
    await loadTasks();
});

function setupEvents() {
    const taskForm = document.getElementById("taskForm");
    if (taskForm) {
        taskForm.addEventListener("submit", saveTask);
    }

    const taskSearch = document.getElementById("taskSearch");
    if (taskSearch) {
        taskSearch.addEventListener("input", filterTasks);
    }

    const statusFilter = document.getElementById("statusFilter");
    if (statusFilter) {
        statusFilter.addEventListener("change", filterTasks);
    }

    const priorityFilter = document.getElementById("priorityFilter");
    if (priorityFilter) {
        priorityFilter.addEventListener("change", filterTasks);
    }

    const taskModal = document.getElementById("taskModal");
    if (taskModal) {
        taskModal.addEventListener("click", function (event) {
            if (event.target === this) {
                closeModal();
            }
        });
    }
}

function authHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };
}

function loadProfile() {
    const username = localStorage.getItem("wbcms_username") || "Staff User";
    const fullName = localStorage.getItem("wbcms_full_name") || username;
    const role = localStorage.getItem("wbcms_role") || "STAFF";

    const profileName = document.getElementById("profileName");
    if (profileName) profileName.textContent = fullName;

    const profileRole = document.getElementById("profileRole");
    if (profileRole) profileRole.textContent = formatRole(role);

    const dropdownUserName = document.getElementById("dropdownUserName");
    if (dropdownUserName) dropdownUserName.textContent = fullName;

    const headerAvatar = document.getElementById("headerAvatar");
    if (headerAvatar) {
        headerAvatar.textContent = getInitials(fullName);
    }
}

function getInitials(name) {
    if (!name) return "US";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatRole(role) {
    if (!role) return "Staff";
    return role
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase());
}

async function loadProjects() {
    try {
        const response = await fetch(
            "/api/projects?page=0&size=100&sort=name,asc",
            {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            if (response.status === 401) {
                window.location.replace("/staff-login.html");
                return;
            }
            throw new Error("Unable to load projects.");
        }

        const data = await response.json();
        allProjects = data.content || data || [];

        const select = document.getElementById("taskProject");
        if (select) {
            select.innerHTML = `<option value="">Select project</option>`;
            allProjects.forEach(project => {
                const option = document.createElement("option");
                option.value = project.id;
                option.textContent = project.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error loading projects:", error);
    }
}

async function loadUsers() {
    try {
        const response = await fetch(
            "/api/users?page=0&size=100&sort=fullName,asc",
            {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            if (response.status === 401) {
                window.location.replace("/staff-login.html");
                return;
            }
            console.warn("Unable to load staff members: status", response.status);
            return;
        }

        const data = await response.json();
        const usersList = data.content || data || [];

        allUsers = usersList.filter(user => user.role && user.role !== "CLIENT");

        const select = document.getElementById("taskAssignee");
        if (!select) return;

        select.innerHTML = `<option value="">Select assignee</option>`;
        allUsers.forEach(user => {
            const option = document.createElement("option");
            option.value = user.id;
            option.textContent = `${user.fullName || user.username} — ${formatRole(user.role)}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading users:", error);
    }
}

async function loadTasks() {
    const tbody = document.getElementById("taskTableBody");
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align:center; padding:40px;">
                    <i class="bi bi-arrow-repeat" style="font-size:24px; animation:spin 1s linear infinite; display:inline-block; color:var(--orange);"></i>
                    <p style="margin-top:8px; color:#8a99ad;">Loading tasks...</p>
                </td>
            </tr>
        `;
    }

    try {
        const response = await fetch(
            "/api/tasks?page=0&size=100&sort=deadline,asc",
            {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        if (!response.ok) {
            if (response.status === 401) {
                window.location.replace("/staff-login.html");
                return;
            }
            throw new Error("Unable to load tasks.");
        }

        const data = await response.json();
        allTasks = data.content || data || [];

        updateStatistics();
        renderTasks(allTasks);
    } catch (error) {
        console.error("Error loading tasks:", error);
        showToast("Unable to load tasks from server.", "error");
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align:center; padding:30px; color:#f87171;">
                        <i class="bi bi-exclamation-triangle" style="font-size:24px;"></i>
                        <p style="margin-top:8px;">Failed to load tasks. Please try again.</p>
                    </td>
                </tr>
            `;
        }
    }
}

function renderTasks(tasks) {
    const tbody = document.getElementById("taskTableBody");
    const empty = document.getElementById("emptyTable");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!tasks || tasks.length === 0) {
        if (empty) empty.style.display = "block";
        return;
    }

    if (empty) empty.style.display = "none";

    tasks.forEach(task => {
        const row = document.createElement("tr");
        const dueDateVal = task.deadline || task.dueDate;

        row.innerHTML = `
            <td>
                <div class="task-name">
                    <strong>${escapeHtml(task.title)}</strong>
                    <span>${escapeHtml(task.description || "No description")}</span>
                </div>
            </td>
            <td>
                <span class="project-name">
                    <i class="bi bi-building" style="color:var(--orange); font-size:12px;"></i>
                    ${escapeHtml(task.projectName || "Project #" + (task.projectId || "-"))}
                </span>
            </td>
            <td>
                <span class="assignee-name">
                    <i class="bi bi-person-circle" style="color:#38bdf8; font-size:13px;"></i>
                    ${escapeHtml(task.assigneeName || "User #" + (task.assigneeId || "-"))}
                </span>
            </td>
            <td>
                ${priorityBadge(task.priority)}
            </td>
            <td>
                <span style="color:#cbd5e1; font-size:12.5px; font-weight:500;">
                    <i class="bi bi-calendar-event" style="margin-right:4px; color:#94a3b8; font-size:11px;"></i>
                    ${formatDate(dueDateVal)}
                </span>
            </td>
            <td>
                ${statusBadge(task.status)}
            </td>
            <td>
                <div class="action-buttons">
                    <button type="button" class="icon-btn view" title="View Details" onclick="viewTask(${task.id})">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button type="button" class="icon-btn edit" title="Edit Task" onclick="editTask(${task.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button type="button" class="icon-btn delete delete-btn" title="Delete Task" onclick="deleteTask(${task.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;

        tbody.appendChild(row);
    });
}

function priorityBadge(priority) {
    const p = String(priority || "MEDIUM").toUpperCase();
    const labels = {
        LOW: "Low",
        MEDIUM: "Medium",
        HIGH: "High",
        URGENT: "Urgent"
    };

    return `<span class="badge-priority ${p.toLowerCase()}">${labels[p] || p}</span>`;
}

function statusBadge(status) {
    const s = String(status || "PENDING").toUpperCase();
    const labels = {
        PENDING: "Pending",
        IN_PROGRESS: "In Progress",
        COMPLETED: "Completed",
        BLOCKED: "Blocked"
    };

    return `<span class="badge-status ${s.toLowerCase()}">${labels[s] || s}</span>`;
}

function updateStatistics() {
    const totalEl = document.getElementById("totalTasks");
    const pendingEl = document.getElementById("pendingTasks");
    const inProgEl = document.getElementById("inProgressTasks");
    const compEl = document.getElementById("completedTasks");

    if (totalEl) totalEl.textContent = allTasks.length;
    if (pendingEl) pendingEl.textContent = allTasks.filter(t => t.status === "PENDING").length;
    if (inProgEl) inProgEl.textContent = allTasks.filter(t => t.status === "IN_PROGRESS").length;
    if (compEl) compEl.textContent = allTasks.filter(t => t.status === "COMPLETED").length;
}

function filterTasks() {
    const search = (document.getElementById("taskSearch")?.value || "").toLowerCase().trim();
    const status = document.getElementById("statusFilter")?.value || "";
    const priority = document.getElementById("priorityFilter")?.value || "";

    const filtered = allTasks.filter(task => {
        const matchesSearch = !search ||
            (task.title || "").toLowerCase().includes(search) ||
            (task.projectName || "").toLowerCase().includes(search) ||
            (task.assigneeName || "").toLowerCase().includes(search) ||
            (task.description || "").toLowerCase().includes(search);

        const matchesStatus = !status || task.status === status;
        const matchesPriority = !priority || task.priority === priority;

        return matchesSearch && matchesStatus && matchesPriority;
    });

    renderTasks(filtered);
}

function openCreateModal() {
    editingTaskId = null;
    clearErrors();

    const modalTitle = document.getElementById("modalTitle");
    if (modalTitle) modalTitle.textContent = "Create Task";

    const saveBtn = document.getElementById("saveTaskBtn");
    if (saveBtn) saveBtn.innerHTML = `<i class="bi bi-check-lg"></i> Save Task`;

    const form = document.getElementById("taskForm");
    if (form) form.reset();

    const taskIdInput = document.getElementById("taskId");
    if (taskIdInput) taskIdInput.value = "";

    const priorityInput = document.getElementById("taskPriority");
    if (priorityInput) priorityInput.value = "MEDIUM";

    const statusInput = document.getElementById("taskStatus");
    if (statusInput) statusInput.value = "PENDING";

    const modal = document.getElementById("taskModal");
    if (modal) modal.classList.add("show");
}

function editTask(id) {
    const task = allTasks.find(item => item.id === id);
    if (!task) return;

    editingTaskId = id;
    clearErrors();

    const modalTitle = document.getElementById("modalTitle");
    if (modalTitle) modalTitle.textContent = "Edit Task";

    const saveBtn = document.getElementById("saveTaskBtn");
    if (saveBtn) saveBtn.innerHTML = `<i class="bi bi-save"></i> Update Task`;

    const taskIdInput = document.getElementById("taskId");
    if (taskIdInput) taskIdInput.value = task.id;

    const titleInput = document.getElementById("taskTitle");
    if (titleInput) titleInput.value = task.title || "";

    const descInput = document.getElementById("taskDescription");
    if (descInput) descInput.value = task.description || "";

    const projectInput = document.getElementById("taskProject");
    if (projectInput) projectInput.value = task.projectId || "";

    const assigneeInput = document.getElementById("taskAssignee");
    if (assigneeInput) assigneeInput.value = task.assigneeId || "";

    const dueDateInput = document.getElementById("taskDueDate");
    if (dueDateInput) dueDateInput.value = task.deadline || task.dueDate || "";

    const priorityInput = document.getElementById("taskPriority");
    if (priorityInput) priorityInput.value = task.priority || "MEDIUM";

    const statusInput = document.getElementById("taskStatus");
    if (statusInput) statusInput.value = task.status || "PENDING";

    const modal = document.getElementById("taskModal");
    if (modal) modal.classList.add("show");
}

async function saveTask(event) {
    event.preventDefault();
    clearErrors();

    const title = document.getElementById("taskTitle")?.value.trim() || "";
    const description = document.getElementById("taskDescription")?.value.trim() || "";
    const projectId = document.getElementById("taskProject")?.value || "";
    const assigneeId = document.getElementById("taskAssignee")?.value || "";
    const dueDate = document.getElementById("taskDueDate")?.value || "";
    const priority = document.getElementById("taskPriority")?.value || "MEDIUM";
    const status = document.getElementById("taskStatus")?.value || "PENDING";

    let valid = true;

    if (!title) {
        showError("titleError", "Task title is required.");
        valid = false;
    }

    if (!projectId) {
        showError("projectError", "Please select a project.");
        valid = false;
    }

    if (!assigneeId) {
        showError("assigneeError", "Please select an assignee.");
        valid = false;
    }

    if (!dueDate) {
        showError("dueDateError", "Due date is required.");
        valid = false;
    }

    if (!valid) return;

    const payload = {
        title,
        description: description || null,
        deadline: dueDate,
        dueDate: dueDate,
        status,
        priority,
        projectId: Number(projectId),
        assigneeId: Number(assigneeId)
    };

    const saveBtn = document.getElementById("saveTaskBtn");
    const originalBtnHtml = saveBtn ? saveBtn.innerHTML : "";
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<i class="bi bi-arrow-repeat" style="animation:spin 1s linear infinite; display:inline-block;"></i> Saving...`;
    }

    try {
        const url = editingTaskId ? `${API}/${editingTaskId}` : API;
        const method = editingTaskId ? "PUT" : "POST";

        const response = await fetch(url, {
            method,
            headers: authHeaders(),
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let errorMsg = "Unable to save task.";
            try {
                const errorData = await response.json();
                errorMsg = errorData.message || errorData.error || errorMsg;
            } catch {
                const text = await response.text();
                if (text) errorMsg = text;
            }
            throw new Error(errorMsg);
        }

        const wasEditing = Boolean(editingTaskId);
        closeModal();
        await loadTasks();

        showToast(wasEditing ? "Successfully edited task!" : "Successfully created task!", "success");
    } catch (error) {
        console.error("Save task error:", error);
        showToast(error.message || (wasEditing ? "Error editing task: Failed to update." : "Error creating task."), "error");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnHtml;
        }
    }
}

function viewTask(id) {
    const task = allTasks.find(item => item.id === id);
    if (!task) return;

    const dueDateVal = task.deadline || task.dueDate;
    alert(
        `Task Details\n` +
        `-----------------------------------------\n` +
        `Title: ${task.title}\n` +
        `Project: ${task.projectName || "Project #" + task.projectId}\n` +
        `Assignee: ${task.assigneeName || "User #" + task.assigneeId}\n` +
        `Priority: ${formatLabel(task.priority)}\n` +
        `Status: ${formatLabel(task.status)}\n` +
        `Due Date: ${formatDate(dueDateVal)}\n\n` +
        `Description:\n${task.description || "No description provided."}`
    );
}

async function deleteTask(id) {
    const task = allTasks.find(item => item.id === id);
    if (!task) return;

    const confirmed = confirm(`Are you sure you want to delete "${task.title}"?`);
    if (!confirmed) return;

    try {
        const response = await fetch(`${API}/${id}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            let errorMsg = "Unable to delete task.";
            try {
                const errData = await response.json();
                errorMsg = errData.message || errData.error || errorMsg;
            } catch {
                const text = await response.text();
                if (text) errorMsg = text;
            }
            throw new Error(errorMsg);
        }

        await loadTasks();
        showToast("Successfully deleted task!", "success");
    } catch (error) {
        console.error("Delete task error:", error);
        showToast(error.message || "Error deleting task.", "error");
    }
}

function closeModal() {
    const modal = document.getElementById("taskModal");
    if (modal) modal.classList.remove("show");
    editingTaskId = null;
    clearErrors();
}

function clearErrors() {
    document.querySelectorAll(".error").forEach(element => {
        element.textContent = "";
    });
}

function showError(id, message) {
    const element = document.getElementById(id);
    if (element) element.textContent = message;
}

function formatDate(date) {
    if (!date) return "-";
    try {
        const parsed = new Date(date + (String(date).includes("T") ? "" : "T00:00:00"));
        if (isNaN(parsed.getTime())) return date;
        return parsed.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    } catch {
        return date;
    }
}

function formatLabel(value) {
    if (!value) return "-";
    return value
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, char => char.toUpperCase());
}

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const messageElement = document.getElementById("toastMessage");
    if (!toast || !messageElement) return;

    messageElement.textContent = message;
    toast.classList.remove("error", "show");

    if (type === "error") {
        toast.classList.add("error");
    }

    requestAnimationFrame(() => {
        toast.classList.add("show");
    });

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}

function logout() {
    const keys = [
        "wbcms_token",
        "wbcms_user_id",
        "wbcms_username",
        "wbcms_role",
        "wbcms_user_type",
        "wbcms_user",
        "wbcms_full_name"
    ];

    keys.forEach(key => localStorage.removeItem(key));
    window.location.replace("/staff-login.html");
}