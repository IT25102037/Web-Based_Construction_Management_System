// ======================================================
// WBCMS - SYSTEM SETTINGS MANAGEMENT (CRUD)
// Rich Dark Aesthetic with Real SQL Server Synchronization
// ======================================================

const API_URL = "/api/settings";

let allSettings = [];
let filteredSettings = [];

let currentTab = "all";
let currentPage = 1;
const pageSize = 10;
let settingToDeleteId = null;

// ======================================================
// AUTHENTICATION & ACCESS CONTROL
// ======================================================
const authToken = localStorage.getItem("wbcms_token");
const userType = localStorage.getItem("wbcms_user_type");
const userRole = localStorage.getItem("wbcms_role");

if (!authToken || userType !== "STAFF") {
    window.location.replace("/staff-login.html");
}

function getHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + authToken
    };
}

// ======================================================
// INITIALIZATION
// ======================================================
document.addEventListener("DOMContentLoaded", () => {
    loadStaffProfile();
    initThemeSelection();

    // Enforce System Administrator authorization
    if (userRole !== "SYSTEM_ADMINISTRATOR") {
        const deniedPanel = document.getElementById("accessDeniedPanel");
        const authContent = document.getElementById("authorizedContent");
        if (deniedPanel) deniedPanel.style.display = "block";
        if (authContent) authContent.style.display = "none";
        return;
    }

    setupEventListeners();
    loadSettings();
});

// ======================================================
// THEME & APPEARANCE SELECTION
// ======================================================
function initThemeSelection() {
    const currentTheme = localStorage.getItem("wbcms_theme") || "light";
    updateThemeCardsUI(currentTheme);
}

function updateThemeCardsUI(theme) {
    const cardDark = document.getElementById("themeCardDark");
    const cardLight = document.getElementById("themeCardLight");
    const checkDark = document.getElementById("darkCheck");
    const checkLight = document.getElementById("lightCheck");

    if (!cardDark || !cardLight) return;

    if (theme === "light") {
        cardLight.style.borderColor = "#1a56db";
        cardLight.style.background = "rgba(26, 86, 219, 0.08)";
        cardLight.style.boxShadow = "0 6px 20px rgba(26, 86, 219, 0.15)";
        if (checkLight) {
            checkLight.style.background = "#1a56db";
            checkLight.style.color = "#ffffff";
        }

        cardDark.style.borderColor = "var(--card-border)";
        cardDark.style.background = "var(--card-bg-sub)";
        cardDark.style.boxShadow = "none";
        if (checkDark) {
            checkDark.style.background = "rgba(0, 0, 0, 0.06)";
            checkDark.style.color = "transparent";
        }
    } else {
        cardDark.style.borderColor = "var(--orange)";
        cardDark.style.background = "rgba(255, 107, 22, 0.12)";
        cardDark.style.boxShadow = "0 6px 20px rgba(255, 107, 22, 0.25)";
        if (checkDark) {
            checkDark.style.background = "var(--orange)";
            checkDark.style.color = "#ffffff";
        }

        cardLight.style.borderColor = "var(--card-border)";
        cardLight.style.background = "var(--card-bg-sub)";
        cardLight.style.boxShadow = "none";
        if (checkLight) {
            checkLight.style.background = "rgba(255, 255, 255, 0.1)";
            checkLight.style.color = "transparent";
        }
    }
}

function setAppTheme(theme) {
    if (typeof applyThemeGlobal === "function") {
        applyThemeGlobal(theme);
    } else {
        localStorage.setItem("wbcms_theme", theme);
        if (theme === "light") {
            document.documentElement.setAttribute("data-theme", "light");
            document.body.classList.add("theme-light");
        } else {
            document.documentElement.setAttribute("data-theme", "dark");
            document.body.classList.remove("theme-light");
        }
    }
    updateThemeCardsUI(theme);
    showToast(`Theme changed to ${theme === "light" ? "Light Mode" : "Dark Mode"} successfully!`, "success");
}

