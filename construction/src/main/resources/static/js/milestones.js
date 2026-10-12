const token = localStorage.getItem("wbcms_token");
const userType = localStorage.getItem("wbcms_user_type");

if (!token || userType === "CLIENT") {
    window.location.replace("/staff-login.html");
}

let milestones = [];
let projects = [];
let activeDeleteMilestoneId = null;
let activeViewMilestoneId = null;

// =========================================================
// INITIAL LOAD
// =========================================================
document.addEventListener("DOMContentLoaded", async () => {
    loadProfile();
    await loadProjects();
    await loadMilestones();
    setupSearch();
    setupModalBackdropDismissal();
});

// =========================================================
// PROFILE
// =========================================================
function loadProfile() {
    const username = localStorage.getItem("wbcms_username");
    const role = localStorage.getItem("wbcms_role");

    const profileName = document.getElementById("profileName");
    if (profileName) profileName.textContent = username || "Staff User";

    const dropdownUserName = document.getElementById("dropdownUserName");
    if (dropdownUserName) dropdownUserName.textContent = username || "Staff User";

    const profileRole = document.getElementById("profileRole");
    if (profileRole) profileRole.textContent = formatRole(role || "STAFF");
}

function formatRole(role) {
    return role
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
}

// =========================================================
// LOAD PROJECTS
// =========================================================
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
            throw new Error("Failed to load projects");
        }

        const data = await response.json();
        projects = data.content || [];
        populateProjectSelects();

    } catch (error) {
        console.error("Load projects error:", error);
        showToast("Unable to load projects.", "error");
    }
}

// =========================================================
// PROJECT SELECTS
// =========================================================
function populateProjectSelects() {
    const filter = document.getElementById("projectFilter");
    const modalSelect = document.getElementById("milestoneProject");

    if (filter) {
        filter.innerHTML = `<option value="">All Projects</option>`;
        projects.forEach(project => {
            filter.innerHTML += `
                <option value="${project.id}">
                    ${escapeHtml(project.name)}
                </option>
            `;
        });
    }

    if (modalSelect) {
        modalSelect.innerHTML = `<option value="">Select Project</option>`;
        projects.forEach(project => {
            modalSelect.innerHTML += `
                <option value="${project.id}">
                    ${escapeHtml(project.name)}
                </option>
            `;
        });
    }
}

