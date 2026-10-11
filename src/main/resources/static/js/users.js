/* =========================================================
   WBCMS - USER MANAGEMENT JAVASCRIPT ENGINE
   Full CRUD Operation & Administrative Control
   ========================================================= */

const API_URL = "/api/users";

let currentPage = 0;
let totalPages = 1;
let currentSearch = "";
let currentRoleFilter = "ALL";
let deleteUserId = null;
let currentViewUserId = null;
const pageSize = 8;

/* =========================================================
   INITIALIZATION
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    if (!checkAuthentication()) return;

    loadAdminInformation();
    loadUserStats();
    loadUsers();
    setupModalEvents();
});

/* =========================================================
   AUTHENTICATION CHECK
   Give full access to logged-in staff / administrator users
========================================================= */
function checkAuthentication() {
    const token = localStorage.getItem("wbcms_token");
    const userType = localStorage.getItem("wbcms_user_type");

    if (!token || userType === "CLIENT") {
        window.location.replace("/staff-login.html");
        return false;
    }
    return true;
}

function isSystemAdmin() {
    const role = (localStorage.getItem("wbcms_role") || "").toUpperCase();
    return role === "SYSTEM_ADMINISTRATOR" || role === "ADMIN";
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
   LOAD USER METRICS / STATS FROM DATABASE
========================================================= */
async function loadUserStats() {
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
            const totalEl = document.getElementById("statTotalUsers");
            const pmEl = document.getElementById("statProjectManagers");
            const engEl = document.getElementById("statSiteEngineers");
            const adminEl = document.getElementById("statAdministrators");

            if (totalEl) totalEl.textContent = stats.totalUsers || 0;
            if (pmEl) pmEl.textContent = stats.projectManagers || 0;
            if (engEl) engEl.textContent = stats.siteEngineers || 0;
            if (adminEl) adminEl.textContent = stats.administrators || 0;
        }
    } catch (err) {
        console.error("Failed to load user stats:", err);
    }
}

