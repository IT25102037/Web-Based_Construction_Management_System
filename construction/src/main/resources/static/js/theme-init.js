/* =========================================================
   WBCMS - THEME & SYSTEM INITIALIZER
   - Fast Light/Dark theme switching (Default: Light Mode)
   - Universal Logout Confirmation Modal ("Are you sure you want to logout?")
   - Works across all WBCMS pages without breaking any functionality
========================================================= */

(function() {
    try {
        const savedTheme = localStorage.getItem("wbcms_theme") || "light";
        if (savedTheme === "dark") {
            document.documentElement.setAttribute("data-theme", "dark");
            if (document.body) {
                document.body.classList.remove("theme-light");
                document.body.classList.add("theme-dark");
            } else {
                window.addEventListener("DOMContentLoaded", function() {
                    document.body.classList.remove("theme-light");
                    document.body.classList.add("theme-dark");
                });
            }
        } else {
            document.documentElement.setAttribute("data-theme", "light");
            if (document.body) {
                document.body.classList.remove("theme-dark");
                document.body.classList.add("theme-light");
            } else {
                window.addEventListener("DOMContentLoaded", function() {
                    document.body.classList.remove("theme-dark");
                    document.body.classList.add("theme-light");
                });
            }
        }
    } catch (e) {
        console.warn("Theme init error:", e);
    }
})();

function applyThemeGlobal(theme) {
    const targetTheme = (theme === "dark") ? "dark" : "light";
    localStorage.setItem("wbcms_theme", targetTheme);
    document.documentElement.setAttribute("data-theme", targetTheme);
    
    if (targetTheme === "dark") {
        document.body.classList.remove("theme-light");
        document.body.classList.add("theme-dark");
    } else {
        document.body.classList.remove("theme-dark");
        document.body.classList.add("theme-light");
    }
    
    // Dispatch event in case page components need to update charts
    window.dispatchEvent(new CustomEvent("wbcms-theme-change", { detail: { theme: targetTheme } }));
}

/* =========================================================
   UNIVERSAL LOGOUT CONFIRMATION MODAL SYSTEM
========================================================= */
function initLogoutModal() {
    if (document.getElementById("wbcmsLogoutConfirmModal")) return;

    const modalHtml = `
    <div id="wbcmsLogoutConfirmModal" class="wbcms-logout-modal-overlay" style="display:none;" role="dialog" aria-modal="true" aria-labelledby="wbcmsLogoutTitle">
        <div class="wbcms-logout-modal-box">
            <div class="wbcms-logout-icon-wrap">
                <i class="bi bi-box-arrow-right"></i>
            </div>
            <h3 id="wbcmsLogoutTitle" class="wbcms-logout-title">Sign Out Confirmation</h3>
            <p class="wbcms-logout-message">Are you sure you want to logout?</p>
            <p class="wbcms-logout-sub">You will need to sign in again to access the WBCMS construction management portal.</p>
            <div class="wbcms-logout-actions">
                <button type="button" id="wbcmsLogoutCancelBtn" class="wbcms-logout-btn cancel" onclick="closeLogoutConfirmModal()">
                    <i class="bi bi-x-circle"></i> No
                </button>
                <button type="button" id="wbcmsLogoutConfirmBtn" class="wbcms-logout-btn confirm" onclick="executeLogoutAction()">
                    <i class="bi bi-check-circle-fill"></i> Yes
                </button>
            </div>
        </div>
    </div>
    `;

    const div = document.createElement("div");
    div.innerHTML = modalHtml;
    document.body.appendChild(div.firstElementChild);

    // Close on escape key
    document.addEventListener("keydown", function(e) {
        if (e.key === "Escape") {
            const modal = document.getElementById("wbcmsLogoutConfirmModal");
            if (modal && modal.style.display !== "none") {
                closeLogoutConfirmModal();
            }
        }
    });

    // Close on overlay background click
    const modalEl = document.getElementById("wbcmsLogoutConfirmModal");
    if (modalEl) {
        modalEl.addEventListener("click", function(e) {
            if (e.target === modalEl) {
                closeLogoutConfirmModal();
            }
        });
    }
}

function openLogoutConfirmModal() {
    initLogoutModal();
    const modal = document.getElementById("wbcmsLogoutConfirmModal");
    if (modal) {
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
        const cancelBtn = document.getElementById("wbcmsLogoutCancelBtn");
        if (cancelBtn) cancelBtn.focus();
    }
}

function closeLogoutConfirmModal() {
    const modal = document.getElementById("wbcmsLogoutConfirmModal");
    if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "";
    }
}

