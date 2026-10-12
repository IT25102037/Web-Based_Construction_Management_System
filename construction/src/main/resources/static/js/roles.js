/* =========================================================
   WBCMS - ROLE & ACCESS MANAGEMENT JAVASCRIPT
   ========================================================= */

const API_URL = "/api/roles";

let currentPage = 0;
let totalPages = 1;
let currentSearch = "";
let currentCategory = "ALL";
let deleteRoleId = null;
let currentDossierRoleId = null;
let permissionCatalog = [];
const pageSize = 8;

/* =========================================================
   INITIALIZATION
========================================================= */
document.addEventListener("DOMContentLoaded", async () => {
    if (!checkAuthentication()) return;

    loadAdminInformation();
    await loadPermissionCatalog();
    loadRoleStats();
    loadRoles();
    setupModalEvents();
});

/* =========================================================
   AUTHENTICATION CHECK
========================================================= */
function checkAuthentication() {
    const token = localStorage.getItem("wbcms_token");
    const role = localStorage.getItem("wbcms_role");
    const userType = localStorage.getItem("wbcms_user_type");

    if (!token || role !== "SYSTEM_ADMINISTRATOR" || userType === "CLIENT") {
        window.location.replace("/staff-login.html");
        return false;
    }
    return true;
}

function handleUnauthorized() {
    localStorage.removeItem("wbcms_token");
    localStorage.removeItem("wbcms_role");
    localStorage.removeItem("wbcms_username");
    window.location.replace("/staff-login.html");
}

/* =========================================================
   ADMIN HEADER INFO
========================================================= */
function loadAdminInformation() {
    const username = localStorage.getItem("wbcms_username") || "Administrator";
    const adminName = document.getElementById("adminName");
    const adminAvatar = document.getElementById("adminAvatar");

    if (adminName) adminName.textContent = username;
    if (adminAvatar) adminAvatar.textContent = getInitials(username);
}

