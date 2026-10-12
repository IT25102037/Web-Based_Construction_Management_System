/* ==========================================================================
   WBCMS - PROGRESS MONITORING & ISSUE TELEMETRY ENGINE
   Role Gated: PROJECT_MANAGER, SITE_ENGINEER, CONSTRUCTION_SUPERVISOR
   ========================================================================== */

let allIssues = [];
let allProjects = [];
let allTasks = [];
let currentProjectId = "";
let currentStatus = "";
let currentSeverity = "";
let searchQuery = "";
let editingIssueId = null;
let deletingIssueId = null;

// Auth check & Role Verification
const AUTH_TOKEN = localStorage.getItem("wbcms_token");
const USER_ROLE = (localStorage.getItem("wbcms_role") || "").toUpperCase();
const CURRENT_USER = JSON.parse(localStorage.getItem("wbcms_user") || "{}");

const ALLOWED_ROLES = ["PROJECT_MANAGER", "SITE_ENGINEER", "CONSTRUCTION_SUPERVISOR", "SYSTEM_ADMINISTRATOR"];

document.addEventListener("DOMContentLoaded", function () {
    // 1. Role Authorization Gate
    if (!AUTH_TOKEN) {
        window.location.replace("/staff-login.html");
        return;
    }

    if (!ALLOWED_ROLES.includes(USER_ROLE)) {
        showAccessDeniedBanner();
        return;
    }

    // Initialize UI
    initUserBadge();
    initEventListeners();

    // Fetch initial data
    loadProjects();
    loadIssues();
});

function getAuthHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + AUTH_TOKEN
    };
}

function showAccessDeniedBanner() {
    const mainSection = document.querySelector(".page-content");
    if (mainSection) {
        mainSection.innerHTML = `
            <div style="max-width: 600px; margin: 80px auto; text-align: center; background: #ffffff; border: 1px solid #fee2e2; border-radius: 16px; padding: 40px; box-shadow: 0 10px 25px rgba(220, 38, 38, 0.1);">
                <div style="width: 64px; height: 64px; border-radius: 50%; background: #fee2e2; color: #dc2626; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; margin-bottom: 20px;">
                    <i class="bi bi-shield-lock-fill"></i>
                </div>
                <h2 style="font-size: 22px; color: #991b1b; margin-bottom: 12px; font-weight: 800;">Access Restricted</h2>
                <p style="font-size: 14px; color: #4b5563; line-height: 1.6; margin-bottom: 24px;">
                    Progress Monitoring is strictly reserved for <strong>Project Managers</strong>, <strong>Site Engineers</strong>, and <strong>Construction Supervisors</strong>. Your current role is <strong>${escapeHtml(USER_ROLE || 'Unauthorized')}</strong>.
                </p>
                <a href="/dashboard.html" class="btn btn-primary" style="background:#2563eb; color:#ffffff; padding:10px 20px; border-radius:8px; text-decoration:none; font-weight:600; display:inline-flex; align-items:center; gap:8px;">
                    <i class="bi bi-arrow-left"></i> Return to Dashboard
                </a>
            </div>
        `;
    }
}

function initUserBadge() {
    const avatarBadge = document.getElementById("avatarBadge");
    const profileName = document.getElementById("profileName");
    const profileRole = document.getElementById("profileRole");
    const dropName = document.getElementById("dropdownUserName");
    const dropRole = document.getElementById("dropdownUserRole");

    const name = CURRENT_USER.fullName || CURRENT_USER.username || "Staff Member";
    const initials = name.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();

    if (avatarBadge) avatarBadge.textContent = initials || "PM";
    if (profileName) profileName.textContent = name;
    if (profileRole) profileRole.textContent = USER_ROLE.replace("_", " ");
    if (dropName) dropName.textContent = name;
    if (dropRole) dropRole.textContent = USER_ROLE.replace("_", " ");
}