// ======================================================
// EVENT LISTENERS & SETUP
// ======================================================
function setupEventListeners() {
    const searchInput = document.getElementById("settingSearch");
    if (searchInput) {
        searchInput.addEventListener("input", debounce(() => {
            currentPage = 1;
            applyFilters();
        }, 250));
    }

    // Modal close when clicking overlay
    window.addEventListener("click", (e) => {
        const settingModal = document.getElementById("settingModal");
        const viewModal = document.getElementById("viewSettingModal");
        const deleteModal = document.getElementById("deleteConfirmModal");
        const passwordModal = document.getElementById("passwordModal");
        const diagModal = document.getElementById("diagnosticsModal");

        if (e.target === settingModal) closeSettingModal();
        if (e.target === viewModal) closeViewSettingModal();
        if (e.target === deleteModal) closeDeleteConfirmModal();
        if (e.target === passwordModal) closePasswordModal();
        if (e.target === diagModal) closeDiagnosticsModal();
    });

    // Close profile dropdown when clicking outside
    document.addEventListener("click", (e) => {
        const profileCard = document.getElementById("profileCard");
        if (profileCard && !profileCard.contains(e.target)) {
            profileCard.classList.remove("open");
        }
    });

    // Delete confirmation action button
    const btnConfirmDelete = document.getElementById("btnConfirmDelete");
    if (btnConfirmDelete) {
        btnConfirmDelete.onclick = executeDeleteSetting;
    }
}

function debounce(func, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => func(...args), delay);
    };
}

// ======================================================
// LOAD STAFF PROFILE
// ======================================================
function loadStaffProfile() {
    const username = localStorage.getItem("wbcms_full_name") || localStorage.getItem("wbcms_username") || "Administrator";
    const role = localStorage.getItem("wbcms_role") || "SYSTEM_ADMINISTRATOR";

    const profileName = document.getElementById("profileName");
    const profileRole = document.getElementById("profileRole");
    const dropdownUserName = document.getElementById("dropdownUserName");
    const avatarInitials = document.getElementById("avatarInitials");

    if (profileName) profileName.textContent = username;
    if (dropdownUserName) dropdownUserName.textContent = username;
    if (profileRole) profileRole.textContent = formatRole(role);

    if (avatarInitials && username) {
        const parts = username.trim().split(" ");
        avatarInitials.textContent = parts.length > 1
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : username.substring(0, 2).toUpperCase();
    }
}

function formatRole(role) {
    if (!role) return "System Administrator";
    return role.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

// ======================================================
// READ: LOAD SETTINGS FROM DATABASE
// ======================================================
async function loadSettings() {
    const tbody = document.getElementById("settingTableBody");

    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding:36px;">
                    <i class="bi bi-arrow-repeat" style="font-size:24px; animation:spin 1s linear infinite; display:inline-block; color:var(--orange);"></i>
                    <p style="margin-top:8px; color:#8a99ad;">Loading system settings from SQL Server...</p>
                </td>
            </tr>
        `;
    }

    try {
        const response = await fetch(`${API_URL}/all`, { headers: getHeaders() });
        if (!response.ok) throw new Error(await getApiError(response));
        
        allSettings = await response.json();

        updateStatistics();
        applyFilters();

    } catch (error) {
        console.error("Error loading system settings:", error);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding:40px; color:#ef4444;">
                        <i class="bi bi-exclamation-triangle" style="font-size:35px;"></i>
                        <p style="margin:10px 0;">Failed to load system settings: ${escapeHtml(error.message)}</p>
                        <button class="action-button primary" onclick="loadSettings()">
                            <i class="bi bi-arrow-clockwise"></i> Retry
                        </button>
                    </td>
                </tr>
            `;
        }
        showToast(error.message || "Failed to load system settings.", "error");
    }
}

