/* =========================================================
   WBCMS - MATERIAL & INVENTORY MANAGEMENT
   Frontend CRUD Integration & Real-Time Dashboard Updates
   Backend is NOT changed
========================================================= */

// =========================================================
// AUTHENTICATION
// =========================================================

const authToken = localStorage.getItem("wbcms_token");
const userType = localStorage.getItem("wbcms_user_type");

const username =
    localStorage.getItem("wbcms_username") || "Staff User";

const role =
    localStorage.getItem("wbcms_role") ||
    localStorage.getItem("wbcms_staff_role") ||
    "STAFF";

// Only STAFF users can access this page
if (!authToken || userType !== "STAFF") {
    window.location.replace("/staff-login.html");
}

// =========================================================
// GLOBAL STATE & CONCURRENCY CONTROLS
// =========================================================

let materialsList = [];
let currentTab = "all";
let editingMaterialId = null;
let stockOperation = "receive";
let currentDossierMaterialId = null;

let isSavingMaterial = false;
let isDeletingMaterial = false;
let isProcessingStock = false;
let loadMaterialsSeq = 0;

// =========================================================
// PAGE INITIALIZATION & LIVE SYNC
// =========================================================

let inventoryLiveSyncInterval = null;

function startLiveSync() {
    if (inventoryLiveSyncInterval) clearInterval(inventoryLiveSyncInterval);
    inventoryLiveSyncInterval = setInterval(() => {
        const materialModalOpen = document.getElementById("materialModal")?.classList.contains("show");
        const stockModalOpen = document.getElementById("stockModal")?.classList.contains("show");
        const dossierModalOpen = document.getElementById("materialDossierModal")?.classList.contains("show");
        if (!document.hidden && !isSavingMaterial && !isProcessingStock && !isDeletingMaterial && !materialModalOpen && !stockModalOpen && !dossierModalOpen) {
            loadMaterials(true);
        }
    }, 4000);
}

document.addEventListener("DOMContentLoaded", function () {
    loadUserInformation();
    setupEventListeners();
    loadMaterials();
    startLiveSync();
});

// =========================================================
// USER INFORMATION
// =========================================================

function loadUserInformation() {
    const profileName = document.getElementById("profileName");
    const profileRole = document.getElementById("profileRole");

    if (profileName) {
        profileName.textContent = username;
    }

    if (profileRole) {
        profileRole.textContent = formatRole(role);
    }
}

function formatRole(value) {
    if (!value) {
        return "Staff";
    }

    return value
        .toLowerCase()
        .replace(/_/g, " ")
        .replace(/\b\w/g, c => c.toUpperCase());
}

// =========================================================
// AUTH HEADERS (WITH ANTI-CACHING HEADERS)
// =========================================================

function getAuthHeaders() {
    const currentToken = localStorage.getItem("wbcms_token") || authToken;
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + currentToken,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache"
    };
}

// =========================================================
// EVENT LISTENERS
// =========================================================

function setupEventListeners() {
    const searchInput = document.getElementById("materialSearch");
    const globalSearch = document.getElementById("globalSearch");
    const categoryFilter = document.getElementById("categoryFilter");
    const statusFilter = document.getElementById("statusFilter");

    // Material search
    if (searchInput) {
        searchInput.addEventListener(
            "input",
            debounce(filterMaterials, 250)
        );
    }

    // Global search
    if (globalSearch) {
        globalSearch.addEventListener(
            "input",
            debounce(function () {
                if (searchInput) {
                    searchInput.value = globalSearch.value;
                    filterMaterials();
                }
            }, 250)
        );
    }

    // Category
    if (categoryFilter) {
        categoryFilter.addEventListener("change", filterMaterials);
    }

    // Status
    if (statusFilter) {
        statusFilter.addEventListener("change", filterMaterials);
    }

    // Modal overlay click outside dismissal
    const materialModal = document.getElementById("materialModal");
    if (materialModal) {
        materialModal.addEventListener("click", function (event) {
            if (event.target === this) {
                closeMaterialModal();
            }
        });
    }

    const stockModal = document.getElementById("stockModal");
    if (stockModal) {
        stockModal.addEventListener("click", function (event) {
            if (event.target === this) {
                closeStockModal();
            }
        });
    }

    // Escape key dismissal
    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeMaterialModal();
            closeStockModal();
            closeMaterialDossierModal();
        }
    });
}

// =========================================================
// LOAD MATERIALS
// READ FROM BACKEND / SQL SERVER (WITH ANTI-CACHE & RACE PROTECTION)
// =========================================================

