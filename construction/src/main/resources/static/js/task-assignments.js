/* =========================================================
   WBCMS - TASK ASSIGNMENTS MANAGEMENT JAVASCRIPT
   - Enterprise Role Guard (PROJECT_MANAGER, CONSTRUCTION_SUPERVISOR, SYSTEM_ADMINISTRATOR)
   - Full CRUD (Create, Read, Update, Delete)
   - Centered Overlay Modals (Add/Edit, View Details, Confirm Delete)
   - Real-time search & status filtering
   - KPI Statistics calculation
   - Synchronized with Spring Boot REST API
========================================================= */

const token = localStorage.getItem("wbcms_token");
const userType = localStorage.getItem("wbcms_user_type") || "";
const currentRole = (localStorage.getItem("wbcms_role") || "").toUpperCase();

const allowedRoles = ["PROJECT_MANAGER", "SITE_ENGINEER", "CONSTRUCTION_SUPERVISOR", "SYSTEM_ADMINISTRATOR"];

// Authentication & Role Check
if (!token || userType.toUpperCase() === "CLIENT") {
    window.location.replace("/staff-login.html");
} else if (!allowedRoles.includes(currentRole)) {
    alert("Access Denied: Task Assignment operations are restricted to Project Managers, Site Engineers, and Construction Supervisors only.");
    window.location.replace("/dashboard.html");
}

const API = "/api/task-assignments";

let allAssignments = [];
let allTasks = [];
let allStaff = [];
let editingAssignmentId = null;
let deletingAssignmentId = null;

document.addEventListener("DOMContentLoaded", async () => {
    setupEvents();
    loadProfile();
    await loadTasks();
    await loadStaff();
    await loadAssignments();
});

function setupEvents() {
    // Form submission
    const form = document.getElementById("assignmentForm");
    if (form) {
        form.addEventListener("submit", saveAssignment);
    }

    // Search and filter
    const searchInput = document.getElementById("assignmentSearch");
    if (searchInput) {
        searchInput.addEventListener("input", filterAssignments);
    }

    const statusFilter = document.getElementById("statusFilter");
    if (statusFilter) {
        statusFilter.addEventListener("change", filterAssignments);
    }

    // Modal click-outside dismissal
    document.querySelectorAll(".modal-overlay").forEach(modal => {
        modal.addEventListener("click", function(e) {
            if (e.target === this) {
                closeAllModals();
            }
        });
    });

    // Delete confirm button
    const confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
    if (confirmDeleteBtn) {
        confirmDeleteBtn.addEventListener("click", executeDeleteAssignment);
    }
}

function loadProfile() {
    const username = localStorage.getItem("wbcms_username") || "User";
    const fullName = localStorage.getItem("wbcms_full_name") || username;
    const role = localStorage.getItem("wbcms_role") || "PROJECT_MANAGER";

    const pName = document.getElementById("profileName");
    const dName = document.getElementById("dropdownUserName");
    const pRole = document.getElementById("profileRole");
    const headerAvatar = document.getElementById("headerAvatar");

    if (pName) pName.textContent = fullName;
    if (dName) dName.textContent = fullName;
    if (pRole) pRole.textContent = formatLabel(role);
    if (headerAvatar) headerAvatar.textContent = getInitials(fullName);
}

function getInitials(name) {
    if (!name) return "PM";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function authHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
    };
}