function initEventListeners() {
    // Filter Project
    const filterProj = document.getElementById("filterProject");
    if (filterProj) {
        filterProj.addEventListener("change", function () {
            currentProjectId = this.value;
            filterAndRenderIssues();
        });
    }

    // Filter Status
    const filterStat = document.getElementById("filterStatus");
    if (filterStat) {
        filterStat.addEventListener("change", function () {
            currentStatus = this.value;
            filterAndRenderIssues();
        });
    }

    // Filter Severity
    const filterSev = document.getElementById("filterSeverity");
    if (filterSev) {
        filterSev.addEventListener("change", function () {
            currentSeverity = this.value;
            filterAndRenderIssues();
        });
    }

    // Search input
    const searchInput = document.getElementById("searchIssuesInput");
    if (searchInput) {
        searchInput.addEventListener("input", function () {
            searchQuery = this.value.toLowerCase().trim();
            filterAndRenderIssues();
        });
    }

    // Modal Project Change -> Load Tasks
    const issueProjSelect = document.getElementById("issueProjectId");
    if (issueProjSelect) {
        issueProjSelect.addEventListener("change", function () {
            loadTasksForProject(this.value);
        });
    }

    // Issue Form Submit
    const form = document.getElementById("issueForm");
    if (form) {
        form.addEventListener("submit", handleIssueSubmit);
    }
}

// -------------------------------------------------------------
// LOAD DATA
// -------------------------------------------------------------
async function loadProjects() {
    try {
        const res = await fetch("/api/projects", { headers: getAuthHeaders() });
        if (res.ok) {
            const data = await res.json();
            allProjects = Array.isArray(data) ? data : (data.content || []);
            populateProjectDropdowns();
        }
    } catch (err) {
        console.error("Failed to load projects:", err);
    }
}

function populateProjectDropdowns() {
    const filterProj = document.getElementById("filterProject");
    const modalProj = document.getElementById("issueProjectId");

    if (filterProj) {
        filterProj.innerHTML = `<option value="">All Projects</option>`;
        allProjects.forEach(p => {
            filterProj.innerHTML += `<option value="${p.id}">${escapeHtml(p.name)}</option>`;
        });
    }

    if (modalProj) {
        modalProj.innerHTML = `<option value="" disabled selected>Select Target Project</option>`;
        allProjects.forEach(p => {
            modalProj.innerHTML += `<option value="${p.id}">${escapeHtml(p.name)}</option>`;
        });
    }
}

async function loadTasksForProject(projectId, selectedTaskId = null) {
    const taskSelect = document.getElementById("issueTaskId");
    if (!taskSelect) return;

    if (!projectId) {
        taskSelect.innerHTML = `<option value="">General Site-wide Issue (No specific task)</option>`;
        return;
    }

    taskSelect.innerHTML = `<option value="">Loading tasks...</option>`;

    try {
        const res = await fetch(`/api/tasks?projectId=${projectId}`, { headers: getAuthHeaders() });
        if (res.ok) {
            const data = await res.json();
            const tasks = Array.isArray(data) ? data : (data.content || []);
            allTasks = tasks;

            taskSelect.innerHTML = `<option value="">General Site-wide Issue (No specific task)</option>`;
            tasks.forEach(t => {
                const isSel = selectedTaskId && String(selectedTaskId) === String(t.id) ? "selected" : "";
                taskSelect.innerHTML += `<option value="${t.id}" ${isSel}>${escapeHtml(t.title || 'Task #' + t.id)}</option>`;
            });
        } else {
            taskSelect.innerHTML = `<option value="">General Site-wide Issue (No specific task)</option>`;
        }
    } catch (err) {
        taskSelect.innerHTML = `<option value="">General Site-wide Issue (No specific task)</option>`;
    }
}

async function loadIssues() {
    const tbody = document.getElementById("issuesTableBody");
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #64748b;">
                    <i class="bi bi-arrow-repeat" style="font-size: 28px; animation: spin 1s infinite linear; display: inline-block;"></i>
                    <p style="margin: 8px 0 0 0; font-size: 13px;">Synchronizing progress monitoring telemetry...</p>
                </td>
            </tr>
        `;
    }

    try {
        let url = `/api/progress-issues?page=0&size=100`;
        const res = await fetch(url, { headers: getAuthHeaders() });
        if (res.ok) {
            const data = await res.json();
            allIssues = Array.isArray(data) ? data : (data.content || []);
            filterAndRenderIssues();
        } else {
            if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#ef4444;">Failed to load progress issues.</td></tr>`;
        }
    } catch (err) {
        console.error("Error loading issues:", err);
        if (tbody) tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#ef4444;">Network error loading progress monitoring data.</td></tr>`;
    }
}