function getInitials(name) {
    if (!name) return "AD";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* =========================================================
   LOAD PERMISSION CATALOG & MATRIX
========================================================= */
async function loadPermissionCatalog() {
    const token = localStorage.getItem("wbcms_token");
    try {
        const response = await fetch(`${API_URL}/permissions`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (response.ok) {
            permissionCatalog = await response.json();
            renderPermissionMatrix();
        }
    } catch (err) {
        console.error("Error loading permissions catalog:", err);
    }
}

function renderPermissionMatrix() {
    const container = document.getElementById("permissionMatrixContainer");
    if (!container) return;

    if (!permissionCatalog || permissionCatalog.length === 0) {
        container.innerHTML = `<p style="color:#94a3b8; font-size:12px; text-align:center;">No permissions available.</p>`;
        return;
    }

    let html = "";
    permissionCatalog.forEach(group => {
        html += `
            <div class="matrix-module-group" data-module="${group.module}">
                <div class="matrix-module-header">
                    <div class="matrix-module-title">
                        <i class="${group.icon || 'bi bi-folder-fill'}"></i>
                        <span>${escapeHtml(group.moduleName)}</span>
                        <span style="font-size:11px; color:#64748b; font-weight:normal;">(${group.permissions.length} actions)</span>
                    </div>
                    <label style="margin:0; font-size:11.5px; color:#94a3b8; cursor:pointer; display:flex; align-items:center; gap:6px;">
                        <input type="checkbox" style="accent-color:var(--orange);" onchange="toggleModulePermissions('${group.module}', this.checked)">
                        Select All
                    </label>
                </div>
                <div class="matrix-items-grid">
        `;

        group.permissions.forEach(perm => {
            html += `
                <label class="perm-checkbox-label">
                    <input type="checkbox" name="permissions" value="${perm.code}" onchange="updateSelectedCount()">
                    <div class="perm-text-block">
                        <strong>${escapeHtml(perm.name)}</strong>
                        <span>${escapeHtml(perm.description)}</span>
                    </div>
                </label>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function toggleModulePermissions(moduleCode, checked) {
    const groupEl = document.querySelector(`.matrix-module-group[data-module="${moduleCode}"]`);
    if (groupEl) {
        const checkboxes = groupEl.querySelectorAll('input[name="permissions"]');
        checkboxes.forEach(cb => cb.checked = checked);
        updateSelectedCount();
    }
}

function selectAllPermissions(checked) {
    const checkboxes = document.querySelectorAll('#permissionMatrixContainer input[type="checkbox"]');
    checkboxes.forEach(cb => cb.checked = checked);
    updateSelectedCount();
}

function updateSelectedCount() {
    const selected = document.querySelectorAll('input[name="permissions"]:checked');
    const badge = document.getElementById("selectedPermCount");
    if (badge) {
        badge.textContent = `${selected.length} Selected`;
    }
}

/* =========================================================
   LOAD ROLE STATS
========================================================= */
async function loadRoleStats() {
    const token = localStorage.getItem("wbcms_token");
    try {
        const response = await fetch(`${API_URL}/stats`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (response.ok) {
            const stats = await response.json();
            const totalEl = document.getElementById("statTotalRoles");
            const sysEl = document.getElementById("statSystemRoles");
            const customEl = document.getElementById("statCustomRoles");
            const usersEl = document.getElementById("statAssignedUsers");

            if (totalEl) totalEl.textContent = stats.totalRoles || 0;
            if (sysEl) sysEl.textContent = stats.systemRoles || 0;
            if (customEl) customEl.textContent = stats.customRoles || 0;
            if (usersEl) usersEl.textContent = stats.totalUsersAssigned || 0;
        }
    } catch (err) {
        console.error("Failed to load role stats:", err);
    }
}

/* =========================================================
   LOAD ROLES (READ / SEARCH / FILTER)
========================================================= */
async function loadRoles() {
    const token = localStorage.getItem("wbcms_token");
    if (!token) return;

    try {
        showLoadingTable();

        const params = new URLSearchParams();
        params.append("page", currentPage);
        params.append("size", pageSize);
        params.append("sort", "roleName,asc");

        if (currentSearch.trim()) {
            params.append("search", currentSearch.trim());
        }
        if (currentCategory && currentCategory !== "ALL") {
            params.append("category", currentCategory);
        }

        const response = await fetch(`${API_URL}?${params.toString()}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (response.status === 401 || response.status === 403) {
            handleUnauthorized();
            return;
        }

        if (!response.ok) {
            throw new Error("Failed to load roles from server.");
        }

        const data = await response.json();
        renderRolesTable(data.content || []);
        updatePagination(data);

    } catch (err) {
        console.error("Error loading roles:", err);
        showErrorTable(err.message || "Failed to load roles.");
    }
}

function renderRolesTable(roles) {
    const tbody = document.getElementById("roleTableBody");
    const emptyState = document.getElementById("emptyState");

    if (!roles || roles.length === 0) {
        tbody.innerHTML = "";
        emptyState.style.display = "block";
        return;
    }

    emptyState.style.display = "none";
    let html = "";

    roles.forEach(role => {
        const color = role.color || "#ff7a1a";
        const categoryClass = (role.category || "general").toLowerCase().replace(/[^a-z0-9_]/g, "_");
        const categoryLabel = formatCategoryLabel(role.category);
        const permsCount = role.permissions ? role.permissions.length : 0;
        const modifiedDate = role.updatedAt ? formatDate(role.updatedAt) : "N/A";

        // Generate mini preview tags for first 3 permissions
        let previewChips = "";
        if (role.permissions && role.permissions.length > 0) {
            const preview = Array.from(role.permissions).slice(0, 2);
            preview.forEach(p => {
                previewChips += `<span class="perm-mini-chip">${escapeHtml(p)}</span>`;
            });
            if (role.permissions.length > 2) {
                previewChips += `<span class="perm-mini-chip" style="color:#ff9944;">+${role.permissions.length - 2} more</span>`;
            }
        } else {
            previewChips = `<span class="perm-mini-chip" style="color:#64748b;">No direct perms</span>`;
        }

        html += `
            <tr>
                <td><span style="color:#64748b; font-weight:600; font-size:12px;">#${role.id}</span></td>
                <td>
                    <div class="role-badge-cell">
                        <div class="role-color-indicator" style="background:${color}22; color:${color}; border-color:${color}55;">
                            ${escapeHtml(role.roleCode.substring(0, 2))}
                        </div>
                        <div class="role-info-text">
                            <strong>${escapeHtml(role.roleName)}</strong>
                            <span>${escapeHtml(role.roleCode)}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="category-pill ${categoryClass}">
                        ${categoryLabel}
                    </span>
                </td>
                <td>
                    <span class="type-pill ${role.isSystemRole ? 'system' : 'custom'}">
                        <i class="${role.isSystemRole ? 'bi bi-lock-fill' : 'bi bi-person-fill-gear'}"></i>
                        ${role.isSystemRole ? 'System' : 'Custom'}
                    </span>
                </td>
                <td>
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <span class="perm-count-badge" style="align-self:flex-start;">
                            <i class="bi bi-shield-lock"></i> ${permsCount} Privileges
                        </span>
                        <div class="perm-chips-wrap">
                            ${previewChips}
                        </div>
                    </div>
                </td>
                <td>
                    <span style="display:inline-flex; align-items:center; gap:6px; font-weight:700; color:${role.userCount > 0 ? '#38bdf8' : '#64748b'}; font-size:13px;">
                        <i class="bi bi-people"></i> ${role.userCount} Users
                    </span>
                </td>
                <td>
                    <span style="font-size:12.5px; color:#0f172a; font-weight:600;">${modifiedDate}</span>
                </td>
                <td style="text-align:center;">
                    <div class="action-buttons table-actions" style="justify-content:center;">
                        <button type="button" class="table-action view" title="View Permission Dossier" onclick="viewRoleDossier(${role.id})">
                            <i class="bi bi-eye"></i>
                        </button>
                        <button type="button" class="table-action edit" title="Edit Role & Permissions" onclick="openEditRoleModal(${role.id})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button type="button" class="table-action delete" title="Delete Role" onclick="openDeleteRoleModal(${role.id}, '${escapeHtml(role.roleName)}', ${role.isSystemRole}, ${role.userCount})">
                            <i class="bi bi-trash3"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function showLoadingTable() {
    const tbody = document.getElementById("roleTableBody");
    tbody.innerHTML = `
        <tr>
            <td colspan="8" style="text-align:center; padding:40px;">
                <i class="bi bi-arrow-repeat" style="font-size:24px; animation:spin 1s linear infinite; display:inline-block; color:var(--orange);"></i>
                <p style="margin-top:8px; color:#8a99ad;">Fetching roles & permissions from SQL Server...</p>
            </td>
        </tr>
    `;
}

function showErrorTable(msg) {
    const tbody = document.getElementById("roleTableBody");
    tbody.innerHTML = `
        <tr>
            <td colspan="8" style="text-align:center; padding:40px; color:#f87171;">
                <i class="bi bi-exclamation-triangle" style="font-size:24px;"></i>
                <p style="margin-top:8px;">${escapeHtml(msg)}</p>
                <button type="button" class="secondary-btn" style="margin-top:10px;" onclick="loadRoles()">Retry</button>
            </td>
        </tr>
    `;
}

/* =========================================================
   SEARCH & FILTER HANDLERS
========================================================= */
function handleSearch(e) {
    if (e) e.preventDefault();
    const input = document.getElementById("roleSearch");
    currentSearch = input ? input.value.trim() : "";
    currentPage = 0;
    loadRoles();
}

function handleCategoryFilter(val) {
    currentCategory = val;
    currentPage = 0;
    loadRoles();
}

/* =========================================================
   PAGINATION
========================================================= */
function updatePagination(data) {
    totalPages = data.totalPages || 1;
    const pageInfo = document.getElementById("pageInfo");
    const prevBtn = document.getElementById("prevPageBtn");
    const nextPageBtn = document.getElementById("nextPageBtn");

    if (pageInfo) {
        const totalElements = data.totalElements || 0;
        pageInfo.textContent = `Showing Page ${currentPage + 1} of ${Math.max(totalPages, 1)} (${totalElements} total roles)`;
    }

    if (prevBtn) prevBtn.disabled = currentPage === 0;
    if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages - 1;
}

function prevPage() {
    if (currentPage > 0) {
        currentPage--;
        loadRoles();
    }
}

function nextPage() {
    if (currentPage < totalPages - 1) {
        currentPage++;
        loadRoles();
    }
}

/* =========================================================
   CREATE ROLE MODAL (CREATE OPERATION)
========================================================= */
function openAddRoleModal() {
    const form = document.getElementById("roleForm");
    if (form) form.reset();

    document.getElementById("roleId").value = "";
    document.getElementById("modalTitle").textContent = "Create New Role";
    document.getElementById("modalDescription").textContent = "Define custom role parameters and assign modular permissions.";
    document.getElementById("roleCode").readOnly = false;
    document.getElementById("roleCode").style.opacity = "1";
    document.getElementById("roleCodeHelp").textContent = "Uppercase identifier used by the security system.";

    setColor("#ff7a1a");
    selectAllPermissions(false);

    document.getElementById("roleModal").classList.add("open");
}

/* =========================================================
   EDIT ROLE MODAL (UPDATE OPERATION)
========================================================= */
async function openEditRoleModal(id) {
    const token = localStorage.getItem("wbcms_token");

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Failed to load role details.");
        }

        const role = await response.json();

        document.getElementById("roleId").value = role.id;
        document.getElementById("roleName").value = role.roleName;
        document.getElementById("roleCode").value = role.roleCode;
        document.getElementById("category").value = role.category || "GENERAL";
        document.getElementById("description").value = role.description || "";
        setColor(role.color || "#ff7a1a");

        document.getElementById("modalTitle").textContent = `Edit Role: ${role.roleName}`;
        document.getElementById("modalDescription").textContent = role.isSystemRole
            ? "Built-in system role. Core code is protected, permissions and descriptions can be customized."
            : "Update role details, category, and access privileges.";

        // If system role, make roleCode readonly
        const codeInput = document.getElementById("roleCode");
        if (role.isSystemRole) {
            codeInput.readOnly = true;
            codeInput.style.opacity = "0.7";
            document.getElementById("roleCodeHelp").textContent = "System role identifier cannot be renamed.";
        } else {
            codeInput.readOnly = false;
            codeInput.style.opacity = "1";
            document.getElementById("roleCodeHelp").textContent = "Uppercase identifier used by the security system.";
        }

        // Check assigned permissions
        selectAllPermissions(false);
        if (role.permissions && role.permissions.length > 0) {
            role.permissions.forEach(permCode => {
                const cb = document.querySelector(`input[name="permissions"][value="${permCode}"]`);
                if (cb) cb.checked = true;
            });
        }
        updateSelectedCount();

        document.getElementById("roleModal").classList.add("open");

    } catch (err) {
        showToast(err.message || "Unable to open edit modal.", "error");
    }
}

function closeRoleModal() {
    document.getElementById("roleModal").classList.remove("open");
}

/* =========================================================
   SAVE ROLE (CREATE / UPDATE DISPATCH)
========================================================= */
async function saveRole(e) {
    e.preventDefault();

    const token = localStorage.getItem("wbcms_token");
    const roleId = document.getElementById("roleId").value;
    const isEdit = Boolean(roleId);

    const roleName = document.getElementById("roleName").value.trim();
    const roleCode = document.getElementById("roleCode").value.trim().toUpperCase();
    const category = document.getElementById("category").value;
    const color = document.getElementById("roleColor").value;
    const description = document.getElementById("description").value.trim();

    // Collect checked permissions
    const selectedCheckboxes = document.querySelectorAll('input[name="permissions"]:checked');
    const permissions = Array.from(selectedCheckboxes).map(cb => cb.value);

    if (!roleName || !roleCode) {
        showToast("Please provide both Role Name and Role Code.", "error");
        return;
    }

    const payload = {
        roleCode: roleCode,
        roleName: roleName,
        category: category,
        color: color,
        description: description,
        permissions: permissions
    };

    const saveBtn = document.getElementById("saveRoleBtn");
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<i class="bi bi-arrow-repeat" style="animation:spin 1s linear infinite; display:inline-block;"></i> Saving...`;

    try {
        const url = isEdit ? `${API_URL}/${roleId}` : API_URL;
        const method = isEdit ? "PUT" : "POST";

        const response = await fetch(url, {
            method: method,
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || data.error || "Failed to save role.");
        }

        showToast(isEdit ? "Successfully edited role!" : "Successfully created role!", "success");
        closeRoleModal();
        loadRoleStats();
        loadRoles();

    } catch (err) {
        showToast(err.message || (isEdit ? "Error editing role: Failed to update." : "Error creating role."), "error");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalText;
    }
}

/* =========================================================
   DELETE ROLE (DELETE OPERATION WITH SAFETY CHECK)
========================================================= */
function openDeleteRoleModal(id, name, isSystemRole, userCount) {
    deleteRoleId = id;
    document.getElementById("deleteRoleName").textContent = name;

    const warningBox = document.getElementById("deleteWarningBox");
    const confirmBtn = document.getElementById("confirmDeleteBtn");

    if (isSystemRole) {
        warningBox.style.display = "block";
        warningBox.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> <strong>Built-in System Role:</strong> System administrator role is protected. Other system roles cannot be deleted if active system modules depend on them.`;
        if (name.toUpperCase().includes("ADMINISTRATOR")) {
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = "0.4";
            confirmBtn.title = "System Administrator cannot be deleted";
        } else {
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = "1";
        }
    } else if (userCount > 0) {
        warningBox.style.display = "block";
        warningBox.innerHTML = `<i class="bi bi-people-fill"></i> <strong>Assigned Users:</strong> There are <strong>${userCount}</strong> user(s) currently assigned to this role. Please reassign them before deleting.`;
        confirmBtn.disabled = true;
        confirmBtn.style.opacity = "0.4";
    } else {
        warningBox.style.display = "none";
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = "1";
    }

    document.getElementById("deleteModal").classList.add("open");
}

function closeDeleteModal() {
    deleteRoleId = null;
    document.getElementById("deleteModal").classList.remove("open");
}

async function deleteRoleConfirmed() {
    if (!deleteRoleId) return;

    const token = localStorage.getItem("wbcms_token");
    const confirmBtn = document.getElementById("confirmDeleteBtn");
    const originalText = confirmBtn.innerHTML;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = `<i class="bi bi-arrow-repeat" style="animation:spin 1s linear infinite; display:inline-block;"></i> Deleting...`;

    try {
        const response = await fetch(`${API_URL}/${deleteRoleId}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || data.error || "Failed to delete role.");
        }

        showToast("Successfully deleted role!", "success");
        closeDeleteModal();
        loadRoleStats();
        loadRoles();

    } catch (err) {
        showToast(err.message || "Error deleting role.", "error");
    } finally {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = originalText;
    }
}

/* =========================================================
   ROLE DOSSIER / PERMISSIONS INSPECTION MODAL
========================================================= */
async function viewRoleDossier(id) {
    const token = localStorage.getItem("wbcms_token");
    currentDossierRoleId = id;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) throw new Error("Failed to load role dossier.");

        const role = await response.json();
        const content = document.getElementById("dossierContent");
        const grantedSet = new Set(role.permissions || []);
        const totalAvail = 36;
        const grantedCount = grantedSet.size;
        const restrictedCount = Math.max(totalAvail - grantedCount, 0);

        let permsGridHtml = "";

        // Build list grouped by module
        permissionCatalog.forEach(group => {
            permsGridHtml += `
                <div style="grid-column:1/-1; margin-top:8px; margin-bottom:2px; font-weight:700; color:#cbd5e1; font-size:12px; display:flex; align-items:center; gap:6px;">
                    <i class="${group.icon}" style="color:var(--orange);"></i> ${escapeHtml(group.moduleName)}
                </div>
            `;

            group.permissions.forEach(p => {
                const isAllowed = grantedSet.has(p.code);
                permsGridHtml += `
                    <div class="dossier-perm-item ${isAllowed ? 'allowed' : 'denied'}">
                        <i class="${isAllowed ? 'bi bi-check-circle-fill' : 'bi bi-x-circle'}"></i>
                        <span>${escapeHtml(p.name)}</span>
                    </div>
                `;
            });
        });

        content.innerHTML = `
            <div class="dossier-hero">
                <div class="dossier-avatar" style="background:${role.color || '#ff7a1a'};">
                    ${escapeHtml(role.roleCode.substring(0, 2))}
                </div>
                <div class="dossier-info">
                    <h3>${escapeHtml(role.roleName)} <span class="category-pill ${role.category ? role.category.toLowerCase() : 'general'}" style="font-size:11px; vertical-align:middle; margin-left:6px;">${formatCategoryLabel(role.category)}</span></h3>
                    <p style="font-family:'JetBrains Mono', monospace; font-size:11.5px; color:#ff9944;">KEY: ${escapeHtml(role.roleCode)}</p>
                    <p style="margin-top:4px;">${escapeHtml(role.description || 'No detailed description provided.')}</p>
                </div>
            </div>

            <div class="dossier-meta-row">
                <div class="dossier-stat-box">
                    <span>Role Type</span>
                    <strong>${role.isSystemRole ? 'Built-in System' : 'Custom Organization'}</strong>
                </div>
                <div class="dossier-stat-box">
                    <span>Granted Privileges</span>
                    <strong style="color:#34d399;">${grantedCount} Actions</strong>
                </div>
                <div class="dossier-stat-box">
                    <span>Restricted Privileges</span>
                    <strong style="color:#f87171;">${restrictedCount} Actions</strong>
                </div>
                <div class="dossier-stat-box">
                    <span>Active Users</span>
                    <strong style="color:#38bdf8;">${role.userCount} Accounts</strong>
                </div>
            </div>

            <div style="margin-top:14px;">
                <label style="font-size:12.5px; font-weight:700; color:#fff; display:block; margin-bottom:8px;">
                    Module Access & Security Permissions Matrix:
                </label>
                <div class="dossier-perm-grid">
                    ${permsGridHtml}
                </div>
            </div>
        `;

        const stampEl = document.getElementById("dossierRoleTimestamp");
        if (stampEl && role.updatedAt) {
            stampEl.textContent = `Last synchronized: ${formatDate(role.updatedAt)}`;
        }

        document.getElementById("dossierModal").classList.add("open");

    } catch (err) {
        showToast(err.message || "Failed to load dossier.", "error");
    }
}

function closeDossierModal() {
    currentDossierRoleId = null;
    document.getElementById("dossierModal").classList.remove("open");
}

function editFromDossier() {
    if (currentDossierRoleId) {
        const id = currentDossierRoleId;
        closeDossierModal();
        openEditRoleModal(id);
    }
}

/* =========================================================
   HELPERS & EVENT LISTENERS
========================================================= */
function autoGenerateCode(name) {
    const codeInput = document.getElementById("roleCode");
    const roleId = document.getElementById("roleId").value;
    if (!roleId && codeInput && !codeInput.readOnly) {
        codeInput.value = name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "_").replace(/_+/g, "_");
    }
}

function setColor(hex) {
    const input = document.getElementById("roleColor");
    if (input) input.value = hex;

    // Highlight active swatch
    document.querySelectorAll(".color-swatch").forEach(s => {
        if (s.style.background === hex || rgbToHex(s.style.background) === hex) {
            s.classList.add("active");
        } else {
            s.classList.remove("active");
        }
    });
}

function rgbToHex(rgb) {
    if (!rgb || !rgb.startsWith("rgb")) return rgb;
    const vals = rgb.match(/\d+/g);
    if (!vals || vals.length < 3) return rgb;
    return "#" + ((1 << 24) + (+vals[0] << 16) + (+vals[1] << 8) + +vals[2]).toString(16).slice(1);
}

function formatCategoryLabel(cat) {
    if (!cat) return "General";
    return cat.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function formatDate(dt) {
    if (!dt) return "N/A";
    const d = new Date(dt);
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
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

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");
    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;
    toast.className = `toast show ${type}`;

    const icon = toast.querySelector("i");
    if (icon) {
        icon.className = type === "error"
            ? "bi bi-exclamation-octagon-fill"
            : "bi bi-check-circle-fill";
    }

    setTimeout(() => {
        toast.className = "toast";
    }, 4000);
}

function setupModalEvents() {
    // Close modal when clicking on overlay outside modal-dialog
    document.querySelectorAll(".modal").forEach(modal => {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                modal.classList.remove("open");
            }
        });
    });

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            document.querySelectorAll(".modal.open").forEach(m => m.classList.remove("open"));
        }
    });
}

function logout() {
    localStorage.removeItem("wbcms_token");
    localStorage.removeItem("wbcms_username");
    localStorage.removeItem("wbcms_role");
    localStorage.removeItem("wbcms_user_type");
    localStorage.removeItem("wbcms_user");
    window.location.replace("/staff-login.html");
}