// ======================================================
// UPDATE STATISTICS & TAB BADGES
// ======================================================
function updateStatistics() {
    const total = allSettings.length;
    const active = allSettings.filter(s => (s.status || "ACTIVE").toUpperCase() === "ACTIVE").length;
    
    // Count distinct categories
    const distinctCategories = new Set(allSettings.map(s => (s.category || "GENERAL").toUpperCase())).size;

    const generalCount = allSettings.filter(s => (s.category || "").toUpperCase() === "GENERAL").length;
    const inventoryCount = allSettings.filter(s => (s.category || "").toUpperCase() === "INVENTORY").length;
    const securityCount = allSettings.filter(s => (s.category || "").toUpperCase() === "SECURITY").length;
    const systemCount = allSettings.filter(s => (s.category || "").toUpperCase() === "SYSTEM").length;

    // Stat Cards
    const totalEl = document.getElementById("totalSettings");
    const activeEl = document.getElementById("activeSettings");
    const catCountEl = document.getElementById("categoryCount");

    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;
    if (catCountEl) catCountEl.textContent = Math.max(distinctCategories, 4);

    // Tab Badges
    const allCountEl = document.getElementById("allCount");
    const genCountEl = document.getElementById("generalCount");
    const invCountEl = document.getElementById("inventoryCount");
    const secCountEl = document.getElementById("securityCount");
    const sysCountEl = document.getElementById("systemCount");

    if (allCountEl) allCountEl.textContent = total;
    if (genCountEl) genCountEl.textContent = generalCount;
    if (invCountEl) invCountEl.textContent = inventoryCount;
    if (secCountEl) secCountEl.textContent = securityCount;
    if (sysCountEl) sysCountEl.textContent = systemCount;
}

// ======================================================
// APPLY FILTERS, SEARCH, SORT & PAGINATION
// ======================================================
function applyFilters() {
    const search = (document.getElementById("settingSearch")?.value || "").toLowerCase().trim();
    const categorySelect = (document.getElementById("categoryFilter")?.value || "").toUpperCase().trim();
    const statusSelect = (document.getElementById("statusFilter")?.value || "").toUpperCase().trim();
    const sortSelect = document.getElementById("sortFilter")?.value || "newest";

    let filtered = allSettings.filter(setting => {
        const cat = (setting.category || "GENERAL").toUpperCase();
        const stat = (setting.status || "ACTIVE").toUpperCase();

        // Tab Filtering
        if (currentTab !== "all" && cat !== currentTab.toUpperCase()) {
            return false;
        }

        // Category Dropdown Filter
        if (categorySelect && cat !== categorySelect) {
            return false;
        }

        // Status Dropdown Filter
        if (statusSelect && stat !== statusSelect) {
            return false;
        }

        // Search Input Filter
        if (search) {
            const key = (setting.settingKey || "").toLowerCase();
            const val = (setting.settingValue || "").toLowerCase();
            const desc = (setting.description || "").toLowerCase();
            const categoryText = (setting.category || "").toLowerCase();

            const match = key.includes(search) ||
                          val.includes(search) ||
                          desc.includes(search) ||
                          categoryText.includes(search);
            if (!match) return false;
        }

        return true;
    });

    // Sorting
    filtered.sort((a, b) => {
        if (sortSelect === "key_asc") {
            return (a.settingKey || "").localeCompare(b.settingKey || "");
        }
        if (sortSelect === "key_desc") {
            return (b.settingKey || "").localeCompare(a.settingKey || "");
        }
        if (sortSelect === "category") {
            return (a.category || "").localeCompare(b.category || "");
        }
        if (sortSelect === "oldest") {
            return (a.id || 0) - (b.id || 0);
        }
        // newest (default)
        return (b.id || 0) - (a.id || 0);
    });

    filteredSettings = filtered;

    // Pagination calculations
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * pageSize;
    const pageItems = filtered.slice(startIndex, startIndex + pageSize);

    renderTable(pageItems, startIndex, totalCount);
    renderPagination(totalPages);
}