// -------------------------------------------------------------
// FILTER & RENDER
// -------------------------------------------------------------
function filterAndRenderIssues() {
    let filtered = allIssues.filter(item => {
        // Project filter
        if (currentProjectId && String(item.projectId) !== String(currentProjectId)) {
            return false;
        }
        // Status filter
        if (currentStatus && item.status !== currentStatus) {
            return false;
        }
        // Severity filter
        if (currentSeverity && item.severity !== currentSeverity) {
            return false;
        }
        // Search
        if (searchQuery) {
            const matchTitle = (item.issueTitle || "").toLowerCase().includes(searchQuery);
            const matchDesc = (item.description || "").toLowerCase().includes(searchQuery);
            const matchProj = (item.projectName || "").toLowerCase().includes(searchQuery);
            const matchRep = (item.reportedByName || "").toLowerCase().includes(searchQuery);
            if (!matchTitle && !matchDesc && !matchProj && !matchRep) {
                return false;
            }
        }
        return true;
    });

    renderKPIs();
    renderTable(filtered);
}

function renderKPIs() {
    const total = allIssues.length;
    const open = allIssues.filter(i => i.status === "OPEN").length;
    const inProgress = allIssues.filter(i => i.status === "IN_PROGRESS").length;
    const resolved = allIssues.filter(i => i.status === "RESOLVED" || i.status === "CLOSED").length;

    const elTotal = document.getElementById("kpiTotalIssues");
    const elOpen = document.getElementById("kpiOpenBlockers");
    const elProg = document.getElementById("kpiInProgress");
    const elRes = document.getElementById("kpiResolved");

    if (elTotal) elTotal.textContent = total;
    if (elOpen) elOpen.textContent = open;
    if (elProg) elProg.textContent = inProgress;
    if (elRes) elRes.textContent = resolved;
}