/* =========================================================
   LOAD USERS (READ / SEARCH / FILTER)
========================================================= */
async function loadUsers() {
    const token = localStorage.getItem("wbcms_token");
    if (!token) return;

    try {
        showLoadingTable();

        const params = new URLSearchParams();
        params.append("page", currentPage);
        params.append("size", pageSize);
        params.append("sort", "createdAt,desc");

        if (currentSearch.trim()) {
            params.append("search", currentSearch.trim());
        }
        if (currentRoleFilter && currentRoleFilter !== "ALL") {
            params.append("role", currentRoleFilter);
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
            throw new Error("Failed to load users from database.");
        }

        const data = await response.json();
        renderUsersTable(data.content || []);
        updatePagination(data);

    } catch (err) {
        console.error("Error loading users:", err);
        showErrorTable(err.message || "Failed to load user records.");
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById("userTableBody");
    const emptyState = document.getElementById("emptyState");

    if (!tbody) return;

    if (!users || users.length === 0) {
        tbody.innerHTML = "";
        if (emptyState) emptyState.style.display = "block";
        return;
    }

    if (emptyState) emptyState.style.display = "none";
    let html = "";
    const isAdmin = isSystemAdmin();

    users.forEach(user => {
        const roleClass = getRoleClass(user.role);
        const roleLabel = formatRoleLabel(user.role);
        const initials = getInitials(user.fullName || user.username);
        const createdDate = formatDate(user.createdAt);

        html += `
            <tr>
                <td><span style="color:#64748b; font-weight:600; font-size:12px;">#${user.id}</span></td>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar-circle">
                            ${escapeHtml(initials)}
                        </div>
                        <div class="user-info-text">
                            <strong>${escapeHtml(user.fullName || user.username)}</strong>
                            <span>@${escapeHtml(user.username)}</span>
                        </div>
                    </div>
                </td>
                <td>
                    <a href="mailto:${escapeHtml(user.email)}" class="contact-link">
                        <i class="bi bi-envelope"></i>
                        <span>${escapeHtml(user.email)}</span>
                    </a>
                </td>
                <td>
                    ${user.phoneNumber ? `
                        <a href="tel:${escapeHtml(user.phoneNumber)}" class="contact-link">
                            <i class="bi bi-telephone"></i>
                            <span>${escapeHtml(user.phoneNumber)}</span>
                        </a>
                    ` : `<span style="color:#64748b; font-size:12px;">-</span>`}
                </td>
                <td>
                    <span class="role-pill ${roleClass}">
                        ${roleLabel}
                    </span>
                </td>
                <td>
                    <span style="font-size:12.5px; color:#0f172a; font-weight:600;">${createdDate}</span>
                </td>
                <td style="text-align:center;">
                    <div class="action-buttons table-actions" style="justify-content:center;">
                        <button type="button" class="table-action view" title="View Profile Dossier" onclick="viewUser(${user.id})">
                            <i class="bi bi-eye"></i>
                        </button>
                        ${isAdmin ? `
                        <button type="button" class="table-action edit" title="Edit User" onclick="openEditUserModal(${user.id})">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button type="button" class="table-action delete" title="Delete User" onclick="openDeleteModal(${user.id}, '${escapeJs(user.fullName || user.username)}', '${escapeJs(user.username)}', '${user.role}')">
                            <i class="bi bi-trash3"></i>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

function showLoadingTable() {
    const tbody = document.getElementById("userTableBody");
    if (!tbody) return;
    tbody.innerHTML = `
        <tr>
            <td colspan="7" style="text-align:center; padding:40px;">
                <i class="bi bi-arrow-repeat" style="font-size:24px; animation:spin 1s linear infinite; display:inline-block; color:var(--orange);"></i>
                <p style="margin-top:8px; color:#8a99ad;">Querying user records from SQL Server...</p>
            </td>
        </tr>
    `;
}

function showErrorTable(msg) {
    const tbody = document.getElementById("userTableBody");
    if (!tbody) return;
    tbody.innerHTML = `
        <tr>
            <td colspan="7" style="text-align:center; padding:40px; color:#f87171;">
                <i class="bi bi-exclamation-triangle" style="font-size:24px;"></i>
                <p style="margin-top:8px;">${escapeHtml(msg)}</p>
                <button type="button" class="secondary-btn" style="margin-top:10px;" onclick="loadUsers()">Retry</button>
            </td>
        </tr>
    `;
}

/* =========================================================
   SEARCH & FILTER HANDLERS
========================================================= */
function handleSearch(e) {
    if (e) e.preventDefault();
    const input = document.getElementById("userSearch");
    currentSearch = input ? input.value.trim() : "";
    currentPage = 0;
    loadUsers();
}

function handleRoleFilter(val) {
    currentRoleFilter = val;
    currentPage = 0;
    loadUsers();
}

/* =========================================================
   PAGINATION
========================================================= */
function updatePagination(data) {
    totalPages = data.totalPages || 1;
    const pageInfo = document.getElementById("pageInfo");
    const pageIndicator = document.getElementById("pageIndicator");
    const prevBtn = document.getElementById("prevPageBtn");
    const nextPageBtn = document.getElementById("nextPageBtn");

    if (pageInfo) {
        const totalElements = data.totalElements || 0;
        pageInfo.innerHTML = `Showing Page <strong>${currentPage + 1}</strong> of <strong>${Math.max(totalPages, 1)}</strong> &nbsp;•&nbsp; <span style="color:#64748b;">${totalElements} total users</span>`;
    }

    if (pageIndicator) {
        pageIndicator.textContent = `Page ${currentPage + 1} / ${Math.max(totalPages, 1)}`;
    }

    if (prevBtn) prevBtn.disabled = currentPage === 0;
    if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages - 1;
}

function prevPage() {
    if (currentPage > 0) {
        currentPage--;
        loadUsers();
    }
}

function nextPage() {
    if (currentPage < totalPages - 1) {
        currentPage++;
        loadUsers();
    }
}

/* =========================================================
   CREATE USER MODAL (CREATE OPERATION)
========================================================= */
function openAddUserModal() {
    const form = document.getElementById("userForm");
    if (form) form.reset();

    document.getElementById("userId").value = "";
    document.getElementById("modalTitle").textContent = "Add New User";
    document.getElementById("modalDescription").textContent = "Create a new authenticated system user account.";

    const pwdInput = document.getElementById("password");
    if (pwdInput) {
        pwdInput.required = true;
        pwdInput.value = "";
    }
    const pwdReq = document.getElementById("passwordRequired");
    if (pwdReq) pwdReq.style.display = "inline";
    const pwdHelp = document.getElementById("passwordHelp");
    if (pwdHelp) pwdHelp.textContent = "Required when creating a new user (minimum 8 characters).";

    const saveBtn = document.getElementById("saveUserBtn");
    if (saveBtn) {
        saveBtn.innerHTML = `<i class="bi bi-person-check-fill"></i> Save User`;
    }

    const modal = document.getElementById("userModal");
    if (modal) {
        modal.classList.add("open");
        modal.classList.add("show");
    }
}

/* =========================================================
   EDIT USER MODAL (UPDATE OPERATION)
========================================================= */
async function openEditUserModal(id) {
    if (!isSystemAdmin()) {
        showToast("Access Denied: Only System Administrators can edit user accounts.", "error");
        return;
    }

    const token = localStorage.getItem("wbcms_token");

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || errData.error || `Failed to load user details (Status ${response.status}).`);
        }

        const user = await response.json();

        document.getElementById("userId").value = user.id;
        document.getElementById("fullName").value = user.fullName || "";
        document.getElementById("username").value = user.username || "";
        document.getElementById("email").value = user.email || "";
        document.getElementById("phone").value = user.phoneNumber || "";
        document.getElementById("role").value = user.role || "";

        const pwdInput = document.getElementById("password");
        if (pwdInput) {
            pwdInput.value = "";
            pwdInput.required = false;
        }
        const pwdReq = document.getElementById("passwordRequired");
        if (pwdReq) pwdReq.style.display = "none";
        const pwdHelp = document.getElementById("passwordHelp");
        if (pwdHelp) pwdHelp.textContent = "Leave blank to keep existing password, or enter at least 8 characters to change.";

        const titleEl = document.getElementById("modalTitle");
        const descEl = document.getElementById("modalDescription");
        const saveBtn = document.getElementById("saveUserBtn");

        if (titleEl) titleEl.textContent = `Edit User: ${user.fullName || user.username}`;
        if (descEl) descEl.textContent = "Update user details, contact info, or assigned role.";
        if (saveBtn) saveBtn.innerHTML = `<i class="bi bi-check-circle-fill"></i> Update User`;

        const modal = document.getElementById("userModal");
        if (modal) {
            modal.classList.add("open");
            modal.classList.add("show");
        }

    } catch (err) {
        console.error("Open edit modal error:", err);
        showToast(err.message || "Unable to open edit user modal.", "error");
    }
}

function closeUserModal() {
    const modal = document.getElementById("userModal");
    if (modal) {
        modal.classList.remove("open");
        modal.classList.remove("show");
    }
}

/* =========================================================
   SAVE USER (CREATE / UPDATE DISPATCH)
========================================================= */
async function saveUser(e) {
    e.preventDefault();

    const token = localStorage.getItem("wbcms_token");
    const userId = document.getElementById("userId").value.trim();
    const isEdit = Boolean(userId);

    if (isEdit && !isSystemAdmin()) {
        showToast("Access Denied: Only System Administrators can edit user accounts.", "error");
        return;
    }

    const fullName = document.getElementById("fullName").value.trim();
    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const role = document.getElementById("role").value;
    const password = document.getElementById("password").value.trim();

    if (!fullName || !username || !email || !role) {
        showToast("Please fill in all required fields marked with *", "error");
        return;
    }

    if (!isEdit && (!password || password.length < 8)) {
        showToast("Password must be at least 8 characters long.", "error");
        return;
    }

    if (isEdit && password && password.length < 8) {
        showToast("New password must be at least 8 characters long.", "error");
        return;
    }

    const payload = {
        fullName: fullName,
        username: username,
        email: email,
        phoneNumber: phone || null,
        role: role,
        password: password || null
    };

    const saveBtn = document.getElementById("saveUserBtn");
    const originalText = saveBtn ? saveBtn.innerHTML : "";
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<i class="bi bi-arrow-repeat spin" style="display:inline-block;"></i> Saving...`;
    }

    try {
        const url = isEdit ? `${API_URL}/${userId}` : API_URL;
        const method = isEdit ? "PUT" : "POST";

        const response = await fetch(url, {
            method: method,
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            let errMsg = data.message;
            if (data.validationErrors && typeof data.validationErrors === "object" && Object.keys(data.validationErrors).length > 0) {
                errMsg = Object.values(data.validationErrors).join(". ");
            } else if (!errMsg || errMsg === "Check the request fields") {
                errMsg = data.error || `Error ${response.status}: Failed to ${isEdit ? 'update' : 'create'} user account.`;
            }
            throw new Error(errMsg);
        }

        const successMsg = isEdit 
            ? `User account "${fullName}" has been successfully updated in the system!`
            : `New user account "${fullName}" has been successfully created!`;
        showToast(successMsg, "success");
        showStatusAlert(successMsg, "success");
        closeUserModal();
        loadUserStats();
        loadUsers();

    } catch (err) {
        console.error("Save user error:", err);
        const errMsg = err.message || (isEdit ? "Error editing user: Failed to update." : "Error creating user.");
        showToast(errMsg, "error");
        showStatusAlert(errMsg, "error");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    }
}

/* =========================================================
   DELETE USER (FULL ACCESS DELETE OPERATION)
========================================================= */
function openDeleteModal(id, fullName, username, role) {
    if (!isSystemAdmin()) {
        showToast("Access Denied: Only System Administrators can delete user accounts.", "error");
        return;
    }

    deleteUserId = id;
    const nameEl = document.getElementById("deleteUserName");
    if (nameEl) {
        nameEl.textContent = `${fullName} (@${username})`;
    }

    const loggedInUsername = localStorage.getItem("wbcms_username");
    const warningBox = document.getElementById("deleteWarningNotice");
    const confirmBtn = document.getElementById("confirmDeleteBtn");

    if (username && loggedInUsername && username.toLowerCase() === loggedInUsername.toLowerCase()) {
        if (warningBox) {
            warningBox.style.display = "block";
            warningBox.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> <strong>Note:</strong> You are deleting your current active session account. Deleting this user will sign you out.`;
        }
    } else {
        if (warningBox) {
            warningBox.style.display = "none";
        }
    }

    // Full access to delete users
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.style.opacity = "1";
    }

    const modal = document.getElementById("deleteModal");
    if (modal) {
        modal.classList.add("open");
        modal.classList.add("show");
    }
}

