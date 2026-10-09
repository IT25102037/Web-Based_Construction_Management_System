/* =========================================================
   WBCMS - PROJECT MANAGEMENT JAVASCRIPT
   Spring Boot + SQL Server Full Integration
   Complete Projects & Client Project Requests Management
========================================================= */

// =========================================================
// 1. AUTHENTICATION & SESSION
// =========================================================
let token = localStorage.getItem("wbcms_token");
let currentUserId = localStorage.getItem("wbcms_user_id");
let currentUsername = localStorage.getItem("wbcms_username");
let currentRole = localStorage.getItem("wbcms_role");
let currentFullName = localStorage.getItem("wbcms_full_name");

if (!token) {
    window.location.replace("/staff-login.html");
}

// Global state
let allProjects = [];
let allManagers = [];
let allClientRequests = [];
let currentTab = "all";
let currentScope = (currentRole === "PROJECT_MANAGER" || currentRole === "ROLE_PROJECT_MANAGER") ? "my" : "all";
let activeDeleteProjectId = null;
let activeViewProjectId = null;
let activeReviewRequestId = null;

// =========================================================
// 2. PAGE INITIALIZATION
// =========================================================
document.addEventListener("DOMContentLoaded", async () => {
    await verifyCurrentUser();
    loadUserInformation();
    setupEventListeners();
    updateScopeButtons();
    await loadManagers();
    await loadProjects();
    await loadClientRequests();
});

// =========================================================
// 3. USER PROFILE & CURRENT USER VERIFICATION
// =========================================================
async function verifyCurrentUser() {
    try {
        const resp = await fetch("/api/auth/me", {
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });
        if (resp.ok) {
            const data = await resp.json();
            if (data.id) {
                currentUserId = String(data.id);
                localStorage.setItem("wbcms_user_id", data.id);
            }
            if (data.role) {
                currentRole = data.role;
                localStorage.setItem("wbcms_role", data.role);
            }
            if (data.fullName) {
                currentFullName = data.fullName;
                localStorage.setItem("wbcms_full_name", data.fullName);
            }
            if (data.username) {
                currentUsername = data.username;
                localStorage.setItem("wbcms_username", data.username);
            }
            localStorage.setItem("wbcms_user", JSON.stringify({
                id: data.id,
                username: data.username,
                role: data.role,
                fullName: data.fullName
            }));

            // If Project Manager, default to "my" scope
            if (currentRole === "PROJECT_MANAGER" || currentRole === "ROLE_PROJECT_MANAGER") {
                if (currentScope !== "requests") {
                    currentScope = "my";
                }
            }
        }
    } catch (e) {
        console.warn("Could not verify /api/auth/me, relying on local session:", e);
    }
}

function loadUserInformation() {
    let user = {};
    try {
        user = JSON.parse(localStorage.getItem("wbcms_user") || "{}");
    } catch (_) {}

    const displayName = user.fullName || currentFullName || user.username || currentUsername || "Project Manager";
    const role = user.role || currentRole || "PROJECT_MANAGER";
    const initials = getInitials(displayName);

    const profileName = document.getElementById("profileName");
    const dropdownUserName = document.getElementById("dropdownUserName");
    const profileRole = document.getElementById("profileRole");
    const headerAvatar = document.getElementById("headerAvatar");

    if (profileName) profileName.textContent = displayName;
    if (dropdownUserName) dropdownUserName.textContent = displayName;
    if (profileRole) profileRole.textContent = formatRole(role);
    if (headerAvatar) headerAvatar.textContent = initials;
}

function getInitials(name) {
    if (!name) return "PM";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// =========================================================
// 4. EVENT LISTENERS
// =========================================================
function setupEventListeners() {
    const searchInput = document.getElementById("projectSearch");
    if (searchInput) {
        searchInput.addEventListener("input", () => renderCurrentView());
    }

    const statusFilter = document.getElementById("statusFilter");
    if (statusFilter) {
        statusFilter.addEventListener("change", () => renderCurrentView());
    }

    const managerFilter = document.getElementById("managerFilter");
    if (managerFilter) {
        managerFilter.addEventListener("change", () => renderCurrentView());
    }

    // Close modals on Escape key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            closeProjectModal();
            closeViewModal();
            closeDeleteModal();
            closeReviewRequestModal();
            const profileCard = document.getElementById("profileCard");
            if (profileCard) profileCard.classList.remove("open");
        }
    });

    // Close modals when clicking on background backdrop
    ["projectModal", "viewProjectModal", "deleteProjectModal", "reviewRequestModal"].forEach(modalId => {
        const modalEl = document.getElementById(modalId);
        if (modalEl) {
            modalEl.addEventListener("click", function(e) {
                if (e.target === this) {
                    if (modalId === "projectModal") closeProjectModal();
                    if (modalId === "viewProjectModal") closeViewModal();
                    if (modalId === "deleteProjectModal") closeDeleteModal();
                    if (modalId === "reviewRequestModal") closeReviewRequestModal();
                }
            });
        }
    });

    // Close profile dropdown when clicking outside
    document.addEventListener("click", (e) => {
        const profileCard = document.getElementById("profileCard");
        if (profileCard && !profileCard.contains(e.target)) {
            profileCard.classList.remove("open");
        }
    });
}

// =========================================================
// 5. PORTFOLIO SCOPE SWITCHER (My / All / Client Requests)
// =========================================================
function setScope(scope) {
    currentScope = scope;
    currentTab = "all";
    updateScopeButtons();
    updateTabsAndFiltersForScope();
    renderCurrentView();
    updateStatistics();
}