function renderTable(issues) {
    const tbody = document.getElementById("issuesTableBody");
    if (!tbody) return;

    if (issues.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 45px 20px; color: #64748b;">
                    <i class="bi bi-shield-check" style="font-size: 36px; color: #10b981; display: block; margin-bottom: 8px;"></i>
                    <strong style="color: #0f172a; font-size: 14px;">No Site Issues or Blockers Recorded</strong>
                    <p style="margin: 4px 0 0 0; font-size: 12.5px; color: #64748b;">All site systems and construction timelines are operating smoothly.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = "";
    issues.forEach(issue => {
        const severityBadge = getSeverityBadge(issue.severity);
        const statusBadge = getStatusBadge(issue.status);
        const dateStr = issue.createdAt ? new Date(issue.createdAt).toLocaleDateString() : "Recent";

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>
                <div style="font-weight: 700; color: #0f172a; font-size: 13.5px; margin-bottom: 3px;">
                    ${escapeHtml(issue.issueTitle)}
                </div>
                <div style="color: #64748b; font-size: 12px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; max-width: 320px;">
                    ${escapeHtml(issue.description || "No description provided.")}
                </div>
            </td>
            <td>
                <div style="font-weight: 600; color: #1e293b; font-size: 13px;">
                    <i class="bi bi-building" style="color: #3b82f6; margin-right: 4px;"></i>
                    ${escapeHtml(issue.projectName || 'Project #' + issue.projectId)}
                </div>
                <div style="font-size: 11.5px; color: #64748b; margin-top: 2px;">
                    <i class="bi bi-check2-circle" style="color: #10b981; margin-right: 3px;"></i>
                    ${escapeHtml(issue.taskTitle || 'Site-wide Scope')}
                </div>
            </td>
            <td>${severityBadge}</td>
            <td>${statusBadge}</td>
            <td>
                <div style="font-weight: 600; color: #0f172a; font-size: 12.5px;">
                    ${escapeHtml(issue.reportedByName || 'Staff Member')}
                </div>
                <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
                    <i class="bi bi-calendar3"></i> ${dateStr}
                </div>
            </td>
            <td>
                <div style="color: ${issue.resolution ? '#0f172a' : '#94a3b8'}; font-size: 12px; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-style: ${issue.resolution ? 'normal' : 'italic'};">
                    ${issue.resolution ? escapeHtml(issue.resolution) : 'Resolution pending...'}
                </div>
            </td>
            <td>
                <div class="actions">
                    <button class="view-btn" onclick="openDetailsModal(${issue.id})" title="View Full Inspection">
                        <i class="bi bi-eye"></i> View
                    </button>
                    <button class="edit-btn" onclick="openEditModal(${issue.id})" title="Edit / Update Resolution">
                        <i class="bi bi-pencil"></i> Edit
                    </button>
                    <button class="delete-btn" onclick="openDeleteModal(${issue.id})" title="Delete Record">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function getSeverityBadge(severity) {
    const s = (severity || "").toUpperCase();
    if (s === "CRITICAL") {
        return `<span class="badge-severity critical"><i class="bi bi-exclamation-octagon-fill"></i> CRITICAL</span>`;
    }
    if (s === "HIGH") {
        return `<span class="badge-severity high"><i class="bi bi-arrow-up-circle-fill"></i> HIGH</span>`;
    }
    if (s === "MEDIUM") {
        return `<span class="badge-severity medium"><i class="bi bi-dash-circle-fill"></i> MEDIUM</span>`;
    }
    return `<span class="badge-severity low"><i class="bi bi-arrow-down-circle-fill"></i> LOW</span>`;
}

function getStatusBadge(status) {
    const s = (status || "").toUpperCase();
    if (s === "OPEN") {
        return `<span class="status-badge blocked">OPEN</span>`;
    }
    if (s === "IN_PROGRESS") {
        return `<span class="status-badge delayed">IN PROGRESS</span>`;
    }
    if (s === "RESOLVED") {
        return `<span class="status-badge completed">RESOLVED</span>`;
    }
    return `<span class="status-badge on_track">CLOSED</span>`;
}

// -------------------------------------------------------------
// CREATE & EDIT MODAL
// -------------------------------------------------------------
function openCreateModal() {
    editingIssueId = null;
    document.getElementById("modalTitle").innerHTML = `<i class="bi bi-plus-circle" style="color: #2563eb;"></i> Log New Progress Issue / Blocker`;
    document.getElementById("issueForm").reset();

    // Default values
    document.getElementById("issueSeverity").value = "HIGH";
    document.getElementById("issueStatus").value = "OPEN";
    document.getElementById("issueResolution").value = "";

    const taskSelect = document.getElementById("issueTaskId");
    if (taskSelect) {
        taskSelect.innerHTML = `<option value="">General Site-wide Issue (No specific task)</option>`;
    }

    openModal("issueModalOverlay");
}

async function openEditModal(id) {
    editingIssueId = id;
    document.getElementById("modalTitle").innerHTML = `<i class="bi bi-pencil-square" style="color: #ea580c;"></i> Update Progress Issue #${id}`;

    try {
        const res = await fetch(`/api/progress-issues/${id}`, { headers: getAuthHeaders() });
        if (!res.ok) {
            showToast("Failed to fetch issue details for editing", "error");
            return;
        }

        const issue = await res.json();
        document.getElementById("issueProjectId").value = issue.projectId || "";
        await loadTasksForProject(issue.projectId, issue.taskId);

        document.getElementById("issueTitle").value = issue.issueTitle || "";
        document.getElementById("issueDescription").value = issue.description || "";
        document.getElementById("issueSeverity").value = issue.severity || "MEDIUM";
        document.getElementById("issueStatus").value = issue.status || "OPEN";
        document.getElementById("issueResolution").value = issue.resolution || "";

        openModal("issueModalOverlay");
    } catch (err) {
        console.error("Error loading issue:", err);
        showToast("Error loading issue details", "error");
    }
}

async function handleIssueSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById("saveIssueBtn");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="bi bi-arrow-repeat" style="animation: spin 1s infinite linear;"></i> Saving...`;
    }

    const projectId = document.getElementById("issueProjectId").value;
    const taskIdVal = document.getElementById("issueTaskId").value;
    const taskId = taskIdVal ? Number(taskIdVal) : null;
    const issueTitle = document.getElementById("issueTitle").value.trim();
    const description = document.getElementById("issueDescription").value.trim();
    const severity = document.getElementById("issueSeverity").value;
    const status = document.getElementById("issueStatus").value;
    const resolution = document.getElementById("issueResolution").value.trim();

    // Reported by current user
    const reportedById = CURRENT_USER.id || 1;

    const payload = {
        projectId: Number(projectId),
        taskId: taskId,
        issueTitle: issueTitle,
        description: description,
        severity: severity,
        status: status,
        resolution: resolution || null,
        reportedById: Number(reportedById)
    };

    try {
        let url = "/api/progress-issues";
        let method = "POST";

        if (editingIssueId) {
            url = `/api/progress-issues/${editingIssueId}`;
            method = "PUT";
        }

        const res = await fetch(url, {
            method: method,
            headers: getAuthHeaders(),
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            closeModal("issueModalOverlay");
            showToast(editingIssueId ? "Progress issue updated successfully!" : "Progress issue logged successfully!", "success");
            await loadIssues();
        } else {
            const errData = await res.json().catch(() => ({}));
            showToast(errData.message || "Failed to save issue. Check required fields.", "error");
        }
    } catch (err) {
        console.error("Error saving issue:", err);
        showToast("Network error saving issue.", "error");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="bi bi-check-lg"></i> Save Issue`;
        }
    }
}

// -------------------------------------------------------------
// DETAILS MODAL
// -------------------------------------------------------------
async function openDetailsModal(id) {
    const detailsBody = document.getElementById("issueDetailsBody");
    if (!detailsBody) return;

    detailsBody.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #64748b;">
            <i class="bi bi-arrow-repeat" style="font-size: 32px; animation: spin 1s infinite linear; display: inline-block;"></i>
            <p style="margin-top: 10px;">Loading issue telemetry...</p>
        </div>
    `;
    openModal("issueDetailsModalOverlay");

    try {
        const res = await fetch(`/api/progress-issues/${id}`, { headers: getAuthHeaders() });
        if (!res.ok) {
            detailsBody.innerHTML = `<p style="color:#ef4444; text-align:center;">Failed to load details.</p>`;
            return;
        }

        const issue = await res.json();
        const severityBadge = getSeverityBadge(issue.severity);
        const statusBadge = getStatusBadge(issue.status);

        detailsBody.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <span style="font-size:12px; font-weight:700; color:#64748b; letter-spacing:0.04em;">ISSUE #${issue.id}</span>
                <div style="display:flex; gap:8px;">
                    ${severityBadge}
                    ${statusBadge}
                </div>
            </div>

            <h3 style="font-size:17px; font-weight:700; color:#0f172a; margin:0 0 16px 0; line-height:1.4;">
                ${escapeHtml(issue.issueTitle)}
            </h3>

            <div class="details-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:18px;">
                <div class="field-item">
                    <span class="field-label">Project</span>
                    <span class="field-val" style="color:#2563eb; font-weight:700;">
                        <i class="bi bi-building"></i> ${escapeHtml(issue.projectName || 'Project #' + issue.projectId)}
                    </span>
                </div>
                <div class="field-item">
                    <span class="field-label">Task</span>
                    <span class="field-val">
                        <i class="bi bi-clipboard-check"></i> ${escapeHtml(issue.taskTitle || 'Site-wide Scope')}
                    </span>
                </div>
                <div class="field-item">
                    <span class="field-label">Reported By</span>
                    <span class="field-val">
                        <i class="bi bi-person-badge"></i> ${escapeHtml(issue.reportedByName || 'Staff Member')}
                    </span>
                </div>
                <div class="field-item">
                    <span class="field-label">Logged Date</span>
                    <span class="field-val">
                        <i class="bi bi-calendar-event"></i> ${issue.createdAt ? new Date(issue.createdAt).toLocaleString() : 'Recent'}
                    </span>
                </div>
            </div>

            <span class="field-label">Issue & Root Cause Description</span>
            <div class="info-box" style="margin: 6px 0 16px 0; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:12px 14px;">
                <p style="margin:0; font-size:13.5px; line-height:1.55; color:#0f172a;">${escapeHtml(issue.description || 'No description provided.')}</p>
            </div>

            <span class="field-label">Corrective Action & Resolution Plan</span>
            <div class="info-box" style="margin: 6px 0 0 0; background:${issue.resolution ? '#ecfdf5' : '#fffbeb'}; border:1px solid ${issue.resolution ? '#a7f3d0' : '#fde68a'}; border-radius:10px; padding:12px 14px;">
                <p style="margin:0; font-size:13.5px; line-height:1.55; color:${issue.resolution ? '#065f46' : '#92400e'};">
                    ${issue.resolution ? escapeHtml(issue.resolution) : '<i class="bi bi-clock-history"></i> Resolution action plan has not been submitted yet.'}
                </p>
            </div>
        `;
    } catch (err) {
        detailsBody.innerHTML = `<p style="color:#ef4444; text-align:center;">Network error loading details.</p>`;
    }
}