async function loadTasks() {
    try {
        const response = await fetch("/api/tasks?page=0&size=100&sort=title,asc", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Unable to load tasks.");

        const data = await response.json();
        allTasks = data.content || [];

        const select = document.getElementById("assignmentTask");
        if (select) {
            select.innerHTML = '<option value="">Select task</option>';
            allTasks.forEach(task => {
                const opt = document.createElement("option");
                opt.value = task.id;
                opt.textContent = `${task.title} — ${task.projectName || "No Project"}`;
                select.appendChild(opt);
            });
        }
    } catch (error) {
        console.error("Error loading tasks:", error);
    }
}

async function loadStaff() {
    try {
        const response = await fetch("/api/users?page=0&size=100&sort=fullName,asc", {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("Unable to load staff members.");

        const data = await response.json();
        const users = data.content || [];

        // Exclude client accounts
        allStaff = users.filter(user => (user.role || "").toUpperCase() !== "CLIENT");

        const select = document.getElementById("assignmentStaff");
        if (select) {
            select.innerHTML = '<option value="">Select staff member</option>';
            allStaff.forEach(user => {
                const opt = document.createElement("option");
                opt.value = user.id;
                opt.textContent = `${user.fullName || user.username} (${formatLabel(user.role)})`;
                select.appendChild(opt);
            });
        }
    } catch (error) {
        console.error("Error loading staff:", error);
    }
}

async function loadAssignments() {
    try {
        const response = await fetch(`${API}?page=0&size=100&sort=assignedDate,desc`, {
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                window.location.replace("/staff-login.html");
                return;
            }
            throw new Error("Unable to load assignments.");
        }

        const data = await response.json();
        allAssignments = data.content || [];

        updateStatistics();
        renderAssignments(allAssignments);
    } catch (error) {
        console.error("Error loading assignments:", error);
        showToast("Unable to load workforce assignments from server.", "error");
    }
}

function renderAssignments(assignments) {
    const tbody = document.getElementById("assignmentTableBody");
    const empty = document.getElementById("emptyTable");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!assignments || assignments.length === 0) {
        if (empty) empty.style.display = "block";
        return;
    }

    if (empty) empty.style.display = "none";

    assignments.forEach((assignment, index) => {
        const tr = document.createElement("tr");

        const statusClass = (assignment.status || "ACTIVE").toLowerCase();
        const statusText = formatLabel(assignment.status || "ACTIVE");

        tr.innerHTML = `
            <td style="color:#0f172a; font-weight:700; font-size:12.5px;">#${index + 1}</td>
            <td>
                <div style="font-weight:700; color:#0f172a; font-size:13.5px;">${escapeHtml(assignment.taskTitle || "Task #" + assignment.taskId)}</div>
                <small style="color:#64748b; font-size:11.5px; font-weight:500;">Task ID: #${assignment.taskId}</small>
            </td>
            <td>
                <div style="font-weight:600; color:#0f172a; font-size:13px;">${escapeHtml(assignment.staffName || "Staff #" + assignment.staffId)}</div>
                <small style="color:#64748b; font-size:11.5px;">@${escapeHtml(assignment.staffUsername || "unknown")}</small>
            </td>
            <td>
                <span class="role-pill">
                    <i class="bi bi-person-badge"></i>
                    ${escapeHtml(formatLabel(assignment.staffRole || "Staff"))}
                </span>
            </td>
            <td style="font-size:12.5px; color:#0f172a; font-weight:500;">
                <i class="bi bi-calendar3" style="color:#64748b; margin-right:4px;"></i>
                ${formatDate(assignment.assignedDate)}
            </td>
            <td>
                <div class="responsibility-cell" title="${escapeHtml(assignment.responsibility || "")}">
                    ${escapeHtml(assignment.responsibility || "-")}
                </div>
            </td>
            <td>
                <span class="status-badge ${statusClass}">
                    ${statusText}
                </span>
            </td>
            <td style="text-align: center;">
                <div class="table-actions" style="justify-content:center;">
                    <button class="table-action view" onclick="viewAssignment(${assignment.id})" title="View Details">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="table-action edit" onclick="editAssignment(${assignment.id})" title="Edit Assignment">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="table-action delete" onclick="confirmDeleteAssignment(${assignment.id})" title="Delete Assignment">
                        <i class="bi bi-trash3"></i>
                    </button>
                </div>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function updateStatistics() {
    const total = allAssignments.length;
    const active = allAssignments.filter(a => (a.status || "").toUpperCase() === "ACTIVE").length;
    const completed = allAssignments.filter(a => (a.status || "").toUpperCase() === "COMPLETED").length;
    const cancelled = allAssignments.filter(a => (a.status || "").toUpperCase() === "CANCELLED").length;

    const elTotal = document.getElementById("totalAssignments");
    const elActive = document.getElementById("activeAssignments");
    const elCompleted = document.getElementById("completedAssignments");
    const elCancelled = document.getElementById("cancelledAssignments");

    if (elTotal) elTotal.textContent = total;
    if (elActive) elActive.textContent = active;
    if (elCompleted) elCompleted.textContent = completed;
    if (elCancelled) elCancelled.textContent = cancelled;
}

function filterAssignments() {
    const query = (document.getElementById("assignmentSearch")?.value || "").toLowerCase().trim();
    const status = (document.getElementById("statusFilter")?.value || "").toUpperCase().trim();

    const filtered = allAssignments.filter(item => {
        const text = [
            item.taskTitle,
            item.staffName,
            item.staffUsername,
            item.staffRole,
            item.responsibility
        ].filter(Boolean).join(" ").toLowerCase();

        const matchQuery = !query || text.includes(query);
        const matchStatus = !status || (item.status || "").toUpperCase() === status;

        return matchQuery && matchStatus;
    });

    renderAssignments(filtered);
}

// Modal open/close methods
function openCreateModal() {
    editingAssignmentId = null;
    clearErrors();

    const modalTitle = document.getElementById("modalTitle");
    if (modalTitle) modalTitle.textContent = "Assign Staff to Task";

    const saveBtn = document.getElementById("saveAssignmentBtn");
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="bi bi-check-lg"></i> <span>Save Assignment</span>';
    }

    const form = document.getElementById("assignmentForm");
    if (form) form.reset();

    const dateInput = document.getElementById("assignedDate");
    if (dateInput) {
        dateInput.value = new Date().toISOString().split("T")[0];
    }

    const statusSelect = document.getElementById("assignmentStatus");
    if (statusSelect) statusSelect.value = "ACTIVE";

    const modal = document.getElementById("assignmentModal");
    if (modal) modal.classList.add("show");
}

function editAssignment(id) {
    const assignment = allAssignments.find(a => a.id === id);
    if (!assignment) return;

    editingAssignmentId = id;
    clearErrors();

    const modalTitle = document.getElementById("modalTitle");
    if (modalTitle) modalTitle.textContent = "Edit Task Assignment";

    const saveBtn = document.getElementById("saveAssignmentBtn");
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="bi bi-save"></i> <span>Update Assignment</span>';
    }

    document.getElementById("assignmentId").value = assignment.id;
    document.getElementById("assignmentTask").value = assignment.taskId;
    document.getElementById("assignmentStaff").value = assignment.staffId;
    document.getElementById("assignedDate").value = assignment.assignedDate || "";
    document.getElementById("assignmentStatus").value = assignment.status || "ACTIVE";
    document.getElementById("responsibility").value = assignment.responsibility || "";

    closeViewModal();
    const modal = document.getElementById("assignmentModal");
    if (modal) modal.classList.add("show");
}

function closeModal() {
    const modal = document.getElementById("assignmentModal");
    if (modal) modal.classList.remove("show");
    editingAssignmentId = null;
}

function closeAllModals() {
    closeModal();
    closeViewModal();
    closeDeleteModal();
}

// View Details Modal
function viewAssignment(id) {
    const assignment = allAssignments.find(a => a.id === id);
    if (!assignment) return;

    const content = document.getElementById("viewAssignmentContent");
    if (!content) return;

    const statusClass = (assignment.status || "ACTIVE").toLowerCase();

    content.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">Task</span>
            <div class="detail-value">
                <strong>${escapeHtml(assignment.taskTitle || "Task #" + assignment.taskId)}</strong>
                <div style="font-size:11.5px; color:#64748b;">Task ID: #${assignment.taskId}</div>
            </div>
        </div>
        <div class="detail-row">
            <span class="detail-label">Assigned Staff</span>
            <div class="detail-value">
                <strong>${escapeHtml(assignment.staffName || "Staff #" + assignment.staffId)}</strong>
                <div style="font-size:11.5px; color:#64748b;">@${escapeHtml(assignment.staffUsername || "unknown")}</div>
            </div>
        </div>
        <div class="detail-row">
            <span class="detail-label">Designation / Role</span>
            <div class="detail-value">
                <span class="role-pill">${escapeHtml(formatLabel(assignment.staffRole || "Staff"))}</span>
            </div>
        </div>
        <div class="detail-row">
            <span class="detail-label">Assigned Date</span>
            <div class="detail-value">${formatDate(assignment.assignedDate)}</div>
        </div>
        <div class="detail-row">
            <span class="detail-label">Status</span>
            <div class="detail-value">
                <span class="status-badge ${statusClass}">${formatLabel(assignment.status || "ACTIVE")}</span>
            </div>
        </div>
        <div class="detail-row" style="flex-direction:column; gap:6px;">
            <span class="detail-label" style="width:100%;">Responsibility & Scope</span>
            <div class="detail-value" style="background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #e2e8f0; font-size:13px; line-height:1.6; white-space:pre-wrap;">${escapeHtml(assignment.responsibility || "No specific responsibility notes documented.")}</div>
        </div>
        ${assignment.createdAt ? `
        <div class="detail-row">
            <span class="detail-label">Created At</span>
            <div class="detail-value" style="font-size:12px; color:#64748b;">${new Date(assignment.createdAt).toLocaleString()}</div>
        </div>` : ''}
    `;

    const editBtn = document.getElementById("viewModalEditBtn");
    if (editBtn) {
        editBtn.onclick = () => editAssignment(assignment.id);
    }

    const modal = document.getElementById("viewAssignmentModal");
    if (modal) modal.classList.add("show");
}

function closeViewModal() {
    const modal = document.getElementById("viewAssignmentModal");
    if (modal) modal.classList.remove("show");
}

// Delete Confirmation Modal
function confirmDeleteAssignment(id) {
    const assignment = allAssignments.find(a => a.id === id);
    if (!assignment) return;

    deletingAssignmentId = id;
    const msg = document.getElementById("deleteConfirmMessage");
    if (msg) {
        msg.innerHTML = `Are you sure you want to remove <strong>${escapeHtml(assignment.staffName || "this staff member")}</strong> from <strong>"${escapeHtml(assignment.taskTitle || "Task #" + assignment.taskId)}"</strong>?`;
    }

    const modal = document.getElementById("deleteAssignmentModal");
    if (modal) modal.classList.add("show");
}

function closeDeleteModal() {
    const modal = document.getElementById("deleteAssignmentModal");
    if (modal) modal.classList.remove("show");
    deletingAssignmentId = null;
}

async function executeDeleteAssignment() {
    if (!deletingAssignmentId) return;

    const btn = document.getElementById("confirmDeleteBtn");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> <span>Deleting...</span>';
    }

    try {
        const response = await fetch(`${API}/${deletingAssignmentId}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(errText || "Unable to delete assignment.");
        }

        closeDeleteModal();
        await loadAssignments();
        showToast("Successfully deleted assignment!", "success");
    } catch (error) {
        console.error("Delete error:", error);
        showToast(error.message || "Error deleting assignment.", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-trash"></i> <span>Delete Assignment</span>';
        }
    }
}

// Save (Create / Update)
async function saveAssignment(event) {
    event.preventDefault();
    clearErrors();

    const taskId = document.getElementById("assignmentTask")?.value;
    const staffId = document.getElementById("assignmentStaff")?.value;
    const assignedDate = document.getElementById("assignedDate")?.value;
    const status = document.getElementById("assignmentStatus")?.value;
    const responsibility = document.getElementById("responsibility")?.value.trim();

    let valid = true;

    if (!taskId) {
        showError("taskError", "Please select a task.");
        valid = false;
    }
    if (!staffId) {
        showError("staffError", "Please select a staff member.");
        valid = false;
    }
    if (!assignedDate) {
        showError("dateError", "Assigned date is required.");
        valid = false;
    }
    if (!responsibility) {
        showError("responsibilityError", "Responsibility description is required.");
        valid = false;
    }

    if (!valid) return;

    const payload = {
        taskId: Number(taskId),
        staffId: Number(staffId),
        assignedDate,
        responsibility,
        status: status || "ACTIVE"
    };

    const saveBtn = document.getElementById("saveAssignmentBtn");
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> <span>Saving...</span>';
    }

    try {
        const url = editingAssignmentId ? `${API}/${editingAssignmentId}` : API;
        const method = editingAssignmentId ? "PUT" : "POST";

        const response = await fetch(url, {
            method,
            headers: authHeaders(),
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || "Failed to save assignment.");
        }

        closeModal();
        await loadAssignments();
        showToast(editingAssignmentId ? "Successfully edited assignment!" : "Successfully assigned staff member!", "success");
    } catch (error) {
        console.error("Save error:", error);
        showToast(error.message || (editingAssignmentId ? "Error editing assignment: Failed to update." : "Error creating assignment."), "error");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = editingAssignmentId
                ? '<i class="bi bi-save"></i> <span>Update Assignment</span>'
                : '<i class="bi bi-check-lg"></i> <span>Save Assignment</span>';
        }
    }
}

function clearErrors() {
    document.querySelectorAll(".error-msg").forEach(el => el.textContent = "");
}

function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
}

function formatDate(date) {
    if (!date) return "-";
    return new Date(date + "T00:00:00").toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function formatLabel(value) {
    if (!value) return "-";
    return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const msgEl = document.getElementById("toastMessage");
    if (!toast || !msgEl) return;

    msgEl.textContent = message;
    toast.className = "toast" + (type === "error" ? " error" : "") + " show";

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}

function logout() {
    if (typeof openLogoutConfirmModal === "function") {
        openLogoutConfirmModal();
    } else {
        localStorage.clear();
        window.location.replace("/staff-login.html");
    }
}