function updateScopeButtons() {
    const myBtn = document.getElementById("scopeMyBtn");
    const allBtn = document.getElementById("scopeAllBtn");
    const reqBtn = document.getElementById("scopeRequestsBtn");
    const activeText = document.getElementById("scopeActiveText");

    let user = {};
    try {
        user = JSON.parse(localStorage.getItem("wbcms_user") || "{}");
    } catch (_) {}
    const displayName = user.fullName || currentFullName || user.username || currentUsername || "You";

    [myBtn, allBtn, reqBtn].forEach(b => { if (b) b.classList.remove("active"); });

    if (currentScope === "my") {
        if (myBtn) myBtn.classList.add("active");
        if (activeText) activeText.textContent = `Displaying projects managed by ${displayName}`;
    } else if (currentScope === "all") {
        if (allBtn) allBtn.classList.add("active");
        if (activeText) activeText.textContent = "Displaying all company projects across all site managers";
    } else if (currentScope === "requests") {
        if (reqBtn) reqBtn.classList.add("active");
        if (activeText) activeText.textContent = "Displaying incoming project requests submitted by clients";
    }
}

function updateTabsAndFiltersForScope() {
    const tabsContainer = document.getElementById("inventoryTabsContainer");
    const mgrWrapper = document.getElementById("managerFilterWrapper");
    const statusSelect = document.getElementById("statusFilter");
    const searchInput = document.getElementById("projectSearch");
    const theadContainer = document.getElementById("tableHeadContainer");

    if (currentScope === "requests") {
        if (mgrWrapper) mgrWrapper.style.display = "none";
        if (searchInput) searchInput.placeholder = "Search client requests by project, client name, type, location...";

        if (statusSelect) {
            statusSelect.innerHTML = `
                <option value="">All Statuses</option>
                <option value="PENDING">Pending Review</option>
                <option value="APPROVED">Approved / Accepted</option>
                <option value="REJECTED">Rejected</option>
            `;
        }

        if (tabsContainer) {
            const total = allClientRequests.length;
            const pending = allClientRequests.filter(r => String(r.status).toUpperCase() === "PENDING").length;
            const approved = allClientRequests.filter(r => String(r.status).toUpperCase() === "APPROVED").length;
            const rejected = allClientRequests.filter(r => String(r.status).toUpperCase() === "REJECTED").length;

            tabsContainer.innerHTML = `
                <button class="tab-button ${currentTab === 'all' ? 'active' : ''}" onclick="changeTab('all', this)">
                    All Requests <span id="reqAllCount">${total}</span>
                </button>
                <button class="tab-button ${currentTab === 'PENDING' ? 'active' : ''}" onclick="changeTab('PENDING', this)">
                    Pending Review <span id="reqPendingCount" style="color:#fbbf24;">${pending}</span>
                </button>
                <button class="tab-button ${currentTab === 'APPROVED' ? 'active' : ''}" onclick="changeTab('APPROVED', this)">
                    Accepted / Approved <span id="reqApprovedCount" style="color:#34d399;">${approved}</span>
                </button>
                <button class="tab-button ${currentTab === 'REJECTED' ? 'active' : ''}" onclick="changeTab('REJECTED', this)">
                    Rejected <span id="reqRejectedCount" style="color:#f87171;">${rejected}</span>
                </button>
            `;
        }

        if (theadContainer) {
            theadContainer.innerHTML = `
                <tr>
                    <th style="width: 48px;">#</th>
                    <th>Project Request</th>
                    <th>Client Information</th>
                    <th>Location</th>
                    <th>Preferred Start</th>
                    <th>Est. Budget (LKR)</th>
                    <th>Status</th>
                    <th style="width: 170px; text-align: center;">Decision Actions</th>
                </tr>
            `;
        }
    } else {
        if (mgrWrapper) mgrWrapper.style.display = "block";
        if (searchInput) searchInput.placeholder = "Search project by name, location, manager...";

        if (statusSelect) {
            statusSelect.innerHTML = `
                <option value="">All Statuses</option>
                <option value="PLANNED">Planned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ON_HOLD">On Hold</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
            `;
        }

        if (tabsContainer) {
            tabsContainer.innerHTML = `
                <button class="tab-button ${currentTab === 'all' ? 'active' : ''}" onclick="changeTab('all', this)">
                    All Projects <span id="allCount">0</span>
                </button>
                <button class="tab-button ${currentTab === 'IN_PROGRESS' ? 'active' : ''}" onclick="changeTab('IN_PROGRESS', this)">
                    In Progress <span id="inProgressCount">0</span>
                </button>
                <button class="tab-button ${currentTab === 'PLANNED' ? 'active' : ''}" onclick="changeTab('PLANNED', this)">
                    Planned <span id="plannedCount">0</span>
                </button>
                <button class="tab-button ${currentTab === 'ON_HOLD' ? 'active' : ''}" onclick="changeTab('ON_HOLD', this)">
                    On Hold <span id="onHoldCount">0</span>
                </button>
                <button class="tab-button ${currentTab === 'COMPLETED' ? 'active' : ''}" onclick="changeTab('COMPLETED', this)">
                    Completed <span id="completedCount">0</span>
                </button>
            `;
        }

        if (theadContainer) {
            theadContainer.innerHTML = `
                <tr id="projectTableHeaders">
                    <th style="width: 48px;">#</th>
                    <th>Project Details</th>
                    <th>Location</th>
                    <th>Timeline</th>
                    <th>Budget (LKR)</th>
                    <th>Project Manager</th>
                    <th>Status</th>
                    <th style="width: 120px; text-align: center;">Actions</th>
                </tr>
            `;
        }
    }
}