async function loadMaterials(isSilent = false) {
    const currentSeq = ++loadMaterialsSeq;
    const tableBody = document.getElementById("materialTableBody");
    const emptyTable = document.getElementById("emptyTable");

    // Show loading spinner on initial load if no materials currently rendered
    if (!isSilent && tableBody && materialsList.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="11" style="text-align:center; padding:40px;">
                    <i class="bi bi-arrow-repeat" style="font-size:24px; animation:spin 1s linear infinite; display:inline-block; color:#1a56db;"></i>
                    <p style="margin-top:10px; color:#8a99ad;">Loading materials from database...</p>
                </td>
            </tr>
        `;
    }

    try {
        const response = await fetch(`/api/materials?page=0&size=200&_t=${Date.now()}`, {
            method: "GET",
            headers: getAuthHeaders(),
            cache: "no-store"
        });

        // Ignore response if a newer loadMaterials request was fired
        if (currentSeq !== loadMaterialsSeq) {
            return;
        }

        // Session expired
        if (response.status === 401 || response.status === 403) {
            showToast("Session expired. Please login again.", "error");
            setTimeout(() => {
                localStorage.removeItem("wbcms_token");
                window.location.replace("/staff-login.html");
            }, 1200);
            return;
        }

        if (!response.ok) {
            throw new Error(await getApiError(response));
        }

        const data = await response.json();
        const loadedList = Array.isArray(data) ? data : (data.content || []);

        // Sort newest/updated materials first
        loadedList.sort((a, b) => {
            const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
            if (timeB !== timeA) return timeB - timeA;
            return (b.id || 0) - (a.id || 0);
        });

        materialsList = loadedList;

        // Synchronously update all dashboard components
        updateStatistics();
        populateCategoryFilter();
        populateStockMaterials();
        renderMaterials();

    } catch (error) {
        if (currentSeq !== loadMaterialsSeq) return;
        console.error("Error loading materials:", error);

        if (tableBody && materialsList.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="11" style="text-align:center; padding:35px; color:#f87171;">
                        <i class="bi bi-exclamation-triangle" style="font-size:24px;"></i>
                        <p style="margin-top:8px;">${escapeHtml(error.message || "Failed to load materials.")}</p>
                        <button class="reset-button" style="margin-top:10px;" onclick="loadMaterials()">Retry</button>
                    </td>
                </tr>
            `;
            if (emptyTable) emptyTable.style.display = "none";
        }

        if (isSilent) {
            showToast(error.message || "Failed to refresh materials.", "error");
        }
    }
}

// =========================================================
// RENDER TABLE
// =========================================================