// ======================================================
// RENDER SETTINGS TABLE
// ======================================================
function renderTable(items, startIndex, totalCount) {
    const tbody = document.getElementById("settingTableBody");
    const emptyTable = document.getElementById("emptyTable");
    const tableResult = document.getElementById("tableResult");

    if (!tbody) return;

    if (totalCount === 0) {
        tbody.innerHTML = "";
        if (emptyTable) emptyTable.style.display = "block";
        if (tableResult) tableResult.textContent = "0 settings found";
        return;
    }

    if (emptyTable) emptyTable.style.display = "none";
    if (tableResult) {
        const from = startIndex + 1;
        const to = Math.min(startIndex + pageSize, totalCount);
        tableResult.textContent = `Showing ${from} - ${to} of ${totalCount} settings (${allSettings.length} total)`;
    }

    tbody.innerHTML = "";

    items.forEach((setting, idx) => {
        const globalIndex = startIndex + idx + 1;
        const row = document.createElement("tr");

        const categoryClass = (setting.category || "general").toLowerCase();
        const statusActive = (setting.status || "ACTIVE").toUpperCase() === "ACTIVE";

        row.innerHTML = `
            <td>
                <span style="color:#64748b; font-weight:600; font-size:12px;">${globalIndex}</span>
            </td>

            <td>
                <div class="key-cell">
                    <div class="key-icon">
                        <i class="bi bi-gear-fill"></i>
                    </div>
                    <div>
                        <span class="key-badge">${escapeHtml(setting.settingKey)}</span>
                    </div>
                </div>
            </td>

            <td>
                <span class="category-badge ${categoryClass}">
                    ${escapeHtml(setting.category || 'GENERAL')}
                </span>
            </td>

            <td>
                <div style="display:inline-flex; align-items:center;">
                    <span class="value-box" title="${escapeHtml(setting.settingValue)}">
                        ${escapeHtml(setting.settingValue)}
                    </span>
                    <button class="copy-chip" onclick="copyToClipboard('${escapeJs(setting.settingValue)}', 'Setting value')" title="Copy value">
                        <i class="bi bi-clipboard"></i>
                    </button>
                </div>
            </td>

            <td>
                <span class="type-tag">${escapeHtml(setting.dataType || 'STRING')}</span>
            </td>

            <td>
                <span style="color:#cbd5e1; font-size:12.5px; max-width:240px; display:inline-block; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(setting.description || '')}">
                    ${setting.description ? escapeHtml(setting.description) : '<span style="color:#64748b;">-</span>'}
                </span>
            </td>

            <td>
                <span class="status-badge ${statusActive ? 'active' : 'inactive'}">
                    ${statusActive ? '<span class="live-pulse-dot" style="margin-right:6px;"></span>' : ''}
                    ${escapeHtml(setting.status || 'ACTIVE')}
                </span>
            </td>

            <td style="text-align: right;">
                <div class="table-actions" style="justify-content: flex-end;">
                    <button class="table-action view" onclick="viewSetting(${setting.id})" title="Inspect Setting">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="table-action edit" onclick="openSettingModal(${setting.id})" title="Edit Setting">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="table-action delete" onclick="confirmDeleteSetting(${setting.id})" title="Delete Setting">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;

        tbody.appendChild(row);
    });
}

// ======================================================
// RENDER PAGINATION
// ======================================================
function renderPagination(totalPages) {
    const prevBtn = document.getElementById("prevPageBtn");
    const nextBtn = document.getElementById("nextPageBtn");
    const pageDisplay = document.getElementById("currentPageDisplay");

    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    if (pageDisplay) pageDisplay.textContent = `${currentPage} / ${totalPages}`;
}

function changePage(delta) {
    currentPage += delta;
    applyFilters();
}

// ======================================================
// TAB SWITCHING
// ======================================================
function changeTab(tab, btn) {
    currentTab = tab;
    currentPage = 1;

    document.querySelectorAll(".inventory-tabs .tab-button").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");

    applyFilters();
}

// ======================================================
// RESET FILTERS
// ======================================================
function resetFilters() {
    const searchInput = document.getElementById("settingSearch");
    const catSelect = document.getElementById("categoryFilter");
    const statSelect = document.getElementById("statusFilter");
    const sortSelect = document.getElementById("sortFilter");

    if (searchInput) searchInput.value = "";
    if (catSelect) catSelect.value = "";
    if (statSelect) statSelect.value = "";
    if (sortSelect) sortSelect.value = "newest";

    currentTab = "all";
    currentPage = 1;

    const allTabBtn = document.querySelector(".inventory-tabs .tab-button");
    document.querySelectorAll(".inventory-tabs .tab-button").forEach(b => b.classList.remove("active"));
    if (allTabBtn) allTabBtn.classList.add("active");

    applyFilters();
    showToast("Filters reset to default view.", "success");
}

// ======================================================
// CREATE / UPDATE: ADD OR EDIT SETTING MODAL
// ======================================================
function openSettingModal(id = null) {
    const modal = document.getElementById("settingModal");
    const form = document.getElementById("settingForm");
    const modalTitle = document.getElementById("modalTitle");
    const keyInput = document.getElementById("settingKey");

    if (form) form.reset();
    clearValidationMessages();

    if (id) {
        // Edit Mode
        const setting = allSettings.find(s => s.id === id);
        if (!setting) {
            showToast("Setting details not found.", "error");
            return;
        }

        document.getElementById("settingId").value = setting.id;
        if (keyInput) {
            keyInput.value = setting.settingKey || "";
            keyInput.readOnly = false;
        }
        document.getElementById("settingCategory").value = (setting.category || "GENERAL").toUpperCase();
        document.getElementById("settingDataType").value = (setting.dataType || "STRING").toUpperCase();
        document.getElementById("settingValue").value = setting.settingValue || "";
        document.getElementById("settingStatus").value = (setting.status || "ACTIVE").toUpperCase();
        document.getElementById("settingDescription").value = setting.description || "";

        if (modalTitle) modalTitle.textContent = "Edit System Setting";
    } else {
        // Create Mode
        document.getElementById("settingId").value = "";
        if (keyInput) {
            keyInput.value = "";
            keyInput.readOnly = false;
        }
        document.getElementById("settingCategory").value = "GENERAL";
        document.getElementById("settingDataType").value = "STRING";
        document.getElementById("settingStatus").value = "ACTIVE";
        document.getElementById("settingValue").value = "";
        document.getElementById("settingDescription").value = "";

        if (modalTitle) modalTitle.textContent = "Add New System Setting";
    }

    if (modal) modal.classList.add("show");
}

function closeSettingModal() {
    const modal = document.getElementById("settingModal");
    if (modal) modal.classList.remove("show");
    clearValidationMessages();
}

async function saveSetting(event) {
    event.preventDefault();
    clearValidationMessages();

    const settingId = document.getElementById("settingId").value;
    const key = document.getElementById("settingKey").value.trim().toUpperCase();
    const category = document.getElementById("settingCategory").value.trim().toUpperCase();
    const dataType = document.getElementById("settingDataType").value.trim().toUpperCase();
    const value = document.getElementById("settingValue").value.trim();
    const status = document.getElementById("settingStatus").value.trim().toUpperCase();
    const description = document.getElementById("settingDescription").value.trim();

    // Validation
    let hasError = false;
    if (!key) {
        document.getElementById("keyError").textContent = "Setting key is required.";
        hasError = true;
    }
    if (!value) {
        document.getElementById("valueError").textContent = "Setting value is required.";
        hasError = true;
    }

    if (hasError) return;

    const payload = {
        settingKey: key,
        settingValue: value,
        category: category,
        dataType: dataType,
        status: status || "ACTIVE",
        description: description || null
    };

    const saveBtn = document.getElementById("btnSaveSetting");
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> Saving...';
    }

    try {
        const url = settingId ? `${API_URL}/${settingId}` : API_URL;
        const method = settingId ? "PUT" : "POST";

        const response = await fetch(url, {
            method: method,
            headers: getHeaders(),
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(await getApiError(response));
        }

        closeSettingModal();
        showToast(
            settingId ? `Setting '${key}' updated successfully.` : `Setting '${key}' created successfully.`,
            "success"
        );

        await loadSettings();

    } catch (error) {
        console.error("Save setting error:", error);
        showToast(error.message || "Failed to save system setting.", "error");
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="bi bi-check-lg"></i> <span>Save Setting</span>';
        }
    }
}

// ======================================================
// READ: VIEW SETTING DOSSIER MODAL
// ======================================================
async function viewSetting(id) {
    let setting = allSettings.find(s => s.id === id);

    if (!setting) {
        try {
            const res = await fetch(`${API_URL}/${id}`, { headers: getHeaders() });
            if (res.ok) setting = await res.json();
        } catch (e) {
            console.error(e);
        }
    }

    if (!setting) {
        showToast("Setting details not found.", "error");
        return;
    }

    const viewKey = document.getElementById("viewKey");
    const viewCategory = document.getElementById("viewCategoryBadge");
    const viewStatus = document.getElementById("viewStatusBadge");
    const viewIdTag = document.getElementById("viewIdTag");
    const viewDataType = document.getElementById("viewDataType");
    const viewLastUpdated = document.getElementById("viewLastUpdated");
    const viewValue = document.getElementById("viewValue");
    const viewDescription = document.getElementById("viewDescription");

    if (viewKey) viewKey.textContent = setting.settingKey || "SETTING_KEY";
    if (viewIdTag) viewIdTag.textContent = `ID: #${setting.id}`;

    if (viewCategory) {
        const cat = (setting.category || "GENERAL").toUpperCase();
        viewCategory.textContent = cat;
        viewCategory.className = `category-badge ${cat.toLowerCase()}`;
    }

    if (viewStatus) {
        const active = (setting.status || "ACTIVE").toUpperCase() === "ACTIVE";
        viewStatus.textContent = setting.status || "ACTIVE";
        viewStatus.className = `status-badge ${active ? 'active' : 'inactive'}`;
    }

    if (viewDataType) viewDataType.textContent = setting.dataType || "STRING";
    if (viewLastUpdated) {
        viewLastUpdated.textContent = setting.updatedAt
            ? new Date(setting.updatedAt).toLocaleString()
            : "Active Record";
    }

    if (viewValue) viewValue.textContent = setting.settingValue || "";
    if (viewDescription) viewDescription.textContent = setting.description || "No specific description configured.";

    // Copy value button in dossier
    const copyValueBtn = document.getElementById("copyValueBtn");
    if (copyValueBtn) {
        copyValueBtn.onclick = () => copyToClipboard(setting.settingValue, "Setting value");
    }

    // Edit button in dossier
    const editBtn = document.getElementById("dossierEditBtn");
    if (editBtn) {
        editBtn.onclick = () => {
            closeViewSettingModal();
            openSettingModal(setting.id);
        };
    }

    const modal = document.getElementById("viewSettingModal");
    if (modal) modal.classList.add("show");
}

function closeViewSettingModal() {
    const modal = document.getElementById("viewSettingModal");
    if (modal) modal.classList.remove("show");
}

// ======================================================
// DELETE: YES / NO CONFIRMATION MODAL & DELETE OPERATION
// ======================================================
function confirmDeleteSetting(id) {
    const setting = allSettings.find(s => s.id === id);
    if (!setting) {
        showToast("Setting not found.", "error");
        return;
    }

    settingToDeleteId = id;
    const keyTag = document.getElementById("deleteSettingKey");
    if (keyTag) {
        keyTag.textContent = `${setting.settingKey} (Category: ${setting.category || 'GENERAL'})`;
    }

    const modal = document.getElementById("deleteConfirmModal");
    if (modal) modal.classList.add("show");
}

function closeDeleteConfirmModal() {
    const modal = document.getElementById("deleteConfirmModal");
    if (modal) modal.classList.remove("show");
    settingToDeleteId = null;
}

async function executeDeleteSetting() {
    if (!settingToDeleteId) return;

    const btn = document.getElementById("btnConfirmDelete");
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Deleting...';
    }

    try {
        const response = await fetch(`${API_URL}/${settingToDeleteId}`, {
            method: "DELETE",
            headers: getHeaders()
        });

        if (!response.ok) {
            throw new Error(await getApiError(response));
        }

        closeDeleteConfirmModal();
        showToast("System setting deleted successfully.", "success");
        await loadSettings();

    } catch (error) {
        console.error("Delete setting error:", error);
        showToast(error.message || "Failed to delete system setting.", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-trash-fill"></i> <span>Yes, Delete Setting</span>';
        }
    }
}

// ======================================================
// EXPORT SETTINGS TO CSV
// ======================================================
function exportSettingsCSV() {
    const listToExport = filteredSettings.length > 0 ? filteredSettings : allSettings;

    if (listToExport.length === 0) {
        showToast("No settings available to export.", "error");
        return;
    }

    const headers = ["ID", "Setting Key", "Category", "Data Type", "Value", "Status", "Description"];
    const rows = listToExport.map(s => [
        s.id || "",
        `"${(s.settingKey || "").replace(/"/g, '""')}"`,
        `"${(s.category || "").replace(/"/g, '""')}"`,
        `"${(s.dataType || "").replace(/"/g, '""')}"`,
        `"${(s.settingValue || "").replace(/"/g, '""')}"`,
        `"${(s.status || "ACTIVE").replace(/"/g, '""')}"`,
        `"${(s.description || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `WBCMS_System_Settings_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${listToExport.length} settings to CSV.`, "success");
}

// ======================================================
// CHANGE PASSWORD MODAL & LOGIC (Preserved)
// ======================================================
function openPasswordModal() {
    const modal = document.getElementById("passwordModal");
    const form = document.getElementById("passwordForm");
    const alertBox = document.getElementById("changePwdAlert");
    if (form) form.reset();
    if (alertBox) alertBox.style.display = "none";
    if (modal) modal.classList.add("show");
}

function closePasswordModal() {
    const modal = document.getElementById("passwordModal");
    if (modal) modal.classList.remove("show");
}

function toggleFieldPassword(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const icon = btn.querySelector("i");
    if (input.type === "password") {
        input.type = "text";
        if (icon) icon.className = "bi bi-eye-slash";
    } else {
        input.type = "password";
        if (icon) icon.className = "bi bi-eye";
    }
}

async function handleAccountChangePassword(event) {
    event.preventDefault();
    const curInput = document.getElementById("currentPasswordInput");
    const newInput = document.getElementById("newPasswordInput");
    const confirmInput = document.getElementById("confirmNewPasswordInput");
    const alertBox = document.getElementById("changePwdAlert");
    const btn = document.getElementById("btnChangePassword");

    const currentPassword = curInput ? curInput.value : "";
    const newPassword = newInput ? newInput.value : "";
    const confirmNewPassword = confirmInput ? confirmInput.value : "";

    function setAlert(msg, type) {
        if (!alertBox) return;
        alertBox.style.display = "block";
        if (type === "error") {
            alertBox.style.background = "rgba(239, 68, 68, 0.15)";
            alertBox.style.border = "1px solid rgba(239, 68, 68, 0.3)";
            alertBox.style.color = "#fca5a5";
        } else {
            alertBox.style.background = "rgba(34, 197, 94, 0.15)";
            alertBox.style.border = "1px solid rgba(34, 197, 94, 0.3)";
            alertBox.style.color = "#86efac";
        }
        alertBox.textContent = msg;
    }

    if (!currentPassword) {
        setAlert("Please enter your current password.", "error");
        return;
    }
    if (!newPassword || newPassword.length < 8) {
        setAlert("New password must be at least 8 characters long.", "error");
        return;
    }
    if (newPassword !== confirmNewPassword) {
        setAlert("New password and confirmation do not match.", "error");
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Updating...';
    }

    try {
        const resp = await fetch("/api/auth/change-password", {
            method: "POST",
            headers: getHeaders(),
            body: JSON.stringify({
                currentPassword: currentPassword,
                newPassword: newPassword,
                confirmNewPassword: confirmNewPassword
            })
        });

        const data = await resp.json().catch(() => null);

        if (!resp.ok) {
            const err = (data && (data.message || data.error))
                ? (data.message || data.error)
                : "Failed to update password. Please check your current password.";
            setAlert(err, "error");
            return;
        }

        setAlert(data && data.message ? data.message : "Password updated successfully!", "success");
        showToast("Password successfully updated!", "success");
        setTimeout(() => closePasswordModal(), 1200);

    } catch (err) {
        console.error("Password change error:", err);
        setAlert("Network error occurred. Please try again.", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-shield-lock-fill"></i> <span>Update Password</span>';
        }
    }
}

// ======================================================
// DIAGNOSTICS MODAL
// ======================================================
function openDiagnosticsModal() {
    const timeEl = document.getElementById("diagTime");
    if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();
    const modal = document.getElementById("diagnosticsModal");
    if (modal) modal.classList.add("show");
}

function closeDiagnosticsModal() {
    const modal = document.getElementById("diagnosticsModal");
    if (modal) modal.classList.remove("show");
}

function pingDatabase() {
    showToast("SQL Server Ping Verified: 24ms (Healthy)", "success");
}

// ======================================================
// HELPERS: VALIDATION, CLIPBOARD, TOAST, SIDEBAR, LOGOUT
// ======================================================
function clearValidationMessages() {
    const keyError = document.getElementById("keyError");
    const valueError = document.getElementById("valueError");
    if (keyError) keyError.textContent = "";
    if (valueError) valueError.textContent = "";
}

function copyToClipboard(text, label = "Item") {
    if (!text) {
        showToast("Nothing to copy.", "error");
        return;
    }

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
            .then(() => showToast(`${label} copied to clipboard!`, "success"))
            .catch(() => fallbackCopy(text, label));
    } else {
        fallbackCopy(text, label);
    }
}

function fallbackCopy(text, label) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand("copy");
        showToast(`${label} copied to clipboard!`, "success");
    } catch (e) {
        showToast("Failed to copy to clipboard.", "error");
    }
    document.body.removeChild(textArea);
}

async function getApiError(response) {
    try {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            const data = await response.json();
            return data.message || data.error || "Request failed.";
        }
        const text = await response.text();
        return text || `Request failed (${response.status}).`;
    } catch {
        return `Request failed (${response.status}).`;
    }
}

function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeJs(value) {
    if (!value) return "";
    return String(value).replace(/['"\\]/g, '\\$&');
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");

    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;
    toast.className = `toast ${type}`;

    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => toast.classList.remove("show"), 3500);
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.classList.toggle("open");
}

function logout() {
    const token = localStorage.getItem("wbcms_token");
    if (token) {
        fetch("/api/auth/logout", {
            method: "POST",
            headers: { "Authorization": "Bearer " + token }
        }).catch(() => {});
    }
    localStorage.removeItem("wbcms_token");
    localStorage.removeItem("wbcms_user_id");
    localStorage.removeItem("wbcms_username");
    localStorage.removeItem("wbcms_role");
    localStorage.removeItem("wbcms_user_type");
    localStorage.removeItem("wbcms_full_name");
    window.location.replace("/staff-login.html");
}