// -------------------------------------------------------------
// DELETE MODAL
// -------------------------------------------------------------
function openDeleteModal(id) {
    deletingIssueId = id;
    const issue = allIssues.find(i => i.id === id);
    const titleEl = document.getElementById("deleteIssueTitle");
    if (titleEl && issue) {
        titleEl.textContent = `"${issue.issueTitle}"`;
    }
    openModal("deleteConfirmModalOverlay");
}

async function confirmDeleteIssue() {
    if (!deletingIssueId) return;

    const delBtn = document.getElementById("confirmDeleteBtn");
    if (delBtn) {
        delBtn.disabled = true;
        delBtn.innerHTML = `<i class="bi bi-arrow-repeat" style="animation: spin 1s infinite linear;"></i> Deleting...`;
    }

    try {
        const res = await fetch(`/api/progress-issues/${deletingIssueId}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });

        if (res.ok || res.status === 204) {
            closeModal("deleteConfirmModalOverlay");
            showToast("Issue deleted successfully", "success");
            await loadIssues();
        } else {
            showToast("Failed to delete issue", "error");
        }
    } catch (err) {
        console.error("Error deleting issue:", err);
        showToast("Network error deleting issue", "error");
    } finally {
        if (delBtn) {
            delBtn.disabled = false;
            delBtn.innerHTML = `Delete Permanently`;
        }
        deletingIssueId = null;
    }
}

// -------------------------------------------------------------
// MODAL CONTROLS & UTILITIES
// -------------------------------------------------------------
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add("open");
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove("open");
}

function showToast(message, type = "info") {
    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.style.cssText = "position:fixed; bottom:24px; right:24px; z-index:99999; display:flex; flex-direction:column; gap:10px;";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    let bg = "#1e293b";
    let icon = "bi-info-circle";
    if (type === "success") { bg = "#059669"; icon = "bi-check-circle"; }
    if (type === "error") { bg = "#dc2626"; icon = "bi-exclamation-triangle"; }

    toast.style.cssText = `background:${bg}; color:#ffffff; padding:12px 18px; border-radius:10px; font-size:13px; font-weight:600; display:flex; align-items:center; gap:8px; box-shadow:0 10px 25px rgba(0,0,0,0.25); animation:toastSlide 0.25s ease-out;`;
    toast.innerHTML = `<i class="bi ${icon}"></i> <span>${escapeHtml(message)}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transition = "opacity 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function escapeHtml(text) {
    if (!text) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function logout() {
    localStorage.removeItem("wbcms_token");
    localStorage.removeItem("wbcms_role");
    localStorage.removeItem("wbcms_user");
    window.location.replace("/staff-login.html");
}

function toggleSidebar() {
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) sidebar.classList.toggle("open");
}