function renderMaterials() {
    const tableBody = document.getElementById("materialTableBody");
    const emptyTable = document.getElementById("emptyTable");
    const tableResult = document.getElementById("tableResult");

    if (!tableBody) {
        return;
    }

    const search = (document.getElementById("materialSearch")?.value || "").toLowerCase().trim();
    const category = document.getElementById("categoryFilter")?.value || "";
    const status = document.getElementById("statusFilter")?.value || "";

    // FILTER
    const filtered = materialsList.filter(material => {
        const code = String(material.code || "").toLowerCase();
        const name = String(material.name || "").toLowerCase();
        const supplier = String(material.supplier || "").toLowerCase();
        const materialCategory = material.category || "";
        const itemStatus = getDisplayStatus(material);

        // Search
        const matchesSearch =
            !search ||
            code.includes(search) ||
            name.includes(search) ||
            supplier.includes(search);

        // Category
        const matchesCategory =
            !category ||
            materialCategory === category;

        // Status
        const matchesStatus =
            !status ||
            itemStatus === status;

        // Tab
        let matchesTab = true;

        if (currentTab === "in") {
            matchesTab = itemStatus === "In Stock";
        } else if (currentTab === "low") {
            matchesTab = itemStatus === "Low Stock";
        } else if (currentTab === "out") {
            matchesTab = itemStatus === "Out of Stock";
        } else if (currentTab === "recent") {
            matchesTab = isRecentlyAdded(material);
        }

        return (
            matchesSearch &&
            matchesCategory &&
            matchesStatus &&
            matchesTab
        );
    });

    // Result text
    if (tableResult) {
        tableResult.textContent = `Showing ${filtered.length} of ${materialsList.length} materials`;
    }

    // Empty state
    if (filtered.length === 0) {
        tableBody.innerHTML = "";
        if (emptyTable) {
            emptyTable.style.display = "block";
        }
        return;
    }

    if (emptyTable) {
        emptyTable.style.display = "none";
    }

    tableBody.innerHTML = "";

    // TABLE ROWS
    filtered.forEach((material, index) => {
        const statusText = getDisplayStatus(material);
        const statusClass =
            statusText === "In Stock"
                ? "in-stock"
                : statusText === "Low Stock"
                    ? "low-stock"
                    : "out-stock";

        const quantity = Number(material.quantity || 0);
        const price = Number(material.unitPrice || 0);
        const totalValue =
            material.stockValue != null
                ? Number(material.stockValue)
                : quantity * price;

        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                ${index + 1}
            </td>
            <td>
                <span class="material-code">
                    ${escapeHtml(material.code || ("MAT-" + material.id))}
                </span>
            </td>
            <td>
                <span class="material-name">
                    ${escapeHtml(material.name || "Unnamed Material")}
                </span>
            </td>
            <td>
                ${escapeHtml(material.category || "General")}
            </td>
            <td>
                <span class="supplier-name">
                    ${escapeHtml(material.supplier || "N/A")}
                </span>
            </td>
            <td>
                <strong>
                    ${formatNumber(quantity)}
                </strong>
            </td>
            <td>
                ${escapeHtml(material.unit || "Units")}
            </td>
            <td>
                LKR ${price.toFixed(2)}
            </td>
            <td>
                LKR ${formatMoney(totalValue)}
            </td>
            <td>
                <span class="status ${statusClass}">
                    ${statusText}
                </span>
            </td>
            <td>
                <div class="table-actions">
                    <button
                        type="button"
                        class="table-action view"
                        title="View Details"
                        onclick="viewMaterial(${material.id})"
                    >
                        <i class="bi bi-eye"></i>
                    </button>
                    <button
                        type="button"
                        class="table-action edit"
                        title="Edit Material"
                        onclick="editMaterial(${material.id})"
                    >
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button
                        type="button"
                        class="table-action delete"
                        title="Delete Material"
                        onclick="deleteMaterial(${material.id})"
                    >
                        <i class="bi bi-trash3"></i>
                    </button>
                </div>
            </td>
        `;

        tableBody.appendChild(row);
    });
}

// =========================================================
// STOCK STATUS
// =========================================================

function getDisplayStatus(material) {
    const quantity = Number(material.quantity || 0);
    const threshold = Number(
        material.stockThreshold ??
        material.minimumStock ??
        0
    );

    if (quantity <= 0) {
        return "Out of Stock";
    }

    if (quantity <= threshold) {
        return "Low Stock";
    }

    return "In Stock";
}

// =========================================================
// RECENT MATERIALS
// =========================================================

function isRecentlyAdded(material) {
    const dateStr = material.updatedAt || material.createdAt;
    if (!dateStr) {
        return false;
    }

    const itemDate = new Date(dateStr);
    const now = new Date();
    const difference = now - itemDate;
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;

    return difference >= 0 && difference <= thirtyDays;
}

// =========================================================
// UPDATE STATISTICS (KPI COUNTERS & TAB BADGES)
// =========================================================

function updateStatistics() {
    const total = materialsList.length;

    const inStock = materialsList.filter(
        material => getDisplayStatus(material) === "In Stock"
    ).length;

    const lowStock = materialsList.filter(
        material => getDisplayStatus(material) === "Low Stock"
    ).length;

    const outStock = materialsList.filter(
        material => getDisplayStatus(material) === "Out of Stock"
    ).length;

    setText("totalMaterials", total);
    setText("inStock", inStock);
    setText("lowStock", lowStock);
    setText("pendingOrders", outStock);

    setText("allCount", total);
    setText("inStockCount", inStock);
    setText("lowCount", lowStock);
    setText("outCount", outStock);
}

// =========================================================
// FILTER
// =========================================================

function filterMaterials() {
    renderMaterials();
}

// =========================================================
// RESET FILTERS
// =========================================================

function resetFilters() {
    const search = document.getElementById("materialSearch");
    const category = document.getElementById("categoryFilter");
    const status = document.getElementById("statusFilter");
    const globalSearch = document.getElementById("globalSearch");

    if (search) search.value = "";
    if (category) category.value = "";
    if (status) status.value = "";
    if (globalSearch) globalSearch.value = "";

    currentTab = "all";

    document.querySelectorAll(".tab-button").forEach(button => {
        button.classList.remove("active");
    });

    const firstTab = document.querySelector(".tab-button");
    if (firstTab) {
        firstTab.classList.add("active");
    }

    renderMaterials();
}

// =========================================================
// TAB CHANGE
// =========================================================

function changeTab(tab, button) {
    currentTab = tab;

    document.querySelectorAll(".tab-button").forEach(btn => {
        btn.classList.remove("active");
    });

    if (button) {
        button.classList.add("active");
    }

    renderMaterials();
}

// =========================================================
// LOW STOCK QUICK FILTER
// =========================================================

function showLowStock() {
    currentTab = "low";

    document.querySelectorAll(".tab-button").forEach(btn => {
        btn.classList.remove("active");
    });

    const tabs = document.querySelectorAll(".tab-button");
    const lowTab = Array.from(tabs).find(btn => btn.getAttribute("onclick")?.includes("'low'"));

    if (lowTab) {
        lowTab.classList.add("active");
    } else if (tabs[2]) {
        tabs[2].classList.add("active");
    }

    renderMaterials();

    const tableEl = document.querySelector(".inventory-card");
    if (tableEl) {
        tableEl.scrollIntoView({ behavior: "smooth" });
    }
}

// =========================================================
// CATEGORY FILTER
// =========================================================

function populateCategoryFilter() {
    const select = document.getElementById("categoryFilter");
    if (!select) return;

    const selected = select.value;
    const categories = [
        ...new Set(
            materialsList
                .map(material => material.category)
                .filter(Boolean)
        )
    ].sort();

    select.innerHTML = `<option value="">All Categories</option>`;

    categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
    });

    // Restore selected value if still valid
    if (categories.includes(selected)) {
        select.value = selected;
    } else {
        select.value = "";
    }
}

// =========================================================
// ADD MATERIAL
// =========================================================

function openMaterialModal() {
    editingMaterialId = null;

    const title = document.getElementById("modalTitle");
    if (title) {
        title.textContent = "Add New Material";
    }

    const form = document.getElementById("materialForm");
    if (form) {
        form.reset();
    }

    const id = document.getElementById("materialId");
    if (id) {
        id.value = "";
    }

    const submitBtn = form?.querySelector("button[type='submit']");
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check-circle"></i> Save Material';
    }

    clearValidation();

    const modal = document.getElementById("materialModal");
    if (modal) {
        modal.classList.add("show");
    }
}

// =========================================================
// EDIT MATERIAL
// =========================================================

async function editMaterial(id) {
    try {
        const response = await fetch(`/api/materials/${id}?_t=${Date.now()}`, {
            method: "GET",
            headers: getAuthHeaders(),
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(await getApiError(response));
        }

        const material = await response.json();

        // Update local cache with fresh details
        const idx = materialsList.findIndex(m => m.id === id);
        if (idx !== -1) {
            materialsList[idx] = material;
        }

        editingMaterialId = material.id;

        setValue("materialId", material.id);
        setValue("materialCode", material.code || "");
        setValue("materialName", material.name || "");
        setValue("materialCategory", material.category || "");
        setValue("materialUnit", material.unit || "");
        setValue("materialSupplier", material.supplier || "");
        setValue("materialQuantity", material.quantity ?? 0);
        setValue(
            "minimumStock",
            material.stockThreshold ?? material.minimumStock ?? 0
        );
        setValue("materialUnitPrice", material.unitPrice ?? 0);
        setValue("materialDescription", material.purchaseRequest || "");

        const title = document.getElementById("modalTitle");
        if (title) {
            title.textContent = "Edit Material";
        }

        const form = document.getElementById("materialForm");
        const submitBtn = form?.querySelector("button[type='submit']");
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-check-circle"></i> Update Material';
        }

        clearValidation();

        const modal = document.getElementById("materialModal");
        if (modal) {
            modal.classList.add("show");
        }

    } catch (error) {
        console.error("Edit material error:", error);
        showToast(error.message || "Unable to load material.", "error");
    }
}

// =========================================================
// CLOSE MATERIAL MODAL
// =========================================================

function closeMaterialModal() {
    const modal = document.getElementById("materialModal");
    if (modal) {
        modal.classList.remove("show");
    }
    editingMaterialId = null;
}

// =========================================================
// CREATE / UPDATE MATERIAL
// =========================================================

async function saveMaterial(event) {
    event.preventDefault();

    if (isSavingMaterial) {
        return;
    }

    if (!validateMaterialForm()) {
        showToast("Please correct the highlighted fields.", "error");
        return;
    }

    const code = getValue("materialCode");
    const name = getValue("materialName");
    const category = getValue("materialCategory");
    const unit = getValue("materialUnit");
    const supplier = getValue("materialSupplier");
    const quantity = Number(getValue("materialQuantity"));
    const minimum = Number(getValue("minimumStock"));
    const unitPrice = Number(getValue("materialUnitPrice"));
    const description = getValue("materialDescription");

    const payload = {
        code: code,
        name: name,
        category: category,
        quantity: quantity,
        unit: unit,
        supplier: supplier,
        unitPrice: unitPrice,
        stockThreshold: minimum,
        purchaseRequest: description || null,
        deliveryStatus: "DELIVERED"
    };

    // Duplicate code check on client before API call
    if (code) {
        const duplicate = materialsList.some(
            material =>
                material.code &&
                material.code.toLowerCase() === code.toLowerCase() &&
                material.id !== editingMaterialId
        );

        if (duplicate) {
            showToast("Material code already exists.", "error");
            return;
        }
    }

    const form = document.getElementById("materialForm");
    const submitButton = form?.querySelector("button[type='submit']");
    const originalText = submitButton?.innerHTML || "Save Material";

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = `<i class="bi bi-hourglass-split"></i> Saving...`;
    }

    isSavingMaterial = true;
    const isEditMode = Boolean(editingMaterialId);
    const targetId = editingMaterialId;

    try {
        let url;
        let method;

        if (isEditMode) {
            url = `/api/materials/${targetId}`;
            method = "PUT";
        } else {
            url = "/api/materials";
            method = "POST";
        }

        const response = await fetch(url, {
            method: method,
            headers: getAuthHeaders(),
            body: JSON.stringify(payload),
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(await getApiError(response));
        }

        const savedItem = await response.json();

        // Update local state immediately
        if (isEditMode) {
            const idx = materialsList.findIndex(m => m.id === targetId);
            if (idx !== -1) {
                materialsList[idx] = savedItem;
            } else {
                materialsList.unshift(savedItem);
            }
        } else {
            materialsList.unshift(savedItem);
            // Clear search and filter so the newly added material is immediately visible
            resetFilters();
        }

        // Sort newest/updated first
        materialsList.sort((a, b) => {
            const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
            const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
            if (timeB !== timeA) return timeB - timeA;
            return (b.id || 0) - (a.id || 0);
        });

        // Immediately update all dashboard UI elements
        updateStatistics();
        populateCategoryFilter();
        populateStockMaterials();
        renderMaterials();

        closeMaterialModal();

        showToast(
            isEditMode ? "Successfully edited material!" : "Successfully added material!",
            "success"
        );

        // Synchronize in background with verified database state
        await loadMaterials(true);

    } catch (error) {
        console.error("Save material error:", error);
        showToast(
            error.message || (isEditMode ? "Error editing material: Failed to update." : "Error adding material."),
            "error"
        );
    } finally {
        isSavingMaterial = false;
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    }
}

// =========================================================
// VALIDATION
// =========================================================

function validateMaterialForm() {
    clearValidation();

    let valid = true;

    const code = document.getElementById("materialCode");
    const name = document.getElementById("materialName");
    const category = document.getElementById("materialCategory");
    const unit = document.getElementById("materialUnit");
    const supplier = document.getElementById("materialSupplier");
    const quantity = document.getElementById("materialQuantity");
    const minimum = document.getElementById("minimumStock");
    const unitPrice = document.getElementById("materialUnitPrice");

    // Code
    if (code && !code.value.trim()) {
        setError(code, "codeError", "Material code is required.");
        valid = false;
    }

    // Name
    if (name && !name.value.trim()) {
        setError(name, "nameError", "Material name is required.");
        valid = false;
    }

    // Category
    if (category && !category.value) {
        setError(category, "categoryError", "Please select a category.");
        valid = false;
    }

    // Unit
    if (unit && !unit.value) {
        setError(unit, "unitError", "Please select a unit.");
        valid = false;
    }

    // Supplier
    if (supplier && !supplier.value.trim()) {
        setError(supplier, "supplierError", "Supplier is required.");
        valid = false;
    }

    // Quantity
    if (quantity && (quantity.value === "" || Number(quantity.value) < 0)) {
        setError(quantity, "quantityError", "Quantity cannot be negative.");
        valid = false;
    }

    // Minimum stock
    if (minimum && (minimum.value === "" || Number(minimum.value) < 0)) {
        setError(minimum, "minimumError", "Minimum stock cannot be negative.");
        valid = false;
    }

    // Unit price
    if (unitPrice && (unitPrice.value === "" || Number(unitPrice.value) < 0)) {
        setError(unitPrice, "priceError", "Unit price cannot be negative.");
        valid = false;
    }

    return valid;
}

function setError(input, errorId, message) {
    if (input) {
        input.classList.add("error");
    }

    const error = document.getElementById(errorId);
    if (error) {
        error.textContent = message;
    }
}

function clearValidation() {
    document.querySelectorAll(".validation-message").forEach(element => {
        element.textContent = "";
    });

    document.querySelectorAll(".form-group input, .form-group select, .form-group textarea").forEach(element => {
        element.classList.remove("error");
    });
}

// =========================================================
// DELETE MATERIAL
// =========================================================

async function deleteMaterial(id) {
    if (isDeletingMaterial) {
        return;
    }

    const material = materialsList.find(item => item.id === id);
    if (!material) {
        return;
    }

    const confirmed = confirm(
        `Are you sure you want to delete "${material.name}"?\n\nThis will permanently remove the material record from the database.`
    );

    if (!confirmed) {
        return;
    }

    isDeletingMaterial = true;

    try {
        const response = await fetch(`/api/materials/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders(),
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(await getApiError(response));
        }

        // Remove from local array immediately
        materialsList = materialsList.filter(item => item.id !== id);

        // If dossier modal was viewing this deleted material, close it
        if (currentDossierMaterialId === id) {
            closeMaterialDossierModal();
        }

        // Immediately update all dashboard components
        updateStatistics();
        populateCategoryFilter();
        populateStockMaterials();
        renderMaterials();

        showToast("Successfully deleted material!", "success");

        // Sync with verified backend state
        await loadMaterials(true);

    } catch (error) {
        console.error("Delete error:", error);
        showToast(error.message || "Error deleting material.", "error");
    } finally {
        isDeletingMaterial = false;
    }
}