// =========================================================
// LOAD MILESTONES
// =========================================================
async function loadMilestones() {
    try {
        const projectFilter = document.getElementById("projectFilter");
        const statusFilter = document.getElementById("statusFilter");

        const projectId = projectFilter ? projectFilter.value : "";
        const status = statusFilter ? statusFilter.value : "";

        let url = "/api/milestones?page=0&size=100&sort=targetDate,asc";

        if (projectId) {
            url += `&projectId=${encodeURIComponent(projectId)}`;
        }

        if (status) {
            url += `&status=${encodeURIComponent(status)}`;
        }

        const response = await fetch(url, {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to load milestones (${response.status})`);
        }

        const data = await response.json();
        milestones = data.content || [];

        renderMilestones();
        updateStatistics();

    } catch (error) {
        console.error("Load milestones error:", error);
        const tbody = document.getElementById("milestoneTableBody");
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #ef4444; font-weight: 600;">
                        <i class="bi bi-exclamation-triangle" style="font-size: 24px; display: block; margin-bottom: 8px;"></i>
                        Failed to load milestones from database.
                    </td>
                </tr>
            `;
        }
    }
}

// =========================================================
// RENDER MILESTONES
// =========================================================
function renderMilestones() {
    const tbody = document.getElementById("milestoneTableBody");
    const empty = document.getElementById("emptyTable");

    if (!tbody) return;

    if (milestones.length === 0) {
        tbody.innerHTML = "";
        if (empty) empty.style.display = "block";
        return;
    }

    const searchInput = document.getElementById("milestoneSearch");
    const search = searchInput ? searchInput.value.trim().toLowerCase() : "";

    const filtered = milestones.filter(m => {
        return !search
            || (m.name && m.name.toLowerCase().includes(search))
            || (m.projectName && m.projectName.toLowerCase().includes(search))
            || (m.description && m.description.toLowerCase().includes(search));
    });

    if (filtered.length === 0) {
        tbody.innerHTML = "";
        if (empty) empty.style.display = "block";
        return;
    }

    if (empty) empty.style.display = "none";

    tbody.innerHTML = filtered.map((milestone, index) => {
        const completedBadge = milestone.completedDate
            ? `<span class="timeline-badge" style="color: #059669; font-weight: 600;">
                 <i class="bi bi-check-circle-fill" style="color: #10b981;"></i>
                 ${formatDate(milestone.completedDate)}
               </span>`
            : `<span style="color: #94a3b8; font-size: 12px; font-style: italic;">Pending</span>`;

        return `
            <tr>
                <td>
                    <span class="project-id-chip">#${index + 1}</span>
                </td>

                <td>
                    <a href="javascript:void(0)" onclick="viewMilestoneDetails(${milestone.id})" class="project-title-link" title="Click to view details">
                        ${escapeHtml(milestone.name)}
                    </a>
                    <div class="project-scope-desc" title="${escapeHtml(milestone.description || '')}">
                        ${escapeHtml(milestone.description || 'No additional scope provided.')}
                    </div>
                </td>

                <td>
                    <div class="manager-cell-pill">
                        <span class="manager-avatar-mini" title="Project">
                            <i class="bi bi-building"></i>
                        </span>
                        <span>${escapeHtml(milestone.projectName || 'Unassigned')}</span>
                    </div>
                </td>

                <td>
                    <span class="timeline-badge">
                        <i class="bi bi-calendar-event" style="color: #ea580c;"></i>
                        ${formatDate(milestone.targetDate)}
                    </span>
                </td>

                <td>
                    ${completedBadge}
                </td>

                <td>
                    <span class="status-badge ${getStatusClass(milestone.status)}">
                        ${formatStatusIcon(milestone.status)} ${formatStatus(milestone.status)}
                    </span>
                </td>

                <td>
                    <div style="display: flex; align-items: center; justify-content: flex-end; gap: 4px;">
                        <button class="btn-action-icon view" onclick="viewMilestoneDetails(${milestone.id})" title="View Milestone Details">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button class="btn-action-icon edit" onclick="editMilestone(${milestone.id})" title="Edit Milestone">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn-action-icon delete" onclick="deleteMilestone(${milestone.id})" title="Delete Milestone">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

// =========================================================
// STATISTICS
// =========================================================
function updateStatistics() {
    const totalElem = document.getElementById("totalMilestones");
    if (totalElem) totalElem.textContent = milestones.length;

    const inProgressElem = document.getElementById("inProgressMilestones");
    if (inProgressElem) {
        inProgressElem.textContent = milestones.filter(m => m.status === "IN_PROGRESS").length;
    }

    const completedElem = document.getElementById("completedMilestones");
    if (completedElem) {
        completedElem.textContent = milestones.filter(m => m.status === "COMPLETED").length;
    }

    const delayedElem = document.getElementById("delayedMilestones");
    if (delayedElem) {
        delayedElem.textContent = milestones.filter(m => m.status === "DELAYED").length;
    }
}

// =========================================================
// OPEN CREATE MODAL
// =========================================================
function openMilestoneModal() {
    const form = document.getElementById("milestoneForm");
    if (form) form.reset();

    const idInput = document.getElementById("milestoneId");
    if (idInput) idInput.value = "";

    const titleElem = document.getElementById("modalTitle");
    if (titleElem) titleElem.textContent = "Add New Milestone";

    const statusSelect = document.getElementById("milestoneStatus");
    if (statusSelect) statusSelect.value = "PENDING";

    const saveBtn = document.getElementById("saveMilestoneBtn");
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="bi bi-check-lg"></i> <span>Save Milestone</span>';
    }

    const modal = document.getElementById("milestoneModal");
    if (modal) {
        modal.classList.add("active", "show");
        modal.style.display = "flex";
    }
}

// =========================================================
// CLOSE CREATE / EDIT MODAL
// =========================================================
function closeMilestoneModal() {
    const modal = document.getElementById("milestoneModal");
    if (modal) {
        modal.classList.remove("active", "show");
        modal.style.display = "none";
    }
}

// =========================================================
// EDIT MILESTONE
// =========================================================
function editMilestone(id) {
    const milestone = milestones.find(m => m.id === id);
    if (!milestone) return;

    const idInput = document.getElementById("milestoneId");
    if (idInput) idInput.value = milestone.id;

    const nameInput = document.getElementById("milestoneName");
    if (nameInput) nameInput.value = milestone.name || "";

    const projectSelect = document.getElementById("milestoneProject");
    if (projectSelect) projectSelect.value = milestone.projectId || "";

    const targetDateInput = document.getElementById("targetDate");
    if (targetDateInput) targetDateInput.value = normalizeDate(milestone.targetDate);

    const completedDateInput = document.getElementById("completedDate");
    if (completedDateInput) completedDateInput.value = normalizeDate(milestone.completedDate);

    const statusSelect = document.getElementById("milestoneStatus");
    if (statusSelect) statusSelect.value = milestone.status || "PENDING";

    const descInput = document.getElementById("milestoneDescription");
    if (descInput) descInput.value = milestone.description || "";

    const titleElem = document.getElementById("modalTitle");
    if (titleElem) titleElem.textContent = `Edit Milestone: ${milestone.name}`;

    const saveBtn = document.getElementById("saveMilestoneBtn");
    if (saveBtn) {
        saveBtn.innerHTML = '<i class="bi bi-floppy-fill"></i> <span>Update Milestone</span>';
    }

    const modal = document.getElementById("milestoneModal");
    if (modal) {
        modal.classList.add("active", "show");
        modal.style.display = "flex";
    }
}

// =========================================================
// SAVE MILESTONE (CREATE & UPDATE)
// =========================================================
async function saveMilestone(event) {
    event.preventDefault();

    const id = document.getElementById("milestoneId").value;
    const nameVal = document.getElementById("milestoneName").value.trim();
    const projectVal = document.getElementById("milestoneProject").value;
    const targetDateVal = document.getElementById("targetDate").value;
    const completedDateVal = document.getElementById("completedDate").value;
    const statusVal = document.getElementById("milestoneStatus").value;
    const descVal = document.getElementById("milestoneDescription").value.trim();

    if (!projectVal) {
        showToast("Please select a valid project.", "error");
        return;
    }

    if (!targetDateVal) {
        showToast("Please enter a target date.", "error");
        return;
    }

    const payload = {
        name: nameVal,
        description: descVal || null,
        targetDate: targetDateVal,
        completedDate: completedDateVal || null,
        status: statusVal,
        projectId: Number(projectVal)
    };

    const saveBtn = document.getElementById("saveMilestoneBtn");
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> <span>Saving...</span>';
    }

    try {
        const url = id ? `/api/milestones/${id}` : "/api/milestones";
        const method = id ? "PUT" : "POST";

        const response = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            let message = "";
            try {
                message = await response.text();
            } catch (_) {}
            throw new Error(message || "Failed to save milestone.");
        }

        closeMilestoneModal();
        showToast(
            id ? "Successfully edited milestone!" : "Successfully created milestone!",
            "success"
        );
        await loadMilestones();

    } catch (error) {
        console.error("Save milestone error:", error);
        showToast(error.message || (id ? "Error editing milestone: Failed to update." : "Error creating milestone."), "error");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = id
                ? '<i class="bi bi-floppy-fill"></i> <span>Update Milestone</span>'
                : '<i class="bi bi-check-lg"></i> <span>Save Milestone</span>';
        }
    }
}

// =========================================================
// DELETE CONFIRMATION DIALOG (CENTERED OVERLAY)
// =========================================================
function deleteMilestone(id) {
    const milestone = milestones.find(m => m.id === id);
    if (!milestone) return;

    activeDeleteMilestoneId = id;
    const nameElem = document.getElementById("deleteMilestoneName");
    if (nameElem) {
        nameElem.textContent = `"${milestone.name}"`;
    }

    const modal = document.getElementById("deleteMilestoneModal");
    if (modal) {
        modal.classList.add("active", "show");
        modal.style.display = "flex";
    }
}

function closeDeleteModal() {
    activeDeleteMilestoneId = null;
    const modal = document.getElementById("deleteMilestoneModal");
    if (modal) {
        modal.classList.remove("active", "show");
        modal.style.display = "none";
    }
}

async function confirmDeleteMilestone() {
    if (!activeDeleteMilestoneId) return;

    const btn = document.getElementById("confirmDeleteBtn");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> <span>Deleting...</span>';
    }

    try {
        const response = await fetch(`/api/milestones/${activeDeleteMilestoneId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error("Failed to delete milestone from database.");
        }

        closeDeleteModal();
        showToast("Successfully deleted milestone!", "success");
        await loadMilestones();

    } catch (error) {
        console.error("Delete milestone error:", error);
        showToast(error.message || "Error deleting milestone.", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-trash-fill"></i> <span>Delete Milestone</span>';
        }
    }
}

// =========================================================
// VIEW MILESTONE DETAILS MODAL
// =========================================================
function viewMilestoneDetails(id) {
    const milestone = milestones.find(m => m.id === id);
    if (!milestone) return;

    activeViewMilestoneId = milestone.id;

    const titleElem = document.getElementById("viewMilestoneTitle");
    if (titleElem) titleElem.textContent = milestone.name || "Milestone Details";

    const idElem = document.getElementById("viewMilestoneId");
    if (idElem) idElem.textContent = `#MLS-${milestone.id}`;

    const statusElem = document.getElementById("viewMilestoneStatus");
    if (statusElem) {
        statusElem.innerHTML = `<span class="status-badge ${getStatusClass(milestone.status)}">${formatStatus(milestone.status)}</span>`;
    }

    const projectElem = document.getElementById("viewMilestoneProject");
    if (projectElem) projectElem.textContent = milestone.projectName || "General Unassigned";

    const targetElem = document.getElementById("viewMilestoneTargetDate");
    if (targetElem) targetElem.textContent = formatDate(milestone.targetDate);

    const completedElem = document.getElementById("viewMilestoneCompletedDate");
    if (completedElem) {
        completedElem.textContent = milestone.completedDate ? formatDate(milestone.completedDate) : "Pending Completion";
    }

    const timelineElem = document.getElementById("viewMilestoneTimeline");
    if (timelineElem) {
        if (milestone.status === "COMPLETED") {
            timelineElem.innerHTML = '<span style="color:#059669; font-weight:700;"><i class="bi bi-check-circle"></i> Phase Handed Over</span>';
        } else if (milestone.status === "DELAYED") {
            timelineElem.innerHTML = '<span style="color:#d97706; font-weight:700;"><i class="bi bi-exclamation-triangle"></i> Attention Required</span>';
        } else if (milestone.status === "IN_PROGRESS") {
            timelineElem.innerHTML = '<span style="color:#1a56db; font-weight:700;"><i class="bi bi-arrow-repeat"></i> Active Phase</span>';
        } else {
            timelineElem.innerHTML = '<span style="color:#64748b; font-weight:700;"><i class="bi bi-clock"></i> Scheduled</span>';
        }
    }

    const descElem = document.getElementById("viewMilestoneDescription");
    if (descElem) {
        descElem.textContent = milestone.description || "No specific technical requirements or scope notes logged.";
    }

    const modal = document.getElementById("viewMilestoneModal");
    if (modal) {
        modal.classList.add("active", "show");
        modal.style.display = "flex";
    }
}

function closeViewModal() {
    activeViewMilestoneId = null;
    const modal = document.getElementById("viewMilestoneModal");
    if (modal) {
        modal.classList.remove("active", "show");
        modal.style.display = "none";
    }
}

function editFromViewModal() {
    const idToEdit = activeViewMilestoneId;
    closeViewModal();
    if (idToEdit) {
        editMilestone(idToEdit);
    }
}

// =========================================================
// SEARCH / FILTER
// =========================================================
function setupSearch() {
    const searchInput = document.getElementById("milestoneSearch");
    if (searchInput) {
        searchInput.addEventListener("input", renderMilestones);
    }

    const projectFilter = document.getElementById("projectFilter");
    if (projectFilter) {
        projectFilter.addEventListener("change", loadMilestones);
    }

    const statusFilter = document.getElementById("statusFilter");
    if (statusFilter) {
        statusFilter.addEventListener("change", loadMilestones);
    }
}

function resetFilters() {
    const searchInput = document.getElementById("milestoneSearch");
    if (searchInput) searchInput.value = "";

    const projectFilter = document.getElementById("projectFilter");
    if (projectFilter) projectFilter.value = "";

    const statusFilter = document.getElementById("statusFilter");
    if (statusFilter) statusFilter.value = "";

    loadMilestones();
}

// =========================================================
// MODAL BACKDROP & ESCAPE DISMISSAL
// =========================================================
function setupModalBackdropDismissal() {
    const modalIds = ["milestoneModal", "deleteMilestoneModal", "viewMilestoneModal"];

    modalIds.forEach(id => {
        const modal = document.getElementById(id);
        if (modal) {
            modal.addEventListener("click", event => {
                if (event.target === modal) {
                    if (id === "milestoneModal") closeMilestoneModal();
                    else if (id === "deleteMilestoneModal") closeDeleteModal();
                    else if (id === "viewMilestoneModal") closeViewModal();
                }
            });
        }
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeMilestoneModal();
            closeDeleteModal();
            closeViewModal();
        }
    });
}

// =========================================================
// HELPERS
// =========================================================
function formatDate(date) {
    if (!date) return "-";
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);

    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
}