function closeDeleteModal() {
    deleteUserId = null;
    const modal = document.getElementById("deleteModal");
    if (modal) {
        modal.classList.remove("open");
        modal.classList.remove("show");
    }
}

async function deleteUserConfirmed() {
    if (!deleteUserId) return;

    if (!isSystemAdmin()) {
        showToast("Access Denied: Only System Administrators can delete user accounts.", "error");
        return;
    }

    const token = localStorage.getItem("wbcms_token");
    const confirmBtn = document.getElementById("confirmDeleteBtn");
    const originalText = confirmBtn ? confirmBtn.innerHTML : "";
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = `<i class="bi bi-arrow-repeat spin" style="display:inline-block;"></i> Deleting...`;
    }

    const idToDelete = deleteUserId;
    const nameEl = document.getElementById("deleteUserName");
    const userDisplayName = (nameEl && nameEl.textContent) ? nameEl.textContent.trim() : `User #${idToDelete}`;
    const loggedInUserId = localStorage.getItem("wbcms_user_id");

    try {
        const response = await fetch(`${API_URL}/${idToDelete}`, {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            throw new Error(data.message || data.error || `Error ${response.status}: Failed to delete user account.`);
        }

        // Close delete modal
        closeDeleteModal();

        // Clear message displayed to System Administrator
        const successMessage = `User ${userDisplayName} has been successfully deleted from the system!`;
        showToast(successMessage, "success");
        showStatusAlert(successMessage, "success");

        // If the user deleted their own account, log out
        if (loggedInUserId && String(loggedInUserId) === String(idToDelete)) {
            setTimeout(() => {
                logout();
            }, 1200);
            return;
        }

        loadUserStats();
        loadUsers();

    } catch (err) {
        console.error("Delete user error:", err);
        const errorMessage = err.message || "Error deleting user account from the system.";
        showToast(errorMessage, "error");
        showStatusAlert(errorMessage, "error");
    } finally {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = originalText;
        }
    }
}