// =========================================================
// VIEW MATERIAL (DOSSIER INSPECTION MODAL)
// =========================================================

async function viewMaterial(id) {
    currentDossierMaterialId = id;
    const modal = document.getElementById("materialDossierModal");
    const content = document.getElementById("materialDossierContent");
    const stampEl = document.getElementById("materialDossierTimestamp");

    if (!modal || !content) {
        return;
    }

    // Show initial loading state
    content.innerHTML = `
        <div style="text-align:center; padding: 48px 20px; color:#64748b;">
            <i class="bi bi-arrow-repeat" style="font-size:30px; animation:spin 1s linear infinite; display:inline-block; color:#1a56db;"></i>
            <p style="margin-top:14px; font-weight:700; color:#0f172a; font-size:14px;">Loading Material Dossier...</p>
            <span style="font-size:12px; color:#64748b;">Retrieving verified inventory specifications</span>
        </div>
    `;
    if (stampEl) stampEl.textContent = "";
    modal.classList.add("open");
    modal.classList.add("show");

    try {
        const response = await fetch(`/api/materials/${id}?_t=${Date.now()}`, {
            method: "GET",
            headers: getAuthHeaders(),
            cache: "no-store"
        });

        if (response.status === 401 || response.status === 403) {
            showToast("Session expired. Please login again.", "error");
            setTimeout(() => {
                localStorage.removeItem("wbcms_token");
                window.location.replace("/staff-login.html");
            }, 1200);
            return;
        }

        if (!response.ok) {
            throw new Error(await getApiError(response));
        }

        const material = await response.json();

        // Update in cached list
        const idx = materialsList.findIndex(m => m.id === id);
        if (idx !== -1) {
            materialsList[idx] = material;
        }

        const quantity = Number(material.quantity || 0);
        const price = Number(material.unitPrice || 0);
        const stockValue = material.stockValue != null ? Number(material.stockValue) : quantity * price;
        const threshold = Number(material.stockThreshold ?? material.minimumStock ?? 0);
        const statusText = getDisplayStatus(material);

        let statusColor = "#059669";
        let statusIcon = "bi bi-check-circle-fill";
        let statusItemClass = "allowed";

        if (statusText === "Low Stock") {
            statusColor = "#ea580c";
            statusIcon = "bi bi-exclamation-triangle-fill";
            statusItemClass = "warning";
        } else if (statusText === "Out of Stock") {
            statusColor = "#dc2626";
            statusIcon = "bi bi-x-circle-fill";
            statusItemClass = "denied";
        }

        // Avatar monogram & dynamic theme styling
        const categoryKey = (material.category || "General").toLowerCase();
        let avatarBg = "#0284c7";
        if (categoryKey === "construction") avatarBg = "#ea580c";
        else if (categoryKey === "electrical") avatarBg = "#d97706";
        else if (categoryKey === "plumbing") avatarBg = "#2563eb";
        else if (categoryKey === "finishing") avatarBg = "#7c3aed";
        else if (categoryKey === "safety") avatarBg = "#059669";

        const initials = getMaterialInitials(material);

        content.innerHTML = `
            <div class="dossier-hero">
                <div class="dossier-avatar" style="background:${avatarBg};">
                    ${escapeHtml(initials)}
                </div>
                <div class="dossier-info">
                    <h3>
                        ${escapeHtml(material.name || 'Unnamed Material')}
                        <span class="category-pill ${categoryKey}" style="font-size:11px; vertical-align:middle; margin-left:6px;">
                            ${escapeHtml(material.category || 'GENERAL')}
                        </span>
                    </h3>
                    <p style="font-family:'JetBrains Mono', monospace; font-size:11.5px; color:#ff9944; font-weight:700;">
                        KEY: ${escapeHtml(material.code || ('MAT-' + material.id))}
                    </p>
                    <p style="margin-top:4px;">
                        ${escapeHtml(material.purchaseRequest || 'Verified construction material cataloged in the central inventory.')}
                    </p>
                </div>
            </div>

            <div class="dossier-meta-row">
                <div class="dossier-stat-box">
                    <span>Stock Level</span>
                    <strong style="color:${statusColor};">
                        <i class="${statusIcon}" style="font-size:14px; margin-right:4px;"></i>${escapeHtml(statusText)}
                    </strong>
                </div>
                <div class="dossier-stat-box">
                    <span>Available Quantity</span>
                    <strong style="color:#059669;">
                        ${formatNumber(quantity)} ${escapeHtml(material.unit || '')}
                    </strong>
                </div>
                <div class="dossier-stat-box">
                    <span>Unit Price</span>
                    <strong style="color:#1a56db;">
                        LKR ${price.toFixed(2)}
                    </strong>
                </div>
                <div class="dossier-stat-box">
                    <span>Stock Valuation</span>
                    <strong style="color:#0284c7;">
                        LKR ${formatMoney(stockValue)}
                    </strong>
                </div>
            </div>

            <div style="margin-top:14px;">
                <label style="font-size:12.5px; font-weight:700; color:#0f172a; display:block; margin-bottom:8px;">
                    Module Access &amp; Material Specifications Matrix:
                </label>
                <div class="dossier-perm-grid">
                    <div style="grid-column:1/-1; margin-top:6px; margin-bottom:2px; font-weight:700; color:#475569; font-size:12px; display:flex; align-items:center; gap:6px;">
                        <i class="bi bi-boxes" style="color:#ea580c;"></i> Inventory &amp; Stock Control
                    </div>
                    <div class="dossier-perm-item allowed">
                        <i class="bi bi-shield-check"></i>
                        <span>Minimum Stock: <strong>${formatNumber(threshold)} ${escapeHtml(material.unit || '')}</strong></span>
                    </div>
                    <div class="dossier-perm-item allowed">
                        <i class="bi bi-rulers"></i>
                        <span>Unit of Measure: <strong>${escapeHtml(material.unit || 'Units')}</strong></span>
                    </div>
                    <div class="dossier-perm-item ${statusItemClass}">
                        <i class="${statusIcon}"></i>
                        <span>Stock Health: <strong>${escapeHtml(statusText)}</strong></span>
                    </div>
                    <div class="dossier-perm-item allowed">
                        <i class="bi bi-calculator"></i>
                        <span>Cost Basis: <strong>Unit Price &times; Qty</strong></span>
                    </div>

                    <div style="grid-column:1/-1; margin-top:10px; margin-bottom:2px; font-weight:700; color:#475569; font-size:12px; display:flex; align-items:center; gap:6px;">
                        <i class="bi bi-truck" style="color:#ea580c;"></i> Procurement &amp; Supplier Information
                    </div>
                    <div class="dossier-perm-item allowed">
                        <i class="bi bi-building"></i>
                        <span>Supplier: <strong>${escapeHtml(material.supplier || 'Unassigned')}</strong></span>
                    </div>
                    <div class="dossier-perm-item allowed">
                        <i class="bi bi-tags"></i>
                        <span>Category: <strong>${escapeHtml(material.category || 'General')}</strong></span>
                    </div>
                    <div class="dossier-perm-item allowed">
                        <i class="bi bi-patch-check"></i>
                        <span>Delivery Status: <strong>${escapeHtml(material.deliveryStatus || 'DELIVERED')}</strong></span>
                    </div>
                    <div class="dossier-perm-item allowed">
                        <i class="bi bi-file-earmark-text"></i>
                        <span>Tracking ID: <strong>#${material.id} (${escapeHtml(material.code || 'N/A')})</strong></span>
                    </div>

                    <div style="grid-column:1/-1; margin-top:10px; margin-bottom:2px; font-weight:700; color:#475569; font-size:12px; display:flex; align-items:center; gap:6px;">
                        <i class="bi bi-clock-history" style="color:#ea580c;"></i> System &amp; Audit Traceability
                    </div>
                    <div class="dossier-perm-item allowed">
                        <i class="bi bi-calendar-check"></i>
                        <span>Created Date: <strong>${formatDate(material.createdAt)}</strong></span>
                    </div>
                    <div class="dossier-perm-item allowed">
                        <i class="bi bi-arrow-repeat"></i>
                        <span>Last Updated: <strong>${formatDate(material.updatedAt || material.createdAt)}</strong></span>
                    </div>
                </div>
            </div>
        `;

        if (stampEl) {
            stampEl.textContent = `Last synchronized: ${formatDate(material.updatedAt || material.createdAt || new Date())}`;
        }

    } catch (error) {
        console.error("View material error:", error);
        content.innerHTML = `
            <div style="text-align:center; padding:30px; color:#ef4444;">
                <i class="bi bi-exclamation-triangle" style="font-size:32px;"></i>
                <p style="margin-top:10px; font-weight:600;">Failed to load material dossier</p>
                <p style="font-size:12px; color:#64748b;">${escapeHtml(error.message || 'An unexpected error occurred.')}</p>
                <button type="button" class="secondary-btn" style="margin-top:10px;" onclick="viewMaterial(${id})">Retry</button>
            </div>
        `;
        showToast(error.message || "Unable to load material dossier.", "error");
    }
}