function executeLogoutAction() {
    const token = localStorage.getItem("wbcms_token");
    if (token) {
        fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token }
        }).catch(() => {});
    }

    const userType = localStorage.getItem("wbcms_user_type") || "";
    const isClient = userType.toUpperCase() === "CLIENT" || window.location.pathname.includes("client-");

    const keys = [
        "wbcms_token", "wbcms_user_id", "wbcms_username",
        "wbcms_role", "wbcms_user_type", "wbcms_full_name", "wbcms_user"
    ];
    keys.forEach(k => localStorage.removeItem(k));

    if (isClient) {
        window.location.replace("/client-login.html");
    } else {
        window.location.replace("/staff-login.html");
    }
}

// Universal alias - when any page script calls logout(), show confirmation modal
window.showLogoutConfirmation = openLogoutConfirmModal;
window.logout = function() {
    openLogoutConfirmModal();
};

window.addEventListener("load", function() {
    window.logout = function() {
        openLogoutConfirmModal();
    };
});

document.addEventListener("DOMContentLoaded", function() {
    initLogoutModal();

    // Auto-bind any button with logout-button, logout, btn-logout, or onclick="logout()"
    document.querySelectorAll(".logout-button, .logout-btn, button.logout, a.logout, [onclick*='logout()']").forEach(btn => {
        btn.addEventListener("click", function(e) {
            e.preventDefault();
            e.stopPropagation();
            openLogoutConfirmModal();
        }, true);
    });

    // Auto-close profile dropdown when clicking outside
    document.addEventListener("click", function(e) {
        if (!e.target.closest(".profile") && !e.target.closest(".profile-box") && !e.target.closest(".profile-menu") && !e.target.closest(".user-pill")) {
            document.querySelectorAll(".profile.open, .profile-box.open, .profile-menu.open, .user-pill.open").forEach(p => {
                p.classList.remove("open");
            });
        }
    });

    // Universal User Profile Header Populator
    initUserProfileHeader();
});

function initUserProfileHeader() {
    try {
        const username = localStorage.getItem("wbcms_username") || "User";
        const fullName = localStorage.getItem("wbcms_full_name") || username;
        const role = localStorage.getItem("wbcms_role") || "STAFF";

        function getInitials(name) {
            if (!name) return "US";
            const parts = name.trim().split(/\s+/);
            if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }

        function formatRole(val) {
            if (!val) return "Staff";
            return val.replace(/^ROLE_/, "").replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
        }

        const pName = document.getElementById("profileName");
        if (pName && (!pName.textContent || pName.textContent === "User" || pName.textContent === "Staff User" || pName.textContent === "Supervisor")) {
            pName.textContent = fullName;
        }

        const dName = document.getElementById("dropdownUserName");
        if (dName && (!dName.textContent || dName.textContent === "User" || dName.textContent === "Staff User" || dName.textContent === "Supervisor")) {
            dName.textContent = fullName;
        }

        const pRole = document.getElementById("profileRole");
        if (pRole && (!pRole.textContent || pRole.textContent === "Staff" || pRole.textContent === "Construction Supervisor")) {
            pRole.textContent = formatRole(role);
        }

        const avatars = document.querySelectorAll("#headerAvatar, #avatarBadge, #avatarInitials");
        avatars.forEach(av => {
            if (av && !av.querySelector("img") && av.textContent.trim().length <= 3) {
                av.textContent = getInitials(fullName);
            }
        });
    } catch (e) {
        // Non-intrusive fallback
    }
}

/* =========================================================
   UNIVERSAL GLOBAL TOAST NOTIFICATION API
========================================================= */
window.showToast = function(message, typeOrIsError = "success") {
    try {
        const isError = (typeOrIsError === true || typeOrIsError === "error" || typeOrIsError === "danger");

        let toast = document.getElementById("toast") || document.querySelector(".toast") || document.getElementById("wbcmsGlobalToast");
        if (!toast) {
            toast = document.createElement("div");
            toast.id = "wbcmsGlobalToast";
            toast.className = "toast";
            toast.innerHTML = `<i class="bi bi-check-circle-fill"></i><span id="toastMessage"></span>`;
            document.body.appendChild(toast);
        }

        let icon = toast.querySelector("i");
        if (icon) {
            icon.className = isError ? "bi bi-exclamation-triangle-fill" : "bi bi-check-circle-fill";
        }

        let msgEl = toast.querySelector("#toastMessage") || toast.querySelector("span");
        if (msgEl) {
            msgEl.textContent = message;
        } else {
            toast.textContent = message;
        }

        toast.classList.remove("error", "show");
        if (isError) {
            toast.classList.add("error");
        }

        requestAnimationFrame(() => {
            toast.classList.add("show");
        });

        if (window._wbcmsToastTimeout) {
            clearTimeout(window._wbcmsToastTimeout);
        }
        window._wbcmsToastTimeout = setTimeout(() => {
            toast.classList.remove("show");
        }, 3800);
    } catch (e) {
        console.log("Toast:", message);
    }
};

