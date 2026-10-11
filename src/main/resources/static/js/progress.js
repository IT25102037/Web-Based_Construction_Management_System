/* =========================================================
   WBCMS - PROGRESS MONITORING JAVASCRIPT
   Real Full-Stack Integration with Spring Boot & SQL Server
========================================================= */

const authToken = localStorage.getItem("wbcms_token");
const userType = localStorage.getItem("wbcms_user_type");
const username = localStorage.getItem("wbcms_username") || "Supervisor";
const fullName = localStorage.getItem("wbcms_full_name") || username;
const role = localStorage.getItem("wbcms_role") || localStorage.getItem("wbcms_staff_role") || "CONSTRUCTION_SUPERVISOR";

if (!authToken || userType === "CLIENT") {
    window.location.replace("/staff-login.html");
}

let allReports = [];
let projectsList = [];
let projectTasks = {};
let editingReportId = null;
let deletingReportId = null;

document.addEventListener("DOMContentLoaded", async function () {
    loadUserInformation();
    await loadProjects();
    await loadProgress();

    const searchInput = document.getElementById("progressSearch");
    if (searchInput) {
        searchInput.addEventListener("input", debounce(renderProgress, 250));
    }

    // Close profile dropdown when clicking outside
    document.addEventListener("click", (e) => {
        const profileCard = document.getElementById("profileCard");
        if (profileCard && !profileCard.contains(e.target)) {
            profileCard.classList.remove("open");
        }
    });
});

function loadUserInformation() {
    const pName = document.getElementById("profileName");
    const pRole = document.getElementById("profileRole");
    const dName = document.getElementById("dropdownUserName");
    const dRole = document.getElementById("dropdownUserRole");

    const formattedRole = formatRole(role);
    if (pName) pName.textContent = fullName;
    if (pRole) pRole.textContent = formattedRole;
    if (dName) dName.textContent = fullName;
    if (dRole) dRole.textContent = formattedRole;

    const avatar = document.getElementById("avatarBadge");
    if (avatar) {
        avatar.textContent = getInitials(fullName);
    }
}

function getInitials(name) {
    if (!name) return "CS";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatRole(value) {
    if (!value) return "Supervisor";
    return value
        .replace(/^ROLE_/, "")
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
}

function getAuthHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + authToken
    };
}

async function loadProjects() {
    try {
        const response = await fetch("/api/projects?page=0&size=100&sort=id,desc", { headers: getAuthHeaders() });
        if (response.ok) {
            const data = await response.json();
            projectsList = data.content || data || [];
            populateProjectDropdowns();
        }
    } catch (err) {
        console.warn("Could not load projects for progress:", err);
    }
}

function populateProjectDropdowns() {
    const filterSel = document.getElementById("projectFilter");
    const formSel = document.getElementById("progressProject");

    if (filterSel) {
        filterSel.innerHTML = '<option value="">All Projects</option>';
        projectsList.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = p.name;
            filterSel.appendChild(opt);
        });
    }

    if (formSel) {
        formSel.innerHTML = '<option value="">Select Project</option>';
        projectsList.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = `${p.name} (${formatRole(p.status || 'PLANNED')})`;
            formSel.appendChild(opt);
        });
    }
}

async function onProjectSelected(projectId) {
    const taskSel = document.getElementById("progressTask");
    if (!taskSel) return;

    taskSel.innerHTML = '<option value="">General Project Milestone (No specific task)</option>';
    if (!projectId) return;

    try {
        const res = await fetch(`/api/tasks?projectId=${projectId}&page=0&size=50`, { headers: getAuthHeaders() });
        if (res.ok) {
            const data = await res.json();
            const tasks = data.content || data || [];
            projectTasks[projectId] = tasks;
            tasks.forEach(t => {
                const opt = document.createElement("option");
                opt.value = t.id;
                opt.textContent = `Task #${t.id}: ${t.title || t.name || 'Untitled Task'} (${t.status})`;
                taskSel.appendChild(opt);
            });
        }
    } catch (e) {
        console.warn("Could not load tasks for project:", projectId, e);
    }
}