function renderCurrentView() {
    if (currentScope === "requests") {
        renderClientRequests();
    } else {
        renderProjects();
    }
}

// =========================================================
// 6. LOAD PROJECT MANAGERS
// =========================================================
async function loadManagers(selectedManagerId = null) {
    const select = document.getElementById("projectManager");
    const filterSelect = document.getElementById("managerFilter");

    try {
        let response = await fetch("/api/users/project-managers?page=0&size=100", {
            method: "GET",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (!response.ok) {
            response = await fetch("/api/users?page=0&size=100", {
                method: "GET",
                headers: { "Authorization": `Bearer ${token}` }
            });
        }

        if (response.ok) {
            const data = await response.json();
            allManagers = Array.isArray(data) ? data : (data.content || []);
        }
    } catch (err) {
        console.warn("Could not load managers from API, using logged in user fallback:", err);
    }

    if (currentUserId && !allManagers.some(m => String(m.id) === String(currentUserId))) {
        allManagers.unshift({
            id: Number(currentUserId),
            fullName: currentFullName || currentUsername || "My Account (PM)",
            username: currentUsername
        });
    }

    if (select) {
        select.innerHTML = '<option value="">Select Project Manager</option>';
        allManagers.forEach(m => {
            const opt = document.createElement("option");
            opt.value = m.id;
            opt.textContent = m.fullName || m.username || `Manager #${m.id}`;
            select.appendChild(opt);
        });

        if (selectedManagerId) {
            select.value = String(selectedManagerId);
        } else if (currentUserId && (currentRole === "PROJECT_MANAGER" || currentRole === "ROLE_PROJECT_MANAGER")) {
            select.value = String(currentUserId);
        }
    }

    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">All Managers</option>';
        allManagers.forEach(m => {
            const opt = document.createElement("option");
            opt.value = m.id;
            opt.textContent = m.fullName || m.username || `Manager #${m.id}`;
            filterSelect.appendChild(opt);
        });
    }
}

// =========================================================
// 7. LOAD PROJECTS FROM DATABASE
// =========================================================
async function loadProjects() {
    try {
        const response = await fetch("/api/projects?page=0&size=200", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.status === 401 || response.status === 403) {
            logout();
            return;
        }

        if (response.ok) {
            const data = await response.json();
            allProjects = Array.isArray(data) ? data : (data.content || []);
            updateStatistics();
            if (currentScope !== "requests") {
                renderProjects();
            }
        }
    } catch (err) {
        console.error("Error loading projects:", err);
    }
}

// =========================================================
// 8. LOAD CLIENT PROJECT REQUESTS
// =========================================================
async function loadClientRequests() {
    try {
        const response = await fetch("/api/client-project-requests", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            allClientRequests = Array.isArray(data) ? data : [];
            updateClientRequestsCount();
            if (currentScope === "requests") {
                updateTabsAndFiltersForScope();
                renderClientRequests();
            }
        }
    } catch (err) {
        console.warn("Could not load client project requests:", err);
    }
}

function updateClientRequestsCount() {
    const pendingRequests = allClientRequests.filter(r => String(r.status).toUpperCase() === "PENDING");
    const badge = document.getElementById("clientRequestsCount");
    if (badge) {
        badge.textContent = pendingRequests.length;
        badge.style.background = pendingRequests.length > 0 ? "#ef4444" : "#64748b";
    }
}

// =========================================================
// 9. RENDER PROJECTS TABLE
// =========================================================
function renderProjects() {
    const tableBody = document.getElementById("projectTableBody");
    const emptyTable = document.getElementById("emptyTable");
    const tableResult = document.getElementById("tableResult");

    if (!tableBody) return;

    const search = (document.getElementById("projectSearch")?.value || "").toLowerCase().trim();
    const statusVal = document.getElementById("statusFilter")?.value || "";
    const managerVal = document.getElementById("managerFilter")?.value || "";

    const filtered = allProjects.filter(p => {
        if (currentScope === "my" && currentUserId) {
            const isMyProject = String(p.managerId) === String(currentUserId) ||
                (p.managerName && currentUsername && p.managerName.toLowerCase().includes(currentUsername.toLowerCase()));
            if (!isMyProject) return false;
        }

        const pStatus = String(p.status || "").toUpperCase();
        if (currentTab !== "all" && pStatus !== currentTab) return false;
        if (statusVal && pStatus !== statusVal) return false;
        if (managerVal && String(p.managerId) !== String(managerVal)) return false;

        if (search) {
            const name = (p.name || "").toLowerCase();
            const location = (p.location || "").toLowerCase();
            const manager = (p.managerName || "").toLowerCase();
            const desc = (p.description || "").toLowerCase();
            if (!name.includes(search) && !location.includes(search) && !manager.includes(search) && !desc.includes(search)) {
                return false;
            }
        }
        return true;
    });

    if (tableResult) {
        const scopeText = currentScope === "my" ? "in your managed portfolio" : "total";
        tableResult.textContent = `Showing ${filtered.length} of ${allProjects.length} projects (${scopeText})`;
    }

    if (!filtered.length) {
        tableBody.innerHTML = "";
        if (emptyTable) {
            emptyTable.style.display = "block";
            const emptyTitle = emptyTable.querySelector("h3");
            const emptyDesc = emptyTable.querySelector("p");
            if (currentScope === "my") {
                if (emptyTitle) emptyTitle.textContent = "No projects in your managed portfolio";
                if (emptyDesc) emptyDesc.innerHTML = 'You do not have any projects assigned yet. Click <a href="javascript:void(0)" onclick="openProjectModal()" style="color:var(--orange); font-weight:700; text-decoration:underline;">Add Project</a> to create one now.';
            } else {
                if (emptyTitle) emptyTitle.textContent = "No projects found";
                if (emptyDesc) emptyDesc.textContent = "Try changing your search keywords or filter criteria, or add a new project.";
            }
        }
        return;
    }

    if (emptyTable) emptyTable.style.display = "none";

    tableBody.innerHTML = filtered.map((project, idx) => {
        const status = String(project.status || "PLANNED").toUpperCase();
        const statusClass = getStatusClass(status);
        const statusLabel = formatStatus(status);
        const managerName = project.managerName || "Not Assigned";
        const managerInitial = getInitials(managerName);
        const budgetFormatted = project.budget != null ? Number(project.budget).toLocaleString() : "0";
        const startStr = formatDate(project.startDate);
        const endStr = formatDate(project.endDate);

        const isSelfManaged = currentUserId && String(project.managerId) === String(currentUserId);
        const selfBadge = isSelfManaged ? '<span style="font-size:10px; background:rgba(52,211,153,0.15); color:#34d399; border:1px solid rgba(52,211,153,0.3); padding:1px 6px; border-radius:4px; margin-left:4px;">You</span>' : '';

        return `
            <tr>
                <td style="color:#64748b; font-weight:700;">${idx + 1}</td>
                <td>
                    <a href="javascript:void(0)" class="project-title-link" onclick="viewProjectDetails(${project.id})">
                        ${escapeHtml(project.name || "Untitled Project")}
                    </a>
                    <div class="project-scope-desc" title="${escapeHtml(project.description || '')}">
                        ${escapeHtml(project.description || "Civil construction project")}
                    </div>
                    <span class="project-id-chip">#PRJ-${project.id}</span>
                </td>
                <td>
                    <span style="font-size:12.5px; color:#334155; display:inline-flex; align-items:center; gap:5px;">
                        <i class="bi bi-geo-alt-fill" style="color:var(--orange-primary); font-size:12px;"></i>
                        ${escapeHtml(project.location || "Not specified")}
                    </span>
                </td>
                <td>
                    <div style="font-size:12.5px; color:#0f172a; font-weight:600;">${startStr}</div>
                    <small class="timeline-badge">
                        <i class="bi bi-arrow-right-short"></i> ${endStr}
                    </small>
                </td>
                <td>
                    <span class="currency-badge">LKR ${budgetFormatted}</span>
                </td>
                <td>
                    <div class="manager-cell-pill">
                        <div class="manager-avatar-mini">${managerInitial}</div>
                        <span>${escapeHtml(managerName)}</span>
                        ${selfBadge}
                    </div>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">
                        <i class="bi ${getStatusIcon(status)}"></i>
                        ${escapeHtml(statusLabel)}
                    </span>
                </td>
                <td style="text-align: center;">
                    <div style="display:inline-flex; gap:6px;">
                        <button type="button" class="btn-action-icon view" title="View Project Details" onclick="viewProjectDetails(${project.id})">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button type="button" class="btn-action-icon edit" title="Edit Project" onclick="openEditModal(${project.id})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button type="button" class="btn-action-icon delete" title="Delete Project" onclick="openDeleteModal(${project.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

// =========================================================
// 10. RENDER CLIENT PROJECT REQUESTS TABLE
// =========================================================
function renderClientRequests() {
    const tableBody = document.getElementById("projectTableBody");
    const emptyTable = document.getElementById("emptyTable");
    const tableResult = document.getElementById("tableResult");

    if (!tableBody) return;

    const search = (document.getElementById("projectSearch")?.value || "").toLowerCase().trim();
    const statusVal = document.getElementById("statusFilter")?.value || "";

    const filtered = allClientRequests.filter(req => {
        const reqStatus = String(req.status || "PENDING").toUpperCase();
        if (currentTab !== "all" && reqStatus !== currentTab) return false;
        if (statusVal && reqStatus !== statusVal) return false;

        if (search) {
            const name = (req.projectName || "").toLowerCase();
            const client = (req.clientName || "").toLowerCase();
            const location = (req.location || "").toLowerCase();
            const type = (req.projectType || "").toLowerCase();
            const desc = (req.description || "").toLowerCase();
            if (!name.includes(search) && !client.includes(search) && !location.includes(search) && !type.includes(search) && !desc.includes(search)) {
                return false;
            }
        }
        return true;
    });

    if (tableResult) {
        tableResult.textContent = `Showing ${filtered.length} of ${allClientRequests.length} client requests`;
    }

    if (!filtered.length) {
        tableBody.innerHTML = "";
        if (emptyTable) {
            emptyTable.style.display = "block";
            const emptyTitle = emptyTable.querySelector("h3");
            const emptyDesc = emptyTable.querySelector("p");
            if (emptyTitle) emptyTitle.textContent = "No client project requests found";
            if (emptyDesc) emptyDesc.textContent = "There are no client project requests matching your current filter criteria.";
        }
        return;
    }

    if (emptyTable) emptyTable.style.display = "none";

    tableBody.innerHTML = filtered.map((req, idx) => {
        const status = String(req.status || "PENDING").toUpperCase();
        let statusBadgeClass = "pending";
        let statusIcon = "bi-hourglass-split";
        let statusText = "Pending Review";

        if (status === "APPROVED") {
            statusBadgeClass = "approved";
            statusIcon = "bi-check-circle-fill";
            statusText = "Accepted / Approved";
        } else if (status === "REJECTED") {
            statusBadgeClass = "rejected";
            statusIcon = "bi-x-circle-fill";
            statusText = "Rejected";
        } else if (status === "COMPLETED") {
            statusBadgeClass = "completed";
            statusIcon = "bi-check-all";
            statusText = "Completed / Handed Over";
        }

        const clientName = req.clientName || "Client";
        const clientEmail = req.clientEmail || "";
        const clientPhone = req.clientPhone || "";
        const budgetFormatted = req.estimatedBudget != null ? Number(req.estimatedBudget).toLocaleString() : "0";
        const startStr = formatDate(req.preferredStartDate);

        return `
            <tr>
                <td style="color:#64748b; font-weight:700;">${idx + 1}</td>
                <td>
                    <a href="javascript:void(0)" class="project-title-link" onclick="openReviewModal(${req.id})">
                        ${escapeHtml(req.projectName || "Client Request")}
                    </a>
                    <div style="display:flex; align-items:center; gap:6px; margin-top:2px;">
                        <span style="font-size:10.5px; background:rgba(26,86,219,0.08); color:#1a56db; border:1px solid rgba(26,86,219,0.2); padding:1px 6px; border-radius:4px; font-weight:600;">
                            ${escapeHtml(req.projectType || "General")}
                        </span>
                        <span class="project-id-chip">#REQ-${req.id}</span>
                    </div>
                </td>
                <td>
                    <div style="font-size:13px; font-weight:600; color:#0f172a; display:flex; align-items:center; gap:6px;">
                        <i class="bi bi-person-circle" style="color:var(--orange-primary);"></i>
                        ${escapeHtml(clientName)}
                    </div>
                    ${clientEmail ? `<small style="font-size:11px; color:#64748b; display:block;">${escapeHtml(clientEmail)}</small>` : ''}
                </td>
                <td>
                    <span style="font-size:12.5px; color:#334155; display:inline-flex; align-items:center; gap:5px;">
                        <i class="bi bi-geo-alt-fill" style="color:var(--orange-primary); font-size:12px;"></i>
                        ${escapeHtml(req.location || "Not specified")}
                    </span>
                </td>
                <td>
                    <div style="font-size:12.5px; color:#0f172a; font-weight:600;">${startStr}</div>
                    <small style="font-size:10.5px; color:#64748b;">Preferred Start</small>
                </td>
                <td>
                    <span class="currency-badge">LKR ${budgetFormatted}</span>
                </td>
                <td>
                    <span class="status-badge ${statusBadgeClass}">
                        <i class="bi ${statusIcon}"></i>
                        ${escapeHtml(statusText)}
                    </span>
                </td>
                <td style="text-align: center;">
                    <div style="display:inline-flex; gap:5px; flex-wrap:nowrap;">
                        <button type="button" class="btn-action-icon view" title="Review Full Request" onclick="openReviewModal(${req.id})">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button type="button" class="btn-action-icon accept" title="Accept / Approve Request" onclick="quickUpdateStatus(${req.id}, 'APPROVED')">
                            <i class="bi bi-check-lg"></i>
                        </button>
                        <button type="button" class="btn-action-icon reject" title="Reject Request" onclick="quickUpdateStatus(${req.id}, 'REJECTED')">
                            <i class="bi bi-x-lg"></i>
                        </button>
                        <button type="button" class="btn-action-icon pending-btn" title="Mark as Pending" onclick="quickUpdateStatus(${req.id}, 'PENDING')">
                            <i class="bi bi-clock"></i>
                        </button>
                        <button type="button" class="btn-action-icon convert" title="Convert to Active Project" onclick="convertRequestToProject(${req.id})">
                            <i class="bi bi-building-fill-add"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

// =========================================================
// 11. TAB FILTERING & RESET
// =========================================================
function changeTab(tabName, btnElem) {
    currentTab = tabName;
    document.querySelectorAll(".inventory-tabs .tab-button").forEach(btn => {
        btn.classList.remove("active");
    });
    if (btnElem) {
        btnElem.classList.add("active");
    }
    renderCurrentView();
}

function resetFilters() {
    currentTab = "all";
    document.querySelectorAll(".inventory-tabs .tab-button").forEach((btn, idx) => {
        btn.classList.toggle("active", idx === 0);
    });
    const searchInput = document.getElementById("projectSearch");
    const statusFilter = document.getElementById("statusFilter");
    const managerFilter = document.getElementById("managerFilter");

    if (searchInput) searchInput.value = "";
    if (statusFilter) statusFilter.value = "";
    if (managerFilter) managerFilter.value = "";

    renderCurrentView();
}

// =========================================================
// 12. UPDATE STATISTICS
// =========================================================
function updateStatistics() {
    const scopeProjects = currentScope === "my" && currentUserId
        ? allProjects.filter(p => String(p.managerId) === String(currentUserId) || (p.managerName && currentUsername && p.managerName.toLowerCase().includes(currentUsername.toLowerCase())))
        : allProjects;

    const total = scopeProjects.length;
    const active = scopeProjects.filter(p => String(p.status).toUpperCase() === "IN_PROGRESS").length;
    const planned = scopeProjects.filter(p => String(p.status).toUpperCase() === "PLANNED").length;
    const onHold = scopeProjects.filter(p => String(p.status).toUpperCase() === "ON_HOLD").length;
    const completed = scopeProjects.filter(p => String(p.status).toUpperCase() === "COMPLETED").length;

    const myCount = allProjects.filter(p => currentUserId && (String(p.managerId) === String(currentUserId) || (p.managerName && currentUsername && p.managerName.toLowerCase().includes(currentUsername.toLowerCase())))).length;
    setText("myProjectsCount", myCount);
    setText("allProjectsCount", allProjects.length);

    setText("totalProjects", total);
    setText("activeProjects", active);
    setText("plannedProjects", planned);
    setText("completedProjects", completed);

    if (currentScope !== "requests") {
        setText("allCount", total);
        setText("inProgressCount", active);
        setText("plannedCount", planned);
        setText("onHoldCount", onHold);
        setText("completedCount", completed);
    }

    const totalBudget = scopeProjects.reduce((sum, p) => sum + (Number(p.budget) || 0), 0);
    const sideBudget = document.getElementById("sideTotalBudgetBadge");
    if (sideBudget) {
        sideBudget.textContent = "LKR " + totalBudget.toLocaleString();
    }
}

// =========================================================
// 13. REVIEW CLIENT PROJECT REQUEST MODAL & ACTIONS
// =========================================================
function openReviewModal(id) {
    const req = allClientRequests.find(r => Number(r.id) === Number(id));
    if (!req) {
        showToast("Client project request not found.", true);
        return;
    }

    activeReviewRequestId = req.id;
    document.getElementById("activeReviewRequestId").value = req.id;
    document.getElementById("reviewRequestModalTitle").textContent = `Review: ${req.projectName || 'Project Request'}`;
    document.getElementById("reviewReqId").textContent = `#REQ-${req.id}`;
    document.getElementById("reviewReqStatus").textContent = formatStatus(req.status || "PENDING");
    document.getElementById("reviewReqClientName").textContent = req.clientName || "Client";
    document.getElementById("reviewReqClientEmail").textContent = req.clientEmail || "Not provided";
    document.getElementById("reviewReqClientPhone").textContent = req.clientPhone || "Not provided";
    document.getElementById("reviewReqType").textContent = req.projectType || "General";
    document.getElementById("reviewReqBudget").textContent = "LKR " + (req.estimatedBudget != null ? Number(req.estimatedBudget).toLocaleString() : "0");
    document.getElementById("reviewReqStartDate").textContent = formatDate(req.preferredStartDate);
    document.getElementById("reviewReqLocation").textContent = req.location || "Not specified";
    document.getElementById("reviewReqDescription").textContent = req.description || "No description provided.";
    document.getElementById("reviewRequestRemarks").value = "";

    const modal = document.getElementById("reviewRequestModal");
    if (modal) {
        modal.classList.add("active", "show");
        modal.style.display = "flex";
    }
}

function closeReviewRequestModal() {
    activeReviewRequestId = null;
    const modal = document.getElementById("reviewRequestModal");
    if (modal) {
        modal.classList.remove("active", "show");
        modal.style.display = "none";
    }
}

async function submitRequestDecision(newStatus) {
    const reqId = activeReviewRequestId || document.getElementById("activeReviewRequestId")?.value;
    if (!reqId) return;

    const remarks = document.getElementById("reviewRequestRemarks")?.value || "";

    try {
        const response = await fetch(`/api/client-project-requests/${reqId}/status`, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                status: newStatus,
                remarks: remarks
            })
        });

        if (!response.ok) {
            const errData = await response.text();
            throw new Error(`Failed to update status: ${errData}`);
        }

        closeReviewRequestModal();
        showToast(`Request #${reqId} marked as ${formatStatus(newStatus)}. Notification sent to client.`, false);
        await loadClientRequests();

    } catch (err) {
        console.error("Submit request decision error:", err);
        showToast(err.message || "Failed to update request status.", true);
    }
}

async function quickUpdateStatus(id, newStatus) {
    try {
        const response = await fetch(`/api/client-project-requests/${id}/status`, {
            method: "PATCH",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                status: newStatus,
                remarks: `Status updated to ${newStatus} from Project Management Console.`
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to update status (HTTP ${response.status})`);
        }

        showToast(`Request #${id} marked as ${formatStatus(newStatus)}. Client notified.`, false);
        await loadClientRequests();

    } catch (err) {
        console.error("Quick update status error:", err);
        showToast(err.message || "Failed to update request status.", true);
    }
}

async function submitRequestConvert() {
    const reqId = activeReviewRequestId || document.getElementById("activeReviewRequestId")?.value;
    if (!reqId) return;
    await convertRequestToProject(reqId);
    closeReviewRequestModal();
}

async function convertRequestToProject(id) {
    if (!confirm(`Are you sure you want to convert Client Request #${id} into an active Construction Project?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/client-project-requests/${id}/convert`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const err = await response.text();
            throw new Error(`Failed to convert request: ${err}`);
        }

        const projectData = await response.json();
        showToast(`Project #${projectData.id} (${projectData.name}) initialized successfully! Client notified.`, false);

        await loadProjects();
        await loadClientRequests();

        // Switch scope to My Managed Projects to see the new project
        setScope("my");

    } catch (err) {
        console.error("Convert request error:", err);
        showToast(err.message || "Failed to convert request to project.", true);
    }
}

// =========================================================
// 14. CREATE / EDIT PROJECT MODAL & CRUD SAVE
// =========================================================
async function openProjectModal(project = null) {
    const modal = document.getElementById("projectModal");
    const form = document.getElementById("projectForm");
    const title = document.getElementById("modalTitle");
    const btn = document.getElementById("saveProjectBtn");
    const managerNote = document.getElementById("managerAssignedNote");

    if (!modal || !form) return;

    form.reset();
    clearErrors();

    let user = {};
    try {
        user = JSON.parse(localStorage.getItem("wbcms_user") || "{}");
    } catch (_) {}
    const displayName = user.fullName || currentFullName || currentUsername || "You";

    if (!project) {
        title.textContent = "Add New Project";
        document.getElementById("projectId").value = "";
        document.getElementById("projectBudget").value = "0";
        document.getElementById("projectStatus").value = "PLANNED";
        if (btn) btn.innerHTML = '<i class="bi bi-check-lg"></i> <span>Save Project</span>';

        await loadManagers();

        if (currentUserId) {
            const mgrSelect = document.getElementById("projectManager");
            if (mgrSelect) mgrSelect.value = String(currentUserId);
        }

        if (managerNote) {
            managerNote.innerHTML = `<i class="bi bi-shield-check"></i> Defaults to your Project Manager account (${escapeHtml(displayName)})`;
            managerNote.style.display = "inline-flex";
        }
    } else {
        title.textContent = `Edit Project: ${project.name || ''}`;
        document.getElementById("projectId").value = project.id || "";
        document.getElementById("projectName").value = project.name || "";
        document.getElementById("projectLocation").value = project.location || "";
        document.getElementById("projectBudget").value = project.budget || "0";
        document.getElementById("startDate").value = normalizeDate(project.startDate);
        document.getElementById("endDate").value = normalizeDate(project.endDate);
        document.getElementById("actualEndDate").value = normalizeDate(project.actualEndDate);
        document.getElementById("projectStatus").value = project.status || "PLANNED";
        document.getElementById("resourceAllocation").value = project.resourceAllocation || "";
        document.getElementById("projectDescription").value = project.description || "";
        if (btn) btn.innerHTML = '<i class="bi bi-floppy-fill"></i> <span>Update Project</span>';

        await loadManagers(project.managerId);

        if (managerNote) {
            managerNote.style.display = "none";
        }
    }

    modal.classList.add("active", "show");
    modal.style.display = "flex";
}

function openEditModal(id) {
    const project = allProjects.find(p => Number(p.id) === Number(id));
    if (!project) {
        showToast("Project not found in cache.", true);
        return;
    }
    openProjectModal(project);
}

function closeProjectModal() {
    const modal = document.getElementById("projectModal");
    if (modal) {
        modal.classList.remove("active", "show");
        modal.style.display = "none";
    }
}

async function saveProject(event) {
    event.preventDefault();
    clearErrors();

    const id = document.getElementById("projectId").value;
    const name = document.getElementById("projectName").value.trim();
    const location = document.getElementById("projectLocation").value.trim();
    const startDate = document.getElementById("startDate").value;
    const endDate = document.getElementById("endDate").value || null;
    const actualEndDate = document.getElementById("actualEndDate").value || null;
    const budgetVal = parseFloat(document.getElementById("projectBudget").value) || 0;
    const status = document.getElementById("projectStatus").value;
    let managerId = document.getElementById("projectManager").value;
    const resourceAllocation = document.getElementById("resourceAllocation").value.trim();
    const description = document.getElementById("projectDescription").value.trim();

    if (!managerId && currentUserId) {
        managerId = currentUserId;
    }

    let hasError = false;
    if (!name) {
        showError("nameError", "Project name is required.");
        hasError = true;
    }
    if (!location) {
        showError("locationError", "Project site location is required.");
        hasError = true;
    }
    if (!startDate) {
        showError("startDateError", "Start date is required.");
        hasError = true;
    }
    if (startDate && endDate && new Date(endDate) < new Date(startDate)) {
        showError("endDateError", "Target end date cannot be earlier than start date.");
        hasError = true;
    }
    if (!managerId) {
        showError("managerError", "Please select an assigned Project Manager.");
        hasError = true;
    }
    if (hasError) return;

    const payload = {
        name,
        location,
        startDate,
        endDate,
        actualEndDate,
        budget: budgetVal,
        status,
        managerId: Number(managerId),
        resourceAllocation,
        description
    };

    const isEdit = Boolean(id);
    const url = isEdit ? `/api/projects/${id}` : "/api/projects";
    const method = isEdit ? "PUT" : "POST";
    const btn = document.getElementById("saveProjectBtn");

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> <span>Saving to Database...</span>';
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errBody = await response.text();
            let errMsg = `Failed to save project (HTTP ${response.status}).`;
            try {
                const parsed = JSON.parse(errBody);
                errMsg = parsed.message || parsed.error || errMsg;
            } catch (_) {}
            throw new Error(errMsg);
        }

        closeProjectModal();
        showToast(isEdit ? "Project updated successfully in database." : "Project created successfully in database.", false);
        await loadProjects();

    } catch (err) {
        console.error("Save project error:", err);
        showToast(err.message || "Failed to save project.", true);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = isEdit ? '<i class="bi bi-floppy-fill"></i> <span>Update Project</span>' : '<i class="bi bi-check-lg"></i> <span>Save Project</span>';
        }
    }
}

