/**
 * WBCMS Profile Management & Status Handler
 * Matches Google Stitch UI design and Spring Boot REST API
 */

(function () {
    const token = localStorage.getItem("wbcms_token");
    let currentUser = JSON.parse(localStorage.getItem("wbcms_user") || "{}");

    // Initialize once DOM is ready
    document.addEventListener("DOMContentLoaded", () => {
        setupProfileWidget();
        if (token && currentUser && currentUser.id) {
            fetchFreshUserData(currentUser.id);
        }
    });

    /**
     * Set up UI labels in Top-Right Status Widget and Sidebar
     */
    function setupProfileWidget() {
        const topUser = document.getElementById("topUser");
        const topRole = document.getElementById("topRole");
        const topAvatar = document.getElementById("topAvatar");
        const sidebarUser = document.getElementById("sidebarUsername");
        const sidebarRole = document.getElementById("sidebarRole");
        const sidebarAvatar = document.getElementById("userAvatar");

        const displayName = currentUser.fullName || currentUser.username || "Client User";
        const displayRole = currentUser.role || "CLIENT";
        const initial = displayName.charAt(0).toUpperCase();

        if (topUser) topUser.textContent = displayName;
        if (topRole) topRole.textContent = displayRole;
        if (topAvatar) topAvatar.textContent = initial;

        if (sidebarUser) sidebarUser.textContent = displayName;
        if (sidebarRole) sidebarRole.textContent = displayRole;
        if (sidebarAvatar) sidebarAvatar.textContent = initial;
    }

    /**
     * Fetch latest user record from MySQL via GET /api/users/{id}
     */
    async function fetchFreshUserData(userId) {
        try {
            const response = await fetch(`/api/users/${userId}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (response.ok) {
                const fresh = await response.json();
                currentUser = {
                    ...currentUser,
                    id: fresh.id,
                    username: fresh.username,
                    fullName: fresh.fullName,
                    email: fresh.email,
                    phoneNumber: fresh.phoneNumber,
                    role: fresh.role,
                    createdAt: fresh.createdAt
                };
                localStorage.setItem("wbcms_user", JSON.stringify(currentUser));
                setupProfileWidget();
            }
        } catch (err) {
            console.warn("Could not sync latest user data:", err);
        }
    }

    /**
     * Open Profile Status & Management Modal
     */
    window.openProfileModal = function () {
        const modal = document.getElementById("profileModal");
        if (!modal) return;

        // Populate fields
        document.getElementById("modalProfileName").textContent = currentUser.fullName || currentUser.username || "Client User";
        document.getElementById("modalProfileUsername").textContent = "@" + (currentUser.username || "user");
        document.getElementById("modalProfileRoleBadge").textContent = currentUser.role || "CLIENT";
        document.getElementById("modalProfileAvatar").textContent = (currentUser.fullName || currentUser.username || "U").charAt(0).toUpperCase();

        document.getElementById("profileFullName").value = currentUser.fullName || "";
        document.getElementById("profileUsername").value = currentUser.username || "";
        document.getElementById("profileEmail").value = currentUser.email || "";
        document.getElementById("profilePhone").value = currentUser.phoneNumber || "";
        document.getElementById("profilePassword").value = ""; // Clear password field

        if (document.getElementById("profileCreatedDate") && currentUser.createdAt) {
            const dateStr = new Date(currentUser.createdAt).toLocaleDateString("en-US", {
                year: 'numeric', month: 'short', day: 'numeric'
            });
            document.getElementById("profileCreatedDate").textContent = dateStr;
        }

        // Hide any previous alerts
        hideProfileAlerts();

        modal.classList.add("show");
        document.body.style.overflow = "hidden";
    };

    /**
     * Close Profile Modal
     */
    window.closeProfileModal = function () {
        const modal = document.getElementById("profileModal");
        if (modal) {
            modal.classList.remove("show");
            document.body.style.overflow = "";
        }
    };

    /**
     * Save / Update Profile via PUT /api/users/{id}
     */
    window.handleProfileUpdate = async function (event) {
        if (event) event.preventDefault();

        const errorEl = document.getElementById("profileErrorMsg");
        const successEl = document.getElementById("profileSuccessMsg");
        const saveBtn = document.getElementById("profileSaveBtn");

        hideProfileAlerts();

        const fullName = document.getElementById("profileFullName").value.trim();
        const username = document.getElementById("profileUsername").value.trim();
        const email = document.getElementById("profileEmail").value.trim();
        const phoneNumber = document.getElementById("profilePhone").value.trim();
        const password = document.getElementById("profilePassword").value;

        if (!fullName || !username || !email) {
            showProfileError("Full Name, Username, and Email are required fields.");
            return;
        }

        if (password && password.length < 8) {
            showProfileError("New password must be at least 8 characters long.");
            return;
        }

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving to Database...';

        const userId = currentUser.id;

        try {
            const updatePayload = {
                username: username,
                email: email,
                fullName: fullName,
                phoneNumber: phoneNumber,
                role: currentUser.role || "CLIENT"
            };

            // Only send password if user entered a new one
            if (password && password.trim().length > 0) {
                updatePayload.password = password;
            }

            const response = await fetch(`/api/users/${userId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(updatePayload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || "Failed to update profile in database.");
            }

            // Update cached user
            currentUser = {
                ...currentUser,
                username: data.username,
                fullName: data.fullName,
                email: data.email,
                phoneNumber: data.phoneNumber,
                role: data.role
            };
            localStorage.setItem("wbcms_user", JSON.stringify(currentUser));

            // Refresh UI in topbar & modal
            setupProfileWidget();
            document.getElementById("modalProfileName").textContent = data.fullName;
            document.getElementById("modalProfileUsername").textContent = "@" + data.username;

            showProfileSuccess("Profile updated successfully in the database!");

            setTimeout(() => {
                closeProfileModal();
            }, 1200);

        } catch (err) {
            showProfileError(err.message || "An error occurred while updating profile.");
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save Profile Changes';
        }
    };

    /**
     * Trigger Delete Profile Confirmation Modal
     */
    window.confirmDeleteProfile = function () {
        const deleteConfirmModal = document.getElementById("deleteProfileConfirmModal");
        if (deleteConfirmModal) {
            deleteConfirmModal.classList.add("show");
        }
    };

    window.closeDeleteConfirmModal = function () {
        const deleteConfirmModal = document.getElementById("deleteProfileConfirmModal");
        if (deleteConfirmModal) {
            deleteConfirmModal.classList.remove("show");
        }
    };

    /**
     * Execute Profile Deletion via DELETE /api/users/{id}
     */
    window.executeDeleteProfile = async function () {
        const deleteBtn = document.getElementById("confirmDeleteBtn");
        const userId = currentUser.id;

        if (!userId) {
            alert("User ID not found. Please log in again.");
            return;
        }

        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting from Database...';

        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.message || data.error || "Failed to delete profile from database.");
            }

            // Clear session and redirect to landing page
            localStorage.removeItem("wbcms_token");
            localStorage.removeItem("wbcms_user");

            window.location.href = "/index.html?profileDeleted=true";

        } catch (err) {
            alert("Delete failed: " + err.message);
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i> Yes, Permanently Delete';
        }
    };

    function showProfileError(msg) {
        const errorEl = document.getElementById("profileErrorMsg");
        if (errorEl) {
            errorEl.textContent = msg;
            errorEl.style.display = "flex";
        }
    }

    function showProfileSuccess(msg) {
        const successEl = document.getElementById("profileSuccessMsg");
        if (successEl) {
            successEl.textContent = msg;
            successEl.style.display = "flex";
        }
    }

    function hideProfileAlerts() {
        const errorEl = document.getElementById("profileErrorMsg");
        const successEl = document.getElementById("profileSuccessMsg");
        if (errorEl) errorEl.style.display = "none";
        if (successEl) successEl.style.display = "none";
    }

    // Global logout helper
    window.logout = function () {
        localStorage.removeItem("wbcms_token");
        localStorage.removeItem("wbcms_user");
        window.location.href = "/index.html";
    };

})();