/* =========================================================
   USER PROFILE DOSSIER / VIEW MODAL
========================================================= */
async function viewUser(id) {
    const token = localStorage.getItem("wbcms_token");
    currentViewUserId = id;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) {
            throw new Error("Failed to load user profile dossier.");
        }

        const user = await response.json();
        const roleClass = getRoleClass(user.role);
        const roleLabel = formatRoleLabel(user.role);
        const initials = getInitials(user.fullName || user.username);

        const container = document.getElementById("viewUserContent");
        container.innerHTML = `
            <div class="dossier-hero">
                <div class="dossier-avatar">
                    ${escapeHtml(initials)}
                </div>
                <div class="dossier-meta">
                    <h3>${escapeHtml(user.fullName || user.username)}</h3>
                    <p>@${escapeHtml(user.username)}</p>
                    <span class="role-pill ${roleClass}" style="margin-top:6px;">
                        ${roleLabel}
                    </span>
                </div>
            </div>

            <div class="dossier-grid">
                <div class="dossier-card">
                    <span>Email Address</span>
                    <strong>${escapeHtml(user.email)}</strong>
                </div>
                <div class="dossier-card">
                    <span>Phone Number</span>
                    <strong>${escapeHtml(user.phoneNumber || 'N/A')}</strong>
                </div>
                <div class="dossier-card">
                    <span>Account ID</span>
                    <strong>#${user.id}</strong>
                </div>
                <div class="dossier-card">
                    <span>Account Created</span>
                    <strong>${formatDate(user.createdAt)}</strong>
                </div>
            </div>
        `;

        const stampEl = document.getElementById("viewUserTimestamp");
        if (stampEl && user.updatedAt) {
            stampEl.textContent = `Last synchronized: ${formatDate(user.updatedAt)}`;
        }

        const editBtn = document.getElementById("viewUserEditBtn");
        if (editBtn) {
            editBtn.style.display = isSystemAdmin() ? "inline-flex" : "none";
        }

        const modal = document.getElementById("viewModal");
        if (modal) {
            modal.classList.add("open");
            modal.classList.add("show");
        }

    } catch (err) {
        showToast(err.message || "Failed to load user profile.", "error");
    }
}