// =========================================================
// 15. VIEW PROJECT DETAILS MODAL
// =========================================================
function viewProjectDetails(id) {
    const project = allProjects.find(p => Number(p.id) === Number(id));
    if (!project) return;

    activeViewProjectId = project.id;
    document.getElementById("viewProjectTitle").textContent = project.name || "Project Details";
    document.getElementById("viewProjectId").textContent = `#PRJ-${project.id}`;
    document.getElementById("viewProjectStatus").textContent = formatStatus(project.status);
    document.getElementById("viewProjectManager").textContent = project.managerName || "Not Assigned";
    document.getElementById("viewProjectBudget").textContent = "LKR " + (project.budget != null ? Number(project.budget).toLocaleString() : "0");
    document.getElementById("viewProjectLocation").textContent = project.location || "Not specified";
    document.getElementById("viewProjectTimeline").textContent = `${formatDate(project.startDate)} → ${formatDate(project.endDate)}`;
    document.getElementById("viewProjectDescription").textContent = project.description || "No description provided.";
    document.getElementById("viewProjectResources").textContent = project.resourceAllocation || "No resource allocation specified.";

    const modal = document.getElementById("viewProjectModal");
    if (modal) {
        modal.classList.add("active", "show");
        modal.style.display = "flex";
    }
}