function getMaterialInitials(material) {
    if (material.code) {
        const clean = material.code.replace(/[^a-zA-Z]/g, "");
        if (clean.length >= 2) return clean.substring(0, 2).toUpperCase();
    }
    if (material.name) {
        const words = material.name.trim().split(/\s+/);
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        return material.name.substring(0, 2).toUpperCase();
    }
    return "MT";
}

function formatDate(dt) {
    if (!dt) return "N/A";
    const d = new Date(dt);
    if (isNaN(d.getTime())) return "N/A";
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function closeMaterialDossierModal() {
    const modal = document.getElementById("materialDossierModal");
    if (modal) {
        modal.classList.remove("open");
        modal.classList.remove("show");
    }
    currentDossierMaterialId = null;
}

function editMaterialFromDossier() {
    if (currentDossierMaterialId) {
        const idToEdit = currentDossierMaterialId;
        closeMaterialDossierModal();
        editMaterial(idToEdit);
    }
}

// Global modal dismiss listeners
window.addEventListener("click", function (event) {
    const dossierModal = document.getElementById("materialDossierModal");
    if (event.target === dossierModal) {
        closeMaterialDossierModal();
    }
});

// =========================================================
// STOCK OPERATIONS
// =========================================================

function openStockModal(operation) {
    stockOperation = operation;

    const title = document.getElementById("stockModalTitle");

    if (operation === "receive") {
        if (title) title.textContent = "Receive Stock (Add to Inventory)";
    } else if (operation === "issue") {
        if (title) title.textContent = "Issue Stock (Site Distribution)";
    } else {
        if (title) title.textContent = "Stock Adjustment (Audit/Recount)";
    }

    const form = document.getElementById("stockForm");
    if (form) {
        form.reset();
    }

    populateStockMaterials();

    const quantity = document.getElementById("stockQuantity");
    if (quantity) {
        if (operation === "adjust") {
            quantity.min = "0";
            quantity.step = "0.001";
        } else {
            quantity.min = "0.001";
            quantity.step = "0.001";
        }
    }

    const submitBtn = form?.querySelector("button[type='submit']");
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check-circle"></i> Confirm Transaction';
    }

    const modal = document.getElementById("stockModal");
    if (modal) {
        modal.classList.add("show");
    }
}