async function loadProgress() {
    const tableBody = document.getElementById("progressTableBody");
    try {
        const response = await fetch("/api/progress-reports?page=0&size=100&sort=id,desc", {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error("Failed to load progress reports (" + response.status + ")");
        }

        const data = await response.json();
        allReports = data.content || data || [];

        renderProgress();
        updateStatistics();

    } catch (error) {
        console.error("Progress reports error:", error);
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding: 30px; color: #f87171;">
                        Error loading reports: ${escapeHtml(error.message)}
                    </td>
                </tr>
            `;
        }
    }
}

function renderProgress() {
    const tableBody = document.getElementById("progressTableBody");
    const emptyTable = document.getElementById("emptyTable");
    const search = (document.getElementById("progressSearch")?.value || "").toLowerCase().trim();
    const projectFilter = document.getElementById("projectFilter")?.value || "";

    const filtered = allReports.filter(r => {
        const notes = (r.statusUpdate || "").toLowerCase();
        const reporter = (r.reportedByName || "").toLowerCase();
        const projName = (r.projectName || "").toLowerCase();
        const projMatch = !projectFilter || String(r.projectId) === String(projectFilter);
        const searchMatch = !search || notes.includes(search) || reporter.includes(search) || projName.includes(search);
        return projMatch && searchMatch;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = "";
        if (emptyTable) emptyTable.style.display = "block";
        return;
    }

    if (emptyTable) emptyTable.style.display = "none";
    tableBody.innerHTML = "";

    filtered.forEach((r, index) => {
        const proj = projectsList.find(p => p.id === r.projectId);
        const projName = r.projectName || (proj ? proj.name : `Project #${r.projectId}`);
        const pct = Math.min(100, Math.max(0, Number(r.completionPercentage || 0)));
        const statusClass = (r.status || "ON_TRACK").toLowerCase();
        const barColor = pct >= 80 ? "#34d399" : (pct >= 40 ? "#ff7a1a" : "#fbbf24");
        const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "N/A";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><strong>#${r.id}</strong></td>
            <td>
                <strong style="color:#f1f5f9; display:block;">${escapeHtml(projName)}</strong>
                <small style="color:#64748b;">${r.taskTitle ? 'Task: ' + escapeHtml(r.taskTitle) : 'Project Level'}</small>
            </td>
            <td><strong style="font-size:13.5px; color:#fff;">${pct}%</strong></td>
            <td>
                <div style="background: rgba(255,255,255,0.08); border-radius: 6px; height: 8px; width: 110px; overflow: hidden; display: flex;">
                    <div style="width: ${pct}%; height: 100%; background: ${barColor}; border-radius: 6px; transition: width 0.3s ease;"></div>
                </div>
            </td>
            <td><span class="status-badge ${statusClass}">${formatRole(r.status || 'ON_TRACK')}</span></td>
            <td>
                <span style="color:#cbd5e1; font-weight:500;">${escapeHtml(r.reportedByName || "Supervisor")}</span>
            </td>
            <td><small style="color:#94a3b8;">${escapeHtml(dateStr)}</small></td>
            <td>
                <div class="table-actions">
                    <button class="table-action view" title="View Details" onclick="viewProgress(${r.id})">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="table-action edit" title="Edit Progress Log" onclick="editProgress(${r.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="table-action delete" title="Delete Progress Log" onclick="openDeleteProgressModal(${r.id})">
                        <i class="bi bi-trash3"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function updateStatistics() {
    const total = allReports.length;
    const onTrack = allReports.filter(r => r.status === "ON_TRACK" || r.status === "COMPLETED" || r.status === "IN_PROGRESS").length;
    const delayed = allReports.filter(r => r.status === "DELAYED" || r.status === "BLOCKED").length;

    let avg = 0;
    if (total > 0) {
        const sum = allReports.reduce((acc, curr) => acc + Number(curr.completionPercentage || 0), 0);
        avg = Math.round(sum / total);
    }

    const totalEl = document.getElementById("totalReports");
    const avgEl = document.getElementById("avgProgress");
    const onTrackEl = document.getElementById("onTrackReports");
    const delayedEl = document.getElementById("delayedReports");

    if (totalEl) totalEl.textContent = total;
    if (avgEl) avgEl.textContent = `${avg}%`;
    if (onTrackEl) onTrackEl.textContent = onTrack;
    if (delayedEl) delayedEl.textContent = delayed;
}

async function openProgressModal() {
    editingReportId = null;
    document.getElementById("modalTitle").textContent = "Log Progress Update";
    document.getElementById("progressForm").reset();
    document.getElementById("reportId").value = "";
    document.getElementById("completionPercentage").value = "25";
    document.getElementById("percentRange").value = "25";
    document.getElementById("progressStatus").value = "ON_TRACK";
    clearValidation();

    if (!projectsList || projectsList.length === 0) {
        await loadProjects();
    }

    const modal = document.getElementById("progressModal");
    if (modal) {
        modal.classList.add("show");
        modal.classList.add("active");
        modal.style.display = "flex";
    }
}

async function editProgress(id) {
    const r = allReports.find(item => item.id === id);
    if (!r) return;

    editingReportId = id;
    document.getElementById("modalTitle").textContent = "Edit Progress Update (#" + id + ")";
    document.getElementById("reportId").value = r.id;

    if (!projectsList || projectsList.length === 0) {
        await loadProjects();
    }

    document.getElementById("progressProject").value = r.projectId || "";
    await onProjectSelected(r.projectId);

    if (r.taskId) {
        document.getElementById("progressTask").value = r.taskId;
    }

    const pct = r.completionPercentage != null ? r.completionPercentage : 0;
    document.getElementById("completionPercentage").value = pct;
    document.getElementById("percentRange").value = pct;
    document.getElementById("progressStatus").value = r.status || "ON_TRACK";
    document.getElementById("statusUpdate").value = r.statusUpdate || "";

    clearValidation();
    const modal = document.getElementById("progressModal");
    if (modal) {
        modal.classList.add("show");
        modal.classList.add("active");
        modal.style.display = "flex";
    }
}

function closeProgressModal() {
    const modal = document.getElementById("progressModal");
    if (modal) {
        modal.classList.remove("show");
        modal.classList.remove("active");
        modal.style.display = "none";
    }
}

async function saveProgress(event) {
    event.preventDefault();

    const projVal = document.getElementById("progressProject").value;
    const projectId = (projVal && !isNaN(Number(projVal))) ? Number(projVal) : null;

    const taskVal = document.getElementById("progressTask").value;
    const taskId = (taskVal && !isNaN(Number(taskVal)) && Number(taskVal) > 0) ? Number(taskVal) : null;

    const pctVal = document.getElementById("completionPercentage").value;
    const completionPercentage = Number(pctVal);

    const status = document.getElementById("progressStatus").value || "ON_TRACK";
    const statusUpdate = (document.getElementById("statusUpdate").value || "").trim();

    clearValidation();

    if (!projectId) {
        document.getElementById("projectError").textContent = "Please select a project.";
        return;
    }
    if (isNaN(completionPercentage) || completionPercentage < 0 || completionPercentage > 100) {
        document.getElementById("percentError").textContent = "Completion must be between 0 and 100%.";
        return;
    }
    if (!statusUpdate) {
        document.getElementById("notesError").textContent = "Supervisor notes & highlights are required.";
        return;
    }

    // Resolve user ID
    let rawUserId = localStorage.getItem("wbcms_user_id");
    if (!rawUserId) {
        try {
            const uObj = JSON.parse(localStorage.getItem("wbcms_user") || "{}");
            rawUserId = uObj.id;
        } catch (e) {}
    }
    const reportedById = (rawUserId && !isNaN(Number(rawUserId)) && Number(rawUserId) > 0) ? Number(rawUserId) : null;

    const payload = {
        projectId,
        taskId,
        completionPercentage,
        status,
        statusUpdate,
        reportedById
    };

    const submitBtn = document.getElementById("submitProgressBtn");
    if (submitBtn) { 
        submitBtn.disabled = true; 
        submitBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Saving...'; 
    }

    try {
        let response;
        if (editingReportId) {
            response = await fetch(`/api/progress-reports/${editingReportId}`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
        } else {
            response = await fetch("/api/progress-reports", {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
        }

        const data = await response.json().catch(() => null);
        if (!response.ok) {
            throw new Error((data && (data.message || data.error)) || "Failed to save progress update.");
        }

        showToast(editingReportId ? "Progress update modified successfully." : "Progress update logged into system!");
        closeProgressModal();
        await loadProgress();

    } catch (error) {
        console.error("Save progress error:", error);
        showToast(error.message, "error");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> Save Update';
        }
    }
}

// View Details Modal
function viewProgress(id) {
    const r = allReports.find(item => item.id === id);
    if (!r) return;

    const proj = projectsList.find(p => p.id === r.projectId);
    const projName = r.projectName || (proj ? proj.name : `Project #${r.projectId}`);
    const pct = r.completionPercentage || 0;
    const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleString() : "N/A";

    document.getElementById("viewId").textContent = "#" + r.id;
    document.getElementById("viewProject").textContent = projName + (r.taskTitle ? ` (Task: ${r.taskTitle})` : "");
    document.getElementById("viewPercent").textContent = `${pct}%`;
    
    const statusBadge = document.getElementById("viewStatus");
    statusBadge.textContent = formatRole(r.status || "ON_TRACK");
    statusBadge.className = "status-badge " + (r.status || "on_track").toLowerCase();

    document.getElementById("viewReporter").textContent = r.reportedByName || "Supervisor User";
    document.getElementById("viewDate").textContent = dateStr;
    document.getElementById("viewNotes").textContent = r.statusUpdate || "No detailed notes provided.";

    const modal = document.getElementById("viewModal");
    if (modal) {
        modal.classList.add("show");
        modal.classList.add("active");
        modal.style.display = "flex";
    }
}

function closeViewModal() {
    const modal = document.getElementById("viewModal");
    if (modal) {
        modal.classList.remove("show");
        modal.classList.remove("active");
        modal.style.display = "none";
    }
}

// Delete Modal Workflow
function openDeleteProgressModal(id) {
    deletingReportId = id;
    const modal = document.getElementById("deleteModal");
    if (modal) {
        modal.classList.add("show");
        modal.classList.add("active");
        modal.style.display = "flex";
    }
}

function closeDeleteModal() {
    deletingReportId = null;
    const modal = document.getElementById("deleteModal");
    if (modal) {
        modal.classList.remove("show");
        modal.classList.remove("active");
        modal.style.display = "none";
    }
}

async function executeDeleteProgress() {
    if (!deletingReportId) return;

    const btn = document.getElementById("confirmDeleteBtn");
    if (btn) { btn.disabled = true; btn.textContent = "Deleting..."; }

    try {
        const response = await fetch(`/api/progress-reports/${deletingReportId}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error("Failed to delete progress report.");
        }

        showToast("Progress report deleted successfully.");
        closeDeleteModal();
        await loadProgress();

    } catch (error) {
        showToast(error.message, "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-trash3-fill"></i> Delete Report';
        }
    }
}

function clearValidation() {
    document.querySelectorAll(".validation-message").forEach(el => el.textContent = "");
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");
    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;
    toast.className = "toast show " + type;
    setTimeout(() => { toast.className = "toast"; }, 4000);
}

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
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
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("wbcms_token");
        localStorage.removeItem("wbcms_user_type");
        localStorage.removeItem("wbcms_role");
        localStorage.removeItem("wbcms_username");
        localStorage.removeItem("wbcms_user");
        localStorage.removeItem("wbcms_user_id");
        window.location.replace("/staff-login.html");
    }
}

// Ensure global accessibility for inline event handlers
window.openProgressModal = openProgressModal;
window.closeProgressModal = closeProgressModal;
window.editProgress = editProgress;
window.saveProgress = saveProgress;
window.viewProgress = viewProgress;
window.closeViewModal = closeViewModal;
window.openDeleteProgressModal = openDeleteProgressModal;
window.closeDeleteModal = closeDeleteModal;
window.executeDeleteProgress = executeDeleteProgress;
window.onProjectSelected = onProjectSelected;
window.renderProgress = renderProgress;
window.showToast = showToast;
window.logout = logout;