function closeViewModal() {
    currentViewUserId = null;
    const modal = document.getElementById("viewModal");
    if (modal) {
        modal.classList.remove("open");
        modal.classList.remove("show");
    }
}

function editFromViewModal() {
    if (!isSystemAdmin()) {
        showToast("Access Denied: Only System Administrators can edit user accounts.", "error");
        return;
    }
    if (currentViewUserId) {
        const id = currentViewUserId;
        closeViewModal();
        openEditUserModal(id);
    }
}

/* =========================================================
   HELPERS & EVENT LISTENERS
========================================================= */
function getRoleClass(role) {
    if (!role) return "staff";
    switch (role.toUpperCase()) {
        case "SYSTEM_ADMINISTRATOR": return "admin";
        case "PROJECT_MANAGER": return "manager";
        case "SITE_ENGINEER": return "engineer";
        case "CONSTRUCTION_SUPERVISOR": return "supervisor";
        case "PROCUREMENT_OFFICER": return "procurement";
        case "CLIENT": return "client";
        default: return "staff";
    }
}

function formatRoleLabel(role) {
    if (!role) return "Staff";
    return role.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
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

function escapeJs(str) {
    if (!str) return "";
    return String(str)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"');
}

let toastTimeout = null;
let alertBannerTimeout = null;

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");
    if (!toast || !toastMessage) return;

    if (toastTimeout) {
        clearTimeout(toastTimeout);
    }

    toastMessage.textContent = message;
    toast.className = `toast show ${type}`;

    const icon = toast.querySelector("i");
    if (icon) {
        icon.className = type === "error"
            ? "bi bi-exclamation-octagon-fill"
            : (type === "warning" ? "bi bi-exclamation-triangle-fill" : "bi bi-check-circle-fill");
    }

    toastTimeout = setTimeout(() => {
        toast.className = "toast";
    }, 4500);
}

function showStatusAlert(message, type = "success") {
    const banner = document.getElementById("statusAlertBanner");
    const textEl = document.getElementById("statusAlertText");
    const iconEl = document.getElementById("statusAlertIcon");
    if (!banner || !textEl) return;

    if (alertBannerTimeout) {
        clearTimeout(alertBannerTimeout);
    }

    textEl.textContent = message;
    banner.className = `status-alert-banner ${type}`;
    banner.style.display = "flex";

    if (iconEl) {
        iconEl.className = type === "error"
            ? "bi bi-exclamation-octagon-fill"
            : (type === "warning" ? "bi bi-exclamation-triangle-fill" : "bi bi-check-circle-fill");
    }

    alertBannerTimeout = setTimeout(() => {
        banner.style.display = "none";
    }, 6000);
}

function dismissStatusAlert() {
    const banner = document.getElementById("statusAlertBanner");
    if (banner) {
        banner.style.display = "none";
    }
}

function setupModalEvents() {
    document.querySelectorAll(".modal, .modal-overlay").forEach(modal => {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) {
                modal.classList.remove("open");
                modal.classList.remove("show");
            }
        });
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            document.querySelectorAll(".modal.open, .modal.show, .modal-overlay.open, .modal-overlay.show").forEach(m => {
                m.classList.remove("open");
                m.classList.remove("show");
            });
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