function normalizeDate(d) {
    if (!d) return "";
    if (typeof d === "string" && d.length >= 10) {
        return d.substring(0, 10);
    }
    return String(d);
}

function formatStatus(status) {
    if (!status) return "-";
    return status
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
}

function formatStatusIcon(status) {
    switch (status) {
        case "COMPLETED":
            return '<i class="bi bi-check2-circle"></i>';
        case "IN_PROGRESS":
            return '<i class="bi bi-arrow-repeat"></i>';
        case "DELAYED":
            return '<i class="bi bi-exclamation-triangle"></i>';
        case "CANCELLED":
            return '<i class="bi bi-x-circle"></i>';
        case "PENDING":
        default:
            return '<i class="bi bi-hourglass-split"></i>';
    }
}

function getStatusClass(status) {
    if (!status) return "pending";
    return status.toLowerCase().replace("_", "-");
}

function escapeHtml(value) {
    return String(value == null ? "" : value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// =========================================================
// TOAST
// =========================================================
function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const messageElement = document.getElementById("toastMessage");

    if (!toast || !messageElement) return;

    messageElement.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3200);
}

// =========================================================
// LOGOUT
// =========================================================
function logout() {
    localStorage.removeItem("wbcms_token");
    localStorage.removeItem("wbcms_user_id");
    localStorage.removeItem("wbcms_username");
    localStorage.removeItem("wbcms_role");
    localStorage.removeItem("wbcms_user_type");
    localStorage.removeItem("wbcms_user");

    window.location.replace("/staff-login.html");
}