// =========================================================
// CLOSE STOCK MODAL
// =========================================================

function closeStockModal() {
    const modal = document.getElementById("stockModal");
    if (modal) {
        modal.classList.remove("show");
    }
}

// =========================================================
// POPULATE STOCK MATERIALS
// =========================================================

function populateStockMaterials() {
    const select = document.getElementById("stockMaterial");
    if (!select) return;

    const selectedValue = select.value;

    select.innerHTML = `<option value="">Select material from database...</option>`;

    materialsList.forEach(material => {
        const option = document.createElement("option");
        option.value = material.id;
        option.textContent = `${material.name} (${material.code || ("MAT-" + material.id)}) - Current: ${formatNumber(material.quantity || 0)} ${material.unit || ""}`;
        select.appendChild(option);
    });

    if (selectedValue) {
        select.value = selectedValue;
    }
}

// =========================================================
// PROCESS STOCK
// =========================================================

async function processStock(event) {
    event.preventDefault();

    if (isProcessingStock) {
        return;
    }

    const materialId = Number(document.getElementById("stockMaterial").value);
    const quantity = Number(document.getElementById("stockQuantity").value);
    const note = document.getElementById("stockNote")?.value.trim() || "";

    // Validate material
    if (!materialId) {
        showToast("Please select a material.", "error");
        return;
    }

    // Receive / Issue
    if (stockOperation !== "adjust" && quantity <= 0) {
        showToast("Enter a quantity greater than zero.", "error");
        return;
    }

    // Adjustment
    if (stockOperation === "adjust" && quantity < 0) {
        showToast("Stock quantity cannot be negative.", "error");
        return;
    }

    const material = materialsList.find(item => item.id === materialId);
    if (!material) {
        showToast("Material not found.", "error");
        return;
    }

    // Issue validation
    if (stockOperation === "issue" && quantity > Number(material.quantity || 0)) {
        showToast(
            `Cannot issue ${quantity} ${material.unit}. Available stock is only ${material.quantity} ${material.unit}.`,
            "error"
        );
        return;
    }

    const form = document.getElementById("stockForm");
    const submitButton = form?.querySelector("button[type='submit']");
    const originalText = submitButton?.innerHTML || "Confirm Transaction";

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = `<i class="bi bi-hourglass-split"></i> Processing...`;
    }

    isProcessingStock = true;

    try {
        let endpoint;
        let payload;

        if (stockOperation === "receive") {
            endpoint = `/api/materials/${materialId}/receive`;
            payload = {
                quantity: quantity,
                notes: note || null
            };
        } else if (stockOperation === "issue") {
            endpoint = `/api/materials/${materialId}/issue`;
            payload = {
                quantity: quantity,
                notes: note || null
            };
        } else {
            endpoint = `/api/materials/${materialId}/adjust`;
            payload = {
                newQuantity: quantity,
                notes: note || null
            };
        }

        const response = await fetch(endpoint, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(payload),
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(await getApiError(response));
        }

        const data = await response.json();

        // Immediately update local array
        const idx = materialsList.findIndex(item => item.id === materialId);
        if (idx !== -1) {
            materialsList[idx] = data;
        }

        // Immediately update all dashboard components
        updateStatistics();
        populateStockMaterials();
        renderMaterials();

        // If the dossier inspection modal was open for this material, update it too
        if (currentDossierMaterialId === materialId) {
            viewMaterial(materialId);
        }

        closeStockModal();

        if (stockOperation === "receive") {
            showToast(`Stock received successfully. New balance: ${data.quantity} ${data.unit}`, "success");
        } else if (stockOperation === "issue") {
            showToast(`Stock issued successfully. New balance: ${data.quantity} ${data.unit}`, "success");
        } else {
            showToast(`Stock adjusted successfully. New balance: ${data.quantity} ${data.unit}`, "success");
        }

        // Synchronize in background with verified backend state
        await loadMaterials(true);

    } catch (error) {
        console.error("Stock transaction error:", error);
        showToast(error.message || "Stock transaction failed.", "error");
    } finally {
        isProcessingStock = false;
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = originalText;
        }
    }
}