function closeViewModal() {
    const modal = document.getElementById("viewProjectModal");
    if (modal) {
        modal.classList.remove("active", "show");
        modal.style.display = "none";
    }
}

function editFromViewModal() {
    closeViewModal();
    if (activeViewProjectId) {
        openEditModal(activeViewProjectId);
    }
}

// =========================================================
// 16. DELETE PROJECT WITH CONFIRMATION MODAL
// =========================================================
function openDeleteModal(id) {
    const project = allProjects.find(p => Number(p.id) === Number(id));
    if (!project) return;

    activeDeleteProjectId = id;
    const nameElem = document.getElementById("deleteProjectName");
    if (nameElem) nameElem.textContent = `"${project.name}" (#PRJ-${project.id})`;

    const modal = document.getElementById("deleteProjectModal");
    if (modal) {
        modal.classList.add("active", "show");
        modal.style.display = "flex";
    }
}

function closeDeleteModal() {
    activeDeleteProjectId = null;
    const modal = document.getElementById("deleteProjectModal");
    if (modal) {
        modal.classList.remove("active", "show");
        modal.style.display = "none";
    }
}

async function confirmDeleteProject() {
    if (!activeDeleteProjectId) return;

    const btn = document.getElementById("confirmDeleteBtn");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> <span>Deleting...</span>';
    }

    try {
        const response = await fetch(`/api/projects/${activeDeleteProjectId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (!response.ok) {
            const errText = await response.text();
            let errMsg = `Failed to delete project (${response.status}).`;
            try {
                const parsed = JSON.parse(errText);
                errMsg = parsed.message || parsed.error || errMsg;
            } catch (_) {}
            throw new Error(errMsg);
        }

        closeDeleteModal();
        showToast("Project deleted successfully from database.", false);
        await loadProjects();

    } catch (err) {
        console.error("Delete project error:", err);
        showToast(err.message || "Failed to delete project.", true);
        closeDeleteModal();
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-trash-fill"></i> <span>Yes, Delete Project</span>';
        }
    }
}

// =========================================================
// 17. EXPORT PROJECTS REPORT (CSV)
// =========================================================
function exportProjectsReport() {
    const exportList = currentScope === "my" && currentUserId
        ? allProjects.filter(p => String(p.managerId) === String(currentUserId))
        : allProjects;

    if (!exportList.length) {
        showToast("No projects available to export.", true);
        return;
    }

    const headers = ["ID", "Project Name", "Location", "Status", "Start Date", "Target End Date", "Budget (LKR)", "Project Manager", "Description"];
    const rows = exportList.map(p => [
        p.id,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${(p.location || '').replace(/"/g, '""')}"`,
        p.status || '',
        p.startDate || '',
        p.endDate || '',
        p.budget || '0',
        `"${(p.managerName || '').replace(/"/g, '""')}"`,
        `"${(p.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `WBCMS_Projects_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Projects portfolio report exported successfully.", false);
}

// =========================================================
// 18. HELPER UTILITIES
// =========================================================
function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function showError(id, msg) {
    const el = document.getElementById(id);
    if (el) el.textContent = msg;
}

function clearErrors() {
    document.querySelectorAll(".validation-message").forEach(el => el.textContent = "");
}

function formatRole(role) {
    return String(role || "Staff")
        .replace(/^ROLE_/, "")
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
}

function formatStatus(status) {
    return String(status || "")
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
}

function getStatusClass(status) {
    switch (status) {
        case "IN_PROGRESS": return "active";
        case "COMPLETED": return "completed";
        case "ON_HOLD": return "on-hold";
        case "CANCELLED": return "cancelled";
        case "PLANNED":
        default:
            return "planning";
    }
}

function getStatusIcon(status) {
    switch (status) {
        case "IN_PROGRESS": return "bi-play-circle-fill";
        case "COMPLETED": return "bi-check2-circle";
        case "ON_HOLD": return "bi-pause-circle-fill";
        case "CANCELLED": return "bi-x-circle-fill";
        case "PLANNED":
        default:
            return "bi-calendar2-check";
    }
}

function formatDate(isoStr) {
    if (!isoStr) return "--";
    try {
        const d = new Date(isoStr);
        if (isNaN(d.getTime())) return isoStr;
        return d.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" });
    } catch (_) {
        return isoStr;
    }
}

function normalizeDate(val) {
    if (!val) return "";
    return String(val).substring(0, 10);
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function showToast(message, isError = false) {
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toastMessage");
    if (!toast || !toastMsg) return;

    toastMsg.textContent = message;
    toast.className = "toast show " + (isError ? "error" : "");

    setTimeout(() => {
        toast.className = "toast";
    }, 4000);
}

// =========================================================
// 19. LOGOUT
// =========================================================
function logout() {
    localStorage.removeItem("wbcms_token");
    localStorage.removeItem("wbcms_user");
    localStorage.removeItem("wbcms_username");
    localStorage.removeItem("wbcms_role");
    localStorage.removeItem("wbcms_staff_role");
    localStorage.removeItem("wbcms_full_name");
    localStorage.removeItem("wbcms_user_id");

    window.location.replace("/staff-login.html");
}