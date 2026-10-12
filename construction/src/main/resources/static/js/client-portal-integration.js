/* ==========================================================================
   WBCMS - Client Portal Integration JavaScript Engine
   Real Database Sync for Client Profile (CRUD & Delete Confirmation)
   and Client Project Requests (CRUD: Create, Read, Update, Delete)
   ========================================================================== */

(function () {
    "use strict";

    // API Endpoints
    const PROFILE_API = "/api/client/profile";
    const REQUESTS_API = "/api/client/project-requests";

    // State
    let currentProfile = null;
    let allRequests = [];
    let activeFilter = "ALL";
    let editingRequestId = null;
    let deletingRequestId = null;

    /* ==========================================================================
       SESSION & AUTH HELPER
       ========================================================================== */
    function getToken() {
        return localStorage.getItem("wbcms_token");
    }

    function isClientLoggedIn() {
        const token = getToken();
        const role = localStorage.getItem("wbcms_role");
        const userType = localStorage.getItem("wbcms_user_type");
        return !!(token && (role === "CLIENT" || userType === "CLIENT"));
    }

    function getAuthHeaders() {
        return {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + getToken()
        };
    }

    function getInitials(name) {
        if (!name) return "C";
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    }

    function formatLKR(amount) {
        if (amount == null) return "LKR 0.00";
        const num = Number(amount);
        return "LKR " + num.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function formatDate(dateStr) {
        if (!dateStr) return "--";
        try {
            const d = new Date(dateStr);
            return d.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric"
            });
        } catch (e) {
            return dateStr;
        }
    }

    function formatDateTime(dateTimeStr) {
        if (!dateTimeStr) return "--";
        try {
            const d = new Date(dateTimeStr);
            return d.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric"
            }) + " " + d.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit"
            });
        } catch (e) {
            return dateTimeStr;
        }
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

    /* ==========================================================================
       TOAST NOTIFICATIONS
       ========================================================================== */
    function showToast(message, type = "success") {
        const container = document.getElementById("cpToastContainer");
        if (!container) return;

        const toast = document.createElement("div");
        toast.className = `cp-toast ${type}`;
        const icon = type === "success" ? "fa-circle-check" : "fa-circle-exclamation";
        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateX(50px)";
            toast.style.transition = "all 0.3s ease";
            setTimeout(() => toast.remove(), 300);
        }, 3800);
    }

    /* ==========================================================================
       INITIALIZATION
       ========================================================================== */
    document.addEventListener("DOMContentLoaded", () => {
        if (!isClientLoggedIn()) {
            // Guest mode
            const guestActions = document.getElementById("guestHeaderActions");
            const clientActions = document.getElementById("clientHeaderActions");
            const clientWorkspace = document.getElementById("clientWorkspaceSection");
            if (guestActions) guestActions.style.display = "flex";
            if (clientActions) clientActions.style.display = "none";
            if (clientWorkspace) clientWorkspace.style.display = "none";
            return;
        }

        // Client is logged in!
        document.body.classList.add("client-logged-in");
        const guestActions = document.getElementById("guestHeaderActions");
        const clientActions = document.getElementById("clientHeaderActions");
        const clientWorkspace = document.getElementById("clientWorkspaceSection");
        const heroSection = document.querySelector(".hero");

        if (guestActions) guestActions.style.display = "none";
        if (clientActions) clientActions.style.display = "inline-flex";
        if (clientWorkspace) clientWorkspace.style.display = "none"; // Main interface remains intact
        if (heroSection) heroSection.style.display = ""; // Previous main interface hero is visible!

        // Load data from live database
        loadClientProfile();
        loadClientRequests();

        // Setup Event Listeners
        setupEventListeners();

        // Set minimum start date for request forms
        const today = new Date().toISOString().split("T")[0];
        const dateInput = document.getElementById("reqPreferredStartDate");
        if (dateInput) dateInput.min = today;
    });

    /* ==========================================================================
       CLIENT PROFILE - FETCH, UPDATE & DELETE (LIVE DATABASE)
       ========================================================================== */
    async function loadClientProfile() {
        try {
            const response = await fetch(PROFILE_API, {
                method: "GET",
                headers: getAuthHeaders()
            });

            if (response.status === 401 || response.status === 403) {
                clientLogout();
                return;
            }

            if (!response.ok) {
                throw new Error("Unable to retrieve profile from database.");
            }

            const profile = await response.json();
            currentProfile = profile;

            // Render Profile into Top-Right Header, Sidebar, and Modals
            updateProfileUI(profile);
        } catch (error) {
            console.error("Profile load error:", error);
            showToast("Failed to fetch client profile: " + error.message, "error");
        }
    }

    function getAvatarUrl(profilePicture, displayName) {
        if (profilePicture && typeof profilePicture === "string" && profilePicture.trim().length > 0) {
            return profilePicture;
        }
        const initial = (displayName || "Client").trim().charAt(0).toUpperCase() || "C";
        const colors = [
            ["#3b82f6", "#1d4ed8"],
            ["#8b5cf6", "#6d28d9"],
            ["#ec4899", "#be185d"],
            ["#f59e0b", "#d97706"],
            ["#10b981", "#047857"],
            ["#06b6d4", "#0e7490"]
        ];
        const code = initial.charCodeAt(0) % colors.length;
        const [c1, c2] = colors[code];
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <defs>
                <linearGradient id="g_${initial}_${code}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="${c1}" />
                    <stop offset="100%" stop-color="${c2}" />
                </linearGradient>
            </defs>
            <rect width="100" height="100" rx="50" fill="url(#g_${initial}_${code})" />
            <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="700" fill="#ffffff">${initial}</text>
        </svg>`;
        return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
    }

    function updateProfileUI(profile) {
        if (!profile) return;

        const initials = getInitials(profile.fullName || profile.username);
        const displayName = profile.fullName || profile.username || "Client";
        // Format display name
        const usernameOnly = profile.username || displayName;
        const avatarUrl = getAvatarUrl(profile.profilePicture, displayName);

        // Top-Right Header Profile (CourseWeb Layout)
        const hdrAvatar = document.getElementById("headerClientAvatar");
        const hdrAvatarImg = document.getElementById("headerClientAvatarImg");
        const hdrName = document.getElementById("headerClientName");
        const menuFullName = document.getElementById("menuClientFullName");
        const menuEmail = document.getElementById("menuClientEmail");

        if (hdrAvatar) hdrAvatar.textContent = initials;
        if (hdrAvatarImg) {
            hdrAvatarImg.src = avatarUrl;
            hdrAvatarImg.style.display = "block";
        }
        if (hdrName) hdrName.textContent = usernameOnly;
        if (menuFullName) menuFullName.textContent = displayName;
        if (menuEmail) menuEmail.textContent = profile.email || "";

        // Left Sidebar Profile Widget
        const sideAvatar = document.getElementById("sidebarClientAvatar");
        const sideName = document.getElementById("sidebarClientName");
        if (sideAvatar) sideAvatar.textContent = initials;
        if (sideName) sideName.textContent = displayName;

        // Workspace Greeting Card
        const greetAvatar = document.getElementById("greetingAvatar");
        const greetName = document.getElementById("greetingName");
        if (greetAvatar) greetAvatar.textContent = initials;
        if (greetName) greetName.textContent = displayName;

        // My Profile Modal - Live Database Details
        const modalAvatar = document.getElementById("profileModalAvatar");
        const modalFullName = document.getElementById("profileModalFullName");
        const modalUsername = document.getElementById("profileModalUsername");
        const dbId = document.getElementById("dbUserId");
        const dbFullName = document.getElementById("dbFullName");
        const dbUsername = document.getElementById("dbUsername");
        const dbEmail = document.getElementById("dbEmail");
        const dbPhone = document.getElementById("dbPhone");
        const dbRole = document.getElementById("dbRole");
        const dbCreatedAt = document.getElementById("dbCreatedAt");
        const dbUpdatedAt = document.getElementById("dbUpdatedAt");

        if (modalAvatar) modalAvatar.textContent = initials;
        if (modalFullName) modalFullName.textContent = displayName;
        if (modalUsername) modalUsername.textContent = "@" + (profile.username || "");
        if (dbId) dbId.textContent = "#" + (profile.id || "--");
        if (dbFullName) dbFullName.textContent = profile.fullName || "--";
        if (dbUsername) dbUsername.textContent = profile.username || "--";
        if (dbEmail) dbEmail.textContent = profile.email || "--";
        if (dbPhone) dbPhone.textContent = profile.phoneNumber || "Not provided";
        if (dbRole) dbRole.textContent = profile.role || "CLIENT";
        if (dbCreatedAt) dbCreatedAt.textContent = formatDateTime(profile.createdAt);
        if (dbUpdatedAt) dbUpdatedAt.textContent = formatDateTime(profile.updatedAt);

        // Edit Profile Form Fields
        const inputName = document.getElementById("editFullName");
        const inputUser = document.getElementById("editUsername");
        const inputEmail = document.getElementById("editEmail");
        const inputPhone = document.getElementById("editPhone");
        const inputPwd = document.getElementById("editPassword");

        if (inputName) inputName.value = profile.fullName || "";
        if (inputUser) inputUser.value = profile.username || "";
        if (inputEmail) inputEmail.value = profile.email || "";
        if (inputPhone) inputPhone.value = profile.phoneNumber || "";
        if (inputPwd) inputPwd.value = "";
    }

    async function handleProfileUpdate(e) {
        e.preventDefault();
        const saveBtn = document.getElementById("saveProfileBtn");
        const originalText = saveBtn ? saveBtn.innerHTML : "Save Profile";

        const fullName = document.getElementById("editFullName").value.trim();
        const username = document.getElementById("editUsername").value.trim();
        const email = document.getElementById("editEmail").value.trim();
        const phoneNumber = document.getElementById("editPhone").value.trim();
        const password = document.getElementById("editPassword").value;

        if (!fullName || !username || !email) {
            showToast("Full Name, Username, and Email are required.", "error");
            return;
        }

        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving to Database...`;
        }

        const payload = {
            fullName: fullName,
            username: username,
            email: email,
            phoneNumber: phoneNumber || null
        };

        if (password && password.trim().length >= 8) {
            payload.password = password.trim();
        }

        try {
            const response = await fetch(PROFILE_API, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(data?.message || data?.error || "Failed to update profile.");
            }

            // Update token if new token returned (in case username changed)
            if (data?.token) {
                localStorage.setItem("wbcms_token", data.token);
            }

            const updatedProfile = data?.profile || data;
            if (updatedProfile?.username) {
                localStorage.setItem("wbcms_username", updatedProfile.username);
            }
            if (updatedProfile?.fullName) {
                localStorage.setItem("wbcms_full_name", updatedProfile.fullName);
            }

            currentProfile = updatedProfile;
            updateProfileUI(updatedProfile);

            showToast("Your profile was successfully updated in the database!");
            closeModal("clientProfileModal");
        } catch (error) {
            console.error("Profile update error:", error);
            showToast(error.message, "error");
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
            }
        }
    }

    async function handleProfileDelete() {
        const confirmBtn = document.getElementById("confirmDeleteProfileBtn");
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Deleting Profile...`;
        }

        try {
            const response = await fetch(PROFILE_API, {
                method: "DELETE",
                headers: getAuthHeaders()
            });

            if (!response.ok && response.status !== 204) {
                const data = await response.json().catch(() => null);
                throw new Error(data?.message || "Failed to delete profile from database.");
            }

            closeModal("deleteProfileConfirmModal");
            closeModal("clientProfileModal");

            showToast("Your profile has been permanently deleted from the database.");

            // Clear session and return to guest landing
            setTimeout(() => {
                clientLogout();
            }, 1200);
        } catch (error) {
            console.error("Delete profile error:", error);
            showToast(error.message, "error");
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = `Yes, Delete My Profile`;
            }
        }
    }

    /* ==========================================================================
       CLIENT PROJECT REQUESTS - CRUD (LIVE DATABASE)
       ========================================================================== */
    async function loadClientRequests() {
        try {
            const response = await fetch(REQUESTS_API, {
                method: "GET",
                headers: getAuthHeaders()
            });

            if (response.status === 401 || response.status === 403) {
                clientLogout();
                return;
            }

            if (!response.ok) {
                throw new Error("Unable to retrieve project requests from database.");
            }

            const requests = await response.json().catch(() => []);
            allRequests = Array.isArray(requests) ? requests : [];

            renderRequestStats(allRequests);
            renderRequestTable(allRequests);
        } catch (error) {
            console.error("Requests load error:", error);
            showToast("Failed to load project requests: " + error.message, "error");
        }
    }

    function renderRequestStats(requests) {
        const total = requests.length;
        const pending = requests.filter(r => r.status === "PENDING").length;
        const approved = requests.filter(r => r.status === "APPROVED").length;
        const rejected = requests.filter(r => r.status === "REJECTED").length;

        const statTotal = document.getElementById("statTotalRequests");
        const statPending = document.getElementById("statPendingRequests");
        const statApproved = document.getElementById("statApprovedRequests");
        const statRejected = document.getElementById("statRejectedRequests");
        const sideBadge = document.getElementById("sidebarRequestBadge");

        if (statTotal) statTotal.textContent = total;
        if (statPending) statPending.textContent = pending;
        if (statApproved) statApproved.textContent = approved;
        if (statRejected) statRejected.textContent = rejected;
        if (sideBadge) sideBadge.textContent = total;
        const cwBadge = document.getElementById("cwNotifBadge");
        if (cwBadge) cwBadge.textContent = total > 0 ? total : "1";
    }

    function renderRequestTable(requests) {
        const tbody = document.getElementById("cpRequestsTableBody");
        const emptyState = document.getElementById("cpRequestsEmptyState");
        const tableCard = document.getElementById("cpRequestsTableCard");

        if (!tbody) return;
        tbody.innerHTML = "";

        // Apply Status Filter & Search
        const searchInput = document.getElementById("requestSearchInput");
        const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

        const filtered = requests.filter(req => {
            const matchesStatus = (activeFilter === "ALL") || (req.status === activeFilter);
            const matchesQuery = !query ||
                (req.projectName && req.projectName.toLowerCase().includes(query)) ||
                (req.projectType && req.projectType.toLowerCase().includes(query)) ||
                (req.location && req.location.toLowerCase().includes(query));
            return matchesStatus && matchesQuery;
        });

        if (filtered.length === 0) {
            if (emptyState) emptyState.style.display = "block";
            return;
        }

        if (emptyState) emptyState.style.display = "none";

        filtered.forEach(req => {
            const tr = document.createElement("tr");

            const isPending = req.status === "PENDING";

            tr.innerHTML = `
                <td>
                    <div class="project-title-cell">
                        <strong>${escapeHtml(req.projectName)}</strong>
                        <span>ID: #${req.id} • ${formatDate(req.createdAt)}</span>
                    </div>
                </td>
                <td>
                    <span style="font-weight: 500;">${escapeHtml(req.projectType)}</span>
                </td>
                <td>
                    <i class="fa-solid fa-location-dot" style="color:#ff6a1a; margin-right:4px;"></i>
                    ${escapeHtml(req.location)}
                </td>
                <td>
                    <strong style="color:#60a5fa;">${formatLKR(req.estimatedBudget)}</strong>
                </td>
                <td>
                    ${formatDate(req.preferredStartDate)}
                </td>
                <td>
                    <span class="badge-status ${req.status}">${req.status}</span>
                </td>
                <td>
                    <div class="cp-actions-cell">
                        <button type="button" class="cp-act-btn" title="View Inspection Details" onclick="window.ClientPortal.viewRequest(${req.id})">
                            <i class="fa-solid fa-eye"></i>
                        </button>
                        ${isPending ? `
                            <button type="button" class="cp-act-btn" title="Edit Request" onclick="window.ClientPortal.editRequest(${req.id})">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button type="button" class="cp-act-btn delete" title="Delete Request" onclick="window.ClientPortal.confirmDeleteRequest(${req.id})">
                                <i class="fa-solid fa-trash-can"></i>
                            </button>
                        ` : `
                            <span style="font-size:11px; color:#64748b; padding-right:6px;">Locked</span>
                        `}
                    </div>
                </td>
            `;

            tbody.appendChild(tr);
        });
    }

    async function handleRequestFormSubmit(e) {
        e.preventDefault();
        const submitBtn = document.getElementById("saveRequestSubmitBtn");
        const originalText = submitBtn ? submitBtn.innerHTML : "Save Request";

        const projectName = document.getElementById("reqProjectName").value.trim();
        const projectType = document.getElementById("reqProjectType").value.trim();
        const location = document.getElementById("reqLocation").value.trim();
        const estimatedBudget = document.getElementById("reqEstimatedBudget").value;
        const preferredStartDate = document.getElementById("reqPreferredStartDate").value;
        const description = document.getElementById("reqDescription").value.trim();

        if (!projectName || !projectType || !location || !estimatedBudget || !preferredStartDate || !description) {
            showToast("Please fill in all required fields.", "error");
            return;
        }

        const payload = {
            projectName: projectName,
            projectType: projectType,
            location: location,
            estimatedBudget: parseFloat(estimatedBudget),
            preferredStartDate: preferredStartDate,
            description: description
        };

        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Saving to Database...`;
        }

        try {
            const url = editingRequestId ? `${REQUESTS_API}/${editingRequestId}` : REQUESTS_API;
            const method = editingRequestId ? "PUT" : "POST";

            const response = await fetch(url, {
                method: method,
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                throw new Error(data?.message || data?.error || "Failed to save project request.");
            }

            showToast(editingRequestId ? "Project request updated successfully in database!" : "Project request created successfully in database!");
            closeModal("projectRequestFormModal");
            loadClientRequests();
        } catch (error) {
            console.error("Save request error:", error);
            showToast(error.message, "error");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalText;
            }
        }
    }

    async function handleDeleteRequest() {
        if (!deletingRequestId) return;
        const confirmBtn = document.getElementById("confirmDeleteRequestBtn");
        if (confirmBtn) {
            confirmBtn.disabled = true;
            confirmBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Deleting...`;
        }

        try {
            const response = await fetch(`${REQUESTS_API}/${deletingRequestId}`, {
                method: "DELETE",
                headers: getAuthHeaders()
            });

            if (!response.ok && response.status !== 204) {
                const data = await response.json().catch(() => null);
                throw new Error(data?.message || "Failed to delete project request.");
            }

            showToast("Project request deleted successfully from database.");
            closeModal("deleteRequestConfirmModal");
            deletingRequestId = null;
            loadClientRequests();
        } catch (error) {
            console.error("Delete request error:", error);
            showToast(error.message, "error");
        } finally {
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = `Yes, Delete Request`;
            }
        }
    }

    /* ==========================================================================
       MODAL CONTROLS & EVENT SETUP
       ========================================================================== */
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add("show");
            document.body.style.overflow = "hidden";
        }
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove("show");
            document.body.style.overflow = "";
        }
    }

    function setupEventListeners() {
        // Top-right Profile Dropdown Toggle
        const profileBox = document.getElementById("headerProfileBox");
        const profileDropdown = document.getElementById("clientProfileDropdown");

        if (profileBox && profileDropdown) {
            profileBox.addEventListener("click", (e) => {
                e.stopPropagation();
                profileDropdown.classList.toggle("open");
            });

            document.addEventListener("click", (e) => {
                if (!profileDropdown.contains(e.target)) {
                    profileDropdown.classList.remove("open");
                }
            });
        }

        // Left Sidebar Toggles
        const sidebar = document.getElementById("clientSidebar");
        const sidebarOverlay = document.getElementById("clientSidebarOverlay");
        const toggleBtn = document.getElementById("clientSidebarToggleBtn");
        const closeBtn = document.getElementById("sidebarCloseBtn");

        function openSidebar() {
            if (sidebar) sidebar.classList.add("open");
            if (sidebarOverlay) sidebarOverlay.classList.add("show");
        }

        function closeSidebar() {
            if (sidebar) sidebar.classList.remove("open");
            if (sidebarOverlay) sidebarOverlay.classList.remove("show");
        }

        if (toggleBtn) toggleBtn.addEventListener("click", openSidebar);
        if (closeBtn) closeBtn.addEventListener("click", closeSidebar);
        if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeSidebar);

        // Sidebar Navigation Links
        const navRequests = document.getElementById("sidebarNavRequests");
        const navProfile = document.getElementById("sidebarNavProfile");
        const navOverview = document.getElementById("sidebarNavOverview");

        if (navRequests) {
            navRequests.addEventListener("click", () => {
                closeSidebar();
                scrollToWorkspace();
            });
        }

        if (navProfile) {
            navProfile.addEventListener("click", () => {
                closeSidebar();
                window.ClientPortal.openMyProfile();
            });
        }

        if (navOverview) {
            navOverview.addEventListener("click", () => {
                closeSidebar();
                const featuresSection = document.getElementById("features");
                if (featuresSection) featuresSection.scrollIntoView({ behavior: "smooth" });
            });
        }

        // Search Input
        const searchInput = document.getElementById("requestSearchInput");
        if (searchInput) {
            searchInput.addEventListener("input", () => {
                renderRequestTable(allRequests);
            });
        }

        // Status Filter Pills
        const filterPills = document.querySelectorAll(".filter-pill");
        filterPills.forEach(pill => {
            pill.addEventListener("click", () => {
                filterPills.forEach(p => p.classList.remove("active"));
                pill.classList.add("active");
                activeFilter = pill.dataset.filter || "ALL";
                renderRequestTable(allRequests);
            });
        });

        // Profile Form Submit
        const profileForm = document.getElementById("clientProfileForm");
        if (profileForm) {
            profileForm.addEventListener("submit", handleProfileUpdate);
        }

        // Profile Delete Trigger & Confirmation
        const triggerDeleteProfileBtn = document.getElementById("triggerDeleteProfileBtn");
        if (triggerDeleteProfileBtn) {
            triggerDeleteProfileBtn.addEventListener("click", () => {
                openModal("deleteProfileConfirmModal");
            });
        }

        const confirmDeleteProfileBtn = document.getElementById("confirmDeleteProfileBtn");
        if (confirmDeleteProfileBtn) {
            confirmDeleteProfileBtn.addEventListener("click", handleProfileDelete);
        }

        // Request Form Submit
        const requestForm = document.getElementById("projectRequestForm");
        if (requestForm) {
            requestForm.addEventListener("submit", handleRequestFormSubmit);
        }

        // Request Delete Confirmation
        const confirmDeleteRequestBtn = document.getElementById("confirmDeleteRequestBtn");
        if (confirmDeleteRequestBtn) {
            confirmDeleteRequestBtn.addEventListener("click", handleDeleteRequest);
        }

        // Close on clicking backdrop
        document.querySelectorAll(".cp-modal-backdrop").forEach(backdrop => {
            backdrop.addEventListener("click", (e) => {
                if (e.target === backdrop) {
                    backdrop.classList.remove("show");
                    document.body.style.overflow = "";
                }
            });
        });
    }

    function scrollToWorkspace() {
        const ws = document.getElementById("clientWorkspaceSection");
        if (ws) {
            ws.scrollIntoView({ behavior: "smooth" });
        }
    }

    function clientLogout() {
        if (!confirm("Are you sure you want to log out?")) {
            return;
        }
        localStorage.removeItem("wbcms_token");
        localStorage.removeItem("wbcms_user_id");
        localStorage.removeItem("wbcms_username");
        localStorage.removeItem("wbcms_role");
        localStorage.removeItem("wbcms_user_type");
        localStorage.removeItem("wbcms_full_name");
        window.location.replace("/index.html");
    }

    /* ==========================================================================
       PUBLIC API EXPOSED ON WINDOW
       ========================================================================== */
    window.ClientPortal = {
        openMyProfile: function () {
            if (!currentProfile) {
                loadClientProfile();
            } else {
                updateProfileUI(currentProfile);
            }
            openModal("clientProfileModal");
        },

        openNewRequestModal: function () {
            editingRequestId = null;
            const title = document.getElementById("reqModalTitle");
            const submitBtn = document.getElementById("saveRequestSubmitBtn");
            const form = document.getElementById("projectRequestForm");

            if (title) title.innerHTML = `<i class="fa-solid fa-plus-circle" style="color:#ff6a1a;"></i> Create New Project Request`;
            if (submitBtn) submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> Submit Request to Database`;
            if (form) form.reset();

            // Set default date to 7 days from now
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 7);
            const dateStr = futureDate.toISOString().split("T")[0];
            const dateInput = document.getElementById("reqPreferredStartDate");
            if (dateInput) dateInput.value = dateStr;

            openModal("projectRequestFormModal");
        },

        editRequest: function (id) {
            const req = allRequests.find(r => r.id === id);
            if (!req) return;

            editingRequestId = id;
            const title = document.getElementById("reqModalTitle");
            const submitBtn = document.getElementById("saveRequestSubmitBtn");

            if (title) title.innerHTML = `<i class="fa-solid fa-pen" style="color:#3b82f6;"></i> Edit Project Request (#${id})`;
            if (submitBtn) submitBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Update Changes in Database`;

            document.getElementById("reqProjectName").value = req.projectName || "";
            document.getElementById("reqProjectType").value = req.projectType || "Residential Construction";
            document.getElementById("reqLocation").value = req.location || "";
            document.getElementById("reqEstimatedBudget").value = req.estimatedBudget || "";
            document.getElementById("reqPreferredStartDate").value = req.preferredStartDate || "";
            document.getElementById("reqDescription").value = req.description || "";

            openModal("projectRequestFormModal");
        },

        viewRequest: function (id) {
            const req = allRequests.find(r => r.id === id);
            if (!req) return;

            document.getElementById("viewReqName").textContent = req.projectName || "--";
            document.getElementById("viewReqStatus").className = `badge-status ${req.status}`;
            document.getElementById("viewReqStatus").textContent = req.status;

            document.getElementById("viewReqType").textContent = req.projectType || "--";
            document.getElementById("viewReqLocation").textContent = req.location || "--";
            document.getElementById("viewReqBudget").textContent = formatLKR(req.estimatedBudget);
            document.getElementById("viewReqDate").textContent = formatDate(req.preferredStartDate);
            document.getElementById("viewReqCreated").textContent = formatDateTime(req.createdAt);
            document.getElementById("viewReqUpdated").textContent = formatDateTime(req.updatedAt);
            document.getElementById("viewReqDesc").textContent = req.description || "No description provided.";

            const editBtn = document.getElementById("viewModalEditBtn");
            if (editBtn) {
                if (req.status === "PENDING") {
                    editBtn.style.display = "inline-flex";
                    editBtn.onclick = () => {
                        closeModal("viewRequestModal");
                        window.ClientPortal.editRequest(req.id);
                    };
                } else {
                    editBtn.style.display = "none";
                }
            }

            openModal("viewRequestModal");
        },

        confirmDeleteRequest: function (id) {
            deletingRequestId = id;
            const req = allRequests.find(r => r.id === id);
            const nameEl = document.getElementById("deleteRequestProjectName");
            if (nameEl) nameEl.textContent = req ? `"${req.projectName}"` : "this project request";
            openModal("deleteRequestConfirmModal");
        },

        closeModal: closeModal,
        logout: clientLogout,
        scrollToWorkspace: scrollToWorkspace
    };
})();