// =========================================================
// GENERATE REPORT
// =========================================================

function generateReport() {
    if (materialsList.length === 0) {
        showToast("No materials available for report.", "error");
        return;
    }

    const headers = [
        "Material Code",
        "Material Name",
        "Category",
        "Supplier",
        "Quantity",
        "Unit",
        "Unit Price (LKR)",
        "Stock Value (LKR)",
        "Minimum Stock",
        "Status"
    ];

    const rows = materialsList.map(material => {
        const quantity = Number(material.quantity || 0);
        const price = Number(material.unitPrice || 0);
        const stockValue =
            material.stockValue != null
                ? Number(material.stockValue)
                : quantity * price;

        return [
            material.code || ("MAT-" + material.id),
            material.name || "",
            material.category || "",
            material.supplier || "",
            quantity,
            material.unit || "",
            price.toFixed(2),
            stockValue.toFixed(2),
            material.stockThreshold ?? material.minimumStock ?? 0,
            getDisplayStatus(material)
        ];
    });

    const csv = [
        headers,
        ...rows
    ]
        .map(row =>
            row
                .map(value => `"${String(value).replace(/"/g, '""')}"`)
                .join(",")
        )
        .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `WBCMS-Material-Inventory-${getTodayDate()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    showToast("Inventory report generated successfully.", "success");
}

// =========================================================
// TOAST
// =========================================================

function showToast(message, type = "success") {
    if (typeof window.showToast === "function" && window.showToast !== showToast) {
        window.showToast(message, type);
        return;
    }

    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");

    if (!toast || !toastMessage) {
        alert(message);
        return;
    }

    toastMessage.textContent = message;
    toast.className = "toast show " + type;

    setTimeout(() => {
        toast.className = "toast";
    }, 4000);
}

// =========================================================
// API ERROR
// =========================================================

async function getApiError(response) {
    try {
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            const data = await response.json();
            if (data.message) return data.message;
            if (data.error) return data.error;
            if (data.errors) {
                if (typeof data.errors === "object") {
                    return Object.values(data.errors).join(" ");
                }
                return String(data.errors);
            }
        }

        const text = await response.text();
        return text || `Request failed (${response.status})`;
    } catch {
        return `Request failed (${response.status})`;
    }
}

// =========================================================
// UTILITY FUNCTIONS
// =========================================================

function getValue(id) {
    return document.getElementById(id)?.value?.trim() || "";
}

function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.value = value ?? "";
    }
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function formatNumber(value) {
    return new Intl.NumberFormat("en-US", {
        maximumFractionDigits: 3
    }).format(Number(value || 0));
}

function formatMoney(value) {
    return Number(value || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function getTodayDate() {
    return new Date().toISOString().split("T")[0];
}

function escapeHtml(text) {
    return String(text ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// =========================================================
// SIDEBAR
// =========================================================

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) {
        sidebar.classList.toggle("active");
    }
}

// =========================================================
// LOGOUT
// =========================================================

function logout() {
    if (!confirm("Are you sure you want to logout?")) {
        return;
    }

    localStorage.removeItem("wbcms_token");
    localStorage.removeItem("wbcms_user_type");
    localStorage.removeItem("wbcms_role");
    localStorage.removeItem("wbcms_username");
    localStorage.removeItem("wbcms_user");

    window.location.replace("/staff-login.html");
}