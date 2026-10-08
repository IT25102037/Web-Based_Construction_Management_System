/* =========================================================
   WBCMS - MATERIAL & INVENTORY MANAGEMENT
   Frontend CRUD Integration
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
// GLOBAL VARIABLES
// =========================================================

let materialsList = [];

let currentTab = "all";

let editingMaterialId = null;

let stockOperation = "receive";


// =========================================================
// PAGE INITIALIZATION
// =========================================================

document.addEventListener("DOMContentLoaded", function () {

    loadUserInformation();

    setupEventListeners();

    loadMaterials();

});


// =========================================================
// USER INFORMATION
// =========================================================

function loadUserInformation() {

    const profileName =
        document.getElementById("profileName");

    const profileRole =
        document.getElementById("profileRole");

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
// AUTH HEADERS
// =========================================================

function getAuthHeaders() {

    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + authToken
    };

}


// =========================================================
// EVENT LISTENERS
// =========================================================

function setupEventListeners() {

    const searchInput =
        document.getElementById("materialSearch");

    const globalSearch =
        document.getElementById("globalSearch");

    const categoryFilter =
        document.getElementById("categoryFilter");

    const statusFilter =
        document.getElementById("statusFilter");


    // Material search
    if (searchInput) {

        searchInput.addEventListener(
            "input",
            debounce(filterMaterials, 300)
        );

    }


    // Global search
    if (globalSearch) {

        globalSearch.addEventListener(
            "input",
            debounce(function () {

                if (searchInput) {

                    searchInput.value =
                        globalSearch.value;

                    filterMaterials();

                }

            }, 300)
        );

    }


    // Category
    if (categoryFilter) {

        categoryFilter.addEventListener(
            "change",
            filterMaterials
        );

    }


    // Status
    if (statusFilter) {

        statusFilter.addEventListener(
            "change",
            filterMaterials
        );

    }

}


// =========================================================
// LOAD MATERIALS
// READ FROM BACKEND / SQL SERVER
// =========================================================

async function loadMaterials() {

    const tableBody =
        document.getElementById("materialTableBody");

    const emptyTable =
        document.getElementById("emptyTable");


    // Loading message
    if (tableBody) {

        tableBody.innerHTML = `
            <tr>
                <td
                    colspan="11"
                    style="
                        text-align:center;
                        padding:40px;
                    "
                >

                    <i
                        class="bi bi-arrow-repeat"
                        style="
                            font-size:24px;
                            animation:spin 1s linear infinite;
                            display:inline-block;
                        "
                    ></i>

                    <p
                        style="
                            margin-top:10px;
                            color:#8a99ad;
                        "
                    >
                        Loading materials from database...
                    </p>

                </td>
            </tr>
        `;

    }


    try {

        /*
         * Existing backend endpoint:
         * GET /api/materials
         *
         * We request a large page because filtering
         * and pagination are handled on the frontend.
         */

        const response =
            await fetch(
                "/api/materials?page=0&size=200",
                {
                    method: "GET",
                    headers: getAuthHeaders()
                }
            );


        // Session expired
        if (
            response.status === 401 ||
            response.status === 403
        ) {

            showToast(
                "Session expired. Please login again.",
                "error"
            );

            setTimeout(() => {

                localStorage.removeItem(
                    "wbcms_token"
                );

                window.location.replace(
                    "/staff-login.html"
                );

            }, 1200);

            return;
        }


        if (!response.ok) {

            throw new Error(
                await getApiError(response)
            );

        }


        const data =
            await response.json();


        /*
         * Spring Boot Page response:
         *
         * {
         *   content: [...]
         * }
         */

        materialsList =
            Array.isArray(data)
                ? data
                : data.content || [];


        // Newest materials first
        materialsList.sort(
            (a, b) =>
                new Date(b.createdAt || 0) -
                new Date(a.createdAt || 0)
        );


        // Update UI
        updateStatistics();

        populateCategoryFilter();

        populateStockMaterials();

        renderMaterials();


    } catch (error) {

        console.error(
            "Error loading materials:",
            error
        );


        if (tableBody) {

            tableBody.innerHTML = `
                <tr>

                    <td
                        colspan="11"
                        style="
                            text-align:center;
                            padding:35px;
                            color:#f87171;
                        "
                    >

                        <i
                            class="bi bi-exclamation-triangle"
                            style="font-size:24px;"
                        ></i>

                        <p style="margin-top:8px;">
                            ${escapeHtml(error.message)}
                        </p>

                        <button
                            class="reset-button"
                            style="margin-top:10px;"
                            onclick="loadMaterials()"
                        >
                            Retry
                        </button>

                    </td>

                </tr>
            `;

        }

        if (emptyTable) {
            emptyTable.style.display = "none";
        }

    }

}


// =========================================================
// RENDER TABLE
// =========================================================

function renderMaterials() {

    const tableBody =
        document.getElementById("materialTableBody");

    const emptyTable =
        document.getElementById("emptyTable");

    const tableResult =
        document.getElementById("tableResult");


    if (!tableBody) {
        return;
    }


    const search =
        (
            document.getElementById(
                "materialSearch"
            )?.value || ""
        )
            .toLowerCase()
            .trim();


    const category =
        document.getElementById(
            "categoryFilter"
        )?.value || "";


    const status =
        document.getElementById(
            "statusFilter"
        )?.value || "";


    // =====================================================
    // FILTER
    // =====================================================

    const filtered =
        materialsList.filter(material => {

            const code =
                String(material.code || "")
                    .toLowerCase();

            const name =
                String(material.name || "")
                    .toLowerCase();

            const supplier =
                String(material.supplier || "")
                    .toLowerCase();

            const materialCategory =
                material.category || "";


            const itemStatus =
                getDisplayStatus(material);


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

                matchesTab =
                    itemStatus === "In Stock";

            }

            if (currentTab === "low") {

                matchesTab =
                    itemStatus === "Low Stock";

            }


            if (currentTab === "out") {

                matchesTab =
                    itemStatus === "Out of Stock";

            }


            if (currentTab === "recent") {

                matchesTab =
                    isRecentlyAdded(material);

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

        tableResult.textContent =
            `Showing ${filtered.length} of ${materialsList.length} materials`;

    }


    // Empty
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


    // =====================================================
    // TABLE ROWS
    // =====================================================

    filtered.forEach(
        (material, index) => {

            const statusText =
                getDisplayStatus(material);


            const statusClass =
                statusText === "In Stock"
                    ? "in-stock"
                    : statusText === "Low Stock"
                        ? "low-stock"
                        : "out-stock";


            const quantity =
                Number(material.quantity || 0);


            const price =
                Number(material.unitPrice || 0);


            const totalValue =
                material.stockValue != null
                    ? Number(material.stockValue)
                    : quantity * price;


            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>


                <td>

                    <span class="material-code">

                        ${escapeHtml(
                material.code ||
                "MAT-" + material.id
            )}

                    </span>

                </td>


                <td>

                    <span class="material-name">

                        ${escapeHtml(
                material.name ||
                "Unnamed Material"
            )}

                    </span>

                </td>


                <td>

                    ${escapeHtml(
                material.category ||
                "General"
            )}

                </td>


                <td>

                    <span class="supplier-name">

                        ${escapeHtml(
                material.supplier ||
                "N/A"
            )}

                    </span>

                </td>


                <td>

                    <strong>
                        ${formatNumber(quantity)}
                    </strong>

                </td>


                <td>

                    ${escapeHtml(
                material.unit ||
                "Units"
            )}

                </td>


                <td>

                    $${price.toFixed(2)}

                </td>


                <td>

                    $${formatMoney(totalValue)}

                </td>


                <td>

                    <span
                        class="status ${statusClass}"
                    >
                        ${statusText}
                    </span>

                </td>


                <td>

                    <div class="table-actions">

                        <button
                            class="table-action view"
                            title="View Details"
                            onclick="viewMaterial(${material.id})"
                        >

                            <i class="bi bi-eye"></i>

                        </button>


                        <button
                            class="table-action edit"
                            title="Edit Material"
                            onclick="editMaterial(${material.id})"
                        >

                            <i class="bi bi-pencil"></i>

                        </button>


                        <button
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

        }
    );

}


// =========================================================
// STOCK STATUS
// =========================================================

function getDisplayStatus(material) {

    const quantity =
        Number(material.quantity || 0);


    const threshold =
        Number(
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

    if (!material.createdAt) {
        return false;
    }


    const createdDate =
        new Date(material.createdAt);


    const now =
        new Date();


    const difference =
        now - createdDate;


    const thirtyDays =
        30 *
        24 *
        60 *
        60 *
        1000;


    return difference >= 0 &&
        difference <= thirtyDays;

}


// =========================================================
// UPDATE STATISTICS
// =========================================================

function updateStatistics() {

    const total =
        materialsList.length;


    const inStock =
        materialsList.filter(
            material =>
                getDisplayStatus(material) ===
                "In Stock"
        ).length;


    const lowStock =
        materialsList.filter(
            material =>
                getDisplayStatus(material) ===
                "Low Stock"
        ).length;


    const outStock =
        materialsList.filter(
            material =>
                getDisplayStatus(material) ===
                "Out of Stock"
        ).length;


    setText(
        "totalMaterials",
        total
    );


    setText(
        "inStock",
        inStock
    );


    setText(
        "lowStock",
        lowStock
    );


    /*
     * The existing UI calls this
     * "Pending Orders".
     *
     * Since the existing backend does not provide
     * a separate purchase-order endpoint,
     * we show out-of-stock count here.
     */

    setText(
        "pendingOrders",
        outStock
    );


    setText(
        "allCount",
        total
    );


    setText(
        "inStockCount",
        inStock
    );


    setText(
        "lowCount",
        lowStock
    );


    setText(
        "outCount",
        outStock
    );

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

    const search =
        document.getElementById(
            "materialSearch"
        );


    const category =
        document.getElementById(
            "categoryFilter"
        );


    const status =
        document.getElementById(
            "statusFilter"
        );


    const globalSearch =
        document.getElementById(
            "globalSearch"
        );


    if (search) {
        search.value = "";
    }


    if (category) {
        category.value = "";
    }


    if (status) {
        status.value = "";
    }


    if (globalSearch) {
        globalSearch.value = "";
    }


    currentTab = "all";


    document
        .querySelectorAll(".tab-button")
        .forEach(button =>
            button.classList.remove("active")
        );


    const firstTab =
        document.querySelector(
            ".tab-button"
        );


    if (firstTab) {
        firstTab.classList.add("active");
    }


    renderMaterials();

}


// =========================================================
// TAB CHANGE
// =========================================================

function changeTab(
    tab,
    button
) {

    currentTab = tab;


    document
        .querySelectorAll(".tab-button")
        .forEach(btn =>
            btn.classList.remove("active")
        );


    if (button) {
        button.classList.add("active");
    }


    renderMaterials();

}


// =========================================================
// LOW STOCK
// =========================================================

function showLowStock() {

    currentTab = "low";

    document
        .querySelectorAll(".tab-button")
        .forEach(btn =>
            btn.classList.remove("active")
        );

    const tabs =
        document.querySelectorAll(
            ".tab-button"
        );

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

    const select =
        document.getElementById(
            "categoryFilter"
        );


    if (!select) {
        return;
    }


    const selected =
        select.value;


    const categories =
        [
            ...new Set(
                materialsList
                    .map(
                        material =>
                            material.category
                    )
                    .filter(Boolean)
            )
        ].sort();


    select.innerHTML = `
        <option value="">
            All Categories
        </option>
    `;


    categories.forEach(category => {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            category;


        option.textContent =
            category;


        select.appendChild(option);

    });


    select.value =
        selected;

}


// =========================================================
// ADD MATERIAL
// =========================================================

function openMaterialModal() {

    editingMaterialId = null;


    const title =
        document.getElementById(
            "modalTitle"
        );


    if (title) {

        title.textContent =
            "Add New Material";

    }


    const form =
        document.getElementById(
            "materialForm"
        );


    if (form) {
        form.reset();
    }


    const id =
        document.getElementById(
            "materialId"
        );


    if (id) {
        id.value = "";
    }


    clearValidation();


    const modal =
        document.getElementById(
            "materialModal"
        );


    if (modal) {

        modal.classList.add(
            "show"
        );

    }

}


// =========================================================
// EDIT MATERIAL
// =========================================================

async function editMaterial(id) {

    try {

        /*
         * IMPORTANT:
         * We get the latest record from backend
         * instead of relying only on local data.
         */

        const response =
            await fetch(
                `/api/materials/${id}`,
                {
                    method: "GET",
                    headers: getAuthHeaders()
                }
            );


        if (!response.ok) {

            throw new Error(
                await getApiError(response)
            );

        }


        const material =
            await response.json();


        editingMaterialId =
            material.id;


        setValue(
            "materialId",
            material.id
        );


        setValue(
            "materialCode",
            material.code || ""
        );


        setValue(
            "materialName",
            material.name || ""
        );


        setValue(
            "materialCategory",
            material.category || ""
        );


        setValue(
            "materialUnit",
            material.unit || ""
        );


        setValue(
            "materialSupplier",
            material.supplier || ""
        );


        setValue(
            "materialQuantity",
            material.quantity ?? 0
        );


        setValue(
            "minimumStock",
            material.stockThreshold ??
            material.minimumStock ??
            0
        );


        setValue(
            "materialUnitPrice",
            material.unitPrice ?? 0
        );


        setValue(
            "materialDescription",
            material.purchaseRequest || ""
        );


        const title =
            document.getElementById(
                "modalTitle"
            );


        if (title) {

            title.textContent =
                "Edit Material";

        }


        clearValidation();


        const modal =
            document.getElementById(
                "materialModal"
            );


        if (modal) {

            modal.classList.add(
                "show"
            );

        }

    } catch (error) {

        console.error(
            "Edit material error:",
            error
        );


        showToast(
            error.message ||
            "Unable to load material.",
            "error"
        );

    }

}


// =========================================================
// CLOSE MATERIAL MODAL
// =========================================================

function closeMaterialModal() {

    const modal =
        document.getElementById(
            "materialModal"
        );


    if (modal) {

        modal.classList.remove(
            "show"
        );

    }

}


// =========================================================
// CREATE / UPDATE MATERIAL
// =========================================================

async function saveMaterial(event) {

    event.preventDefault();


    if (!validateMaterialForm()) {

        showToast(
            "Please correct the highlighted fields.",
            "error"
        );

        return;

    }


    const code =
        getValue("materialCode");


    const name =
        getValue("materialName");


    const category =
        getValue("materialCategory");


    const unit =
        getValue("materialUnit");


    const supplier =
        getValue("materialSupplier");


    const quantity =
        Number(
            getValue("materialQuantity")
        );


    const minimum =
        Number(
            getValue("minimumStock")
        );


    const unitPrice =
        Number(
            getValue("materialUnitPrice")
        );


    const description =
        getValue("materialDescription");


    /*
     * This payload matches your EXISTING backend DTO.
     */

    const payload = {

        code: code,

        name: name,

        category: category,

        quantity: quantity,

        unit: unit,

        supplier: supplier,

        unitPrice: unitPrice,

        stockThreshold: minimum,

        purchaseRequest:
            description || null,

        deliveryStatus:
            "DELIVERED"

    };


    // Duplicate code check
    if (code) {

        const duplicate =
            materialsList.some(
                material =>
                    material.code &&
                    material.code.toLowerCase() ===
                    code.toLowerCase() &&
                    material.id !==
                    editingMaterialId
            );


        if (duplicate) {

            showToast(
                "Material code already exists.",
                "error"
            );

            return;

        }

    }


    const form =
        document.getElementById(
            "materialForm"
        );


    const submitButton =
        form?.querySelector(
            "button[type='submit']"
        );


    const originalText =
        submitButton?.innerHTML ||
        "Save";


    if (submitButton) {

        submitButton.disabled = true;

        submitButton.innerHTML =
            `
                <i class="bi bi-hourglass-split"></i>
                Saving...
            `;

    }


    try {

        let url;

        let method;


        // UPDATE
        if (editingMaterialId) {

            url =
                `/api/materials/${editingMaterialId}`;

            method =
                "PUT";

        }

        // CREATE
        else {

            url =
                "/api/materials";

            method =
                "POST";

        }


        const response =
            await fetch(
                url,
                {
                    method: method,
                    headers: getAuthHeaders(),
                    body: JSON.stringify(payload)
                }
            );


        if (!response.ok) {

            throw new Error(
                await getApiError(response)
            );

        }


        await response.json();


        if (editingMaterialId) {

            showToast(
                "Successfully edited material!",
                "success"
            );

        } else {

            showToast(
                "Successfully added material!",
                "success"
            );

        }


        closeMaterialModal();


        editingMaterialId = null;


        await loadMaterials();


    } catch (error) {

        console.error(
            "Save material error:",
            error
        );


        showToast(
            error.message ||
            (editingMaterialId ? "Error editing material: Failed to update." : "Error adding material."),
            "error"
        );

    } finally {

        if (submitButton) {

            submitButton.disabled = false;

            submitButton.innerHTML =
                originalText;

        }

    }

}


// =========================================================
// VALIDATION
// =========================================================

function validateMaterialForm() {

    clearValidation();


    let valid = true;


    const code =
        document.getElementById(
            "materialCode"
        );


    const name =
        document.getElementById(
            "materialName"
        );


    const category =
        document.getElementById(
            "materialCategory"
        );


    const unit =
        document.getElementById(
            "materialUnit"
        );


    const supplier =
        document.getElementById(
            "materialSupplier"
        );


    const quantity =
        document.getElementById(
            "materialQuantity"
        );


    const minimum =
        document.getElementById(
            "minimumStock"
        );


    const unitPrice =
        document.getElementById(
            "materialUnitPrice"
        );


    // Code
    if (
        code &&
        !code.value.trim()
    ) {

        setError(
            code,
            "codeError",
            "Material code is required."
        );

        valid = false;

    }


    // Name
    if (
        name &&
        !name.value.trim()
    ) {

        setError(
            name,
            "nameError",
            "Material name is required."
        );

        valid = false;

    }


    // Category
    if (
        category &&
        !category.value
    ) {

        setError(
            category,
            "categoryError",
            "Please select a category."
        );

        valid = false;

    }


    // Unit
    if (
        unit &&
        !unit.value
    ) {

        setError(
            unit,
            "unitError",
            "Please select a unit."
        );

        valid = false;

    }


    // Supplier
    if (
        supplier &&
        !supplier.value.trim()
    ) {

        setError(
            supplier,
            "supplierError",
            "Supplier is required."
        );

        valid = false;

    }


    // Quantity
    if (
        quantity &&
        (
            quantity.value === "" ||
            Number(quantity.value) < 0
        )
    ) {

        setError(
            quantity,
            "quantityError",
            "Quantity cannot be negative."
        );

        valid = false;

    }


    // Minimum stock
    if (
        minimum &&
        (
            minimum.value === "" ||
            Number(minimum.value) < 0
        )
    ) {

        setError(
            minimum,
            "minimumError",
            "Minimum stock cannot be negative."
        );

        valid = false;

    }


    // Unit price
    if (
        unitPrice &&
        (
            unitPrice.value === "" ||
            Number(unitPrice.value) < 0
        )
    ) {

        setError(
            unitPrice,
            "priceError",
            "Unit price cannot be negative."
        );

        valid = false;

    }


    return valid;

}


function setError(
    input,
    errorId,
    message
) {

    if (input) {
        input.classList.add("error");
    }


    const error =
        document.getElementById(
            errorId
        );


    if (error) {
        error.textContent =
            message;
    }

}


function clearValidation() {

    document
        .querySelectorAll(
            ".validation-message"
        )
        .forEach(
            element =>
                element.textContent = ""
        );


    document
        .querySelectorAll(
            ".form-group input, .form-group select, .form-group textarea"
        )
        .forEach(
            element =>
                element.classList.remove(
                    "error"
                )
        );

}


// =========================================================
// DELETE MATERIAL
// =========================================================

async function deleteMaterial(id) {

    const material =
        materialsList.find(
            item => item.id === id
        );


    if (!material) {
        return;
    }


    const confirmed =
        confirm(
            `Are you sure you want to delete "${material.name}"?\n\nThis will permanently remove the material record.`
        );


    if (!confirmed) {
        return;
    }


    try {

        const response =
            await fetch(
                `/api/materials/${id}`,
                {
                    method: "DELETE",
                    headers: getAuthHeaders()
                }
            );


        if (!response.ok) {

            throw new Error(
                await getApiError(response)
            );

        }


        showToast(
            "Successfully deleted material!",
            "success"
        );


        await loadMaterials();


    } catch (error) {

        console.error(
            "Delete error:",
            error
        );


        showToast(
            error.message ||
            "Error deleting material.",
            "error"
        );

    }

}


// =========================================================
// VIEW MATERIAL
// =========================================================

async function viewMaterial(id) {

    try {

        /*
         * Read the latest material directly
         * from backend.
         */

        const response =
            await fetch(
                `/api/materials/${id}`,
                {
                    method: "GET",
                    headers: getAuthHeaders()
                }
            );


        if (!response.ok) {

            throw new Error(
                await getApiError(response)
            );

        }


        const material =
            await response.json();


        const quantity =
            Number(material.quantity || 0);


        const price =
            Number(material.unitPrice || 0);


        const stockValue =
            material.stockValue != null
                ? Number(material.stockValue)
                : quantity * price;


        const status =
            getDisplayStatus(material);


        const details = `

MATERIAL DETAILS

--------------------------------

Material ID:
${material.id}

Material Code:
${material.code || "MAT-" + material.id}

Material Name:
${material.name || "N/A"}

Category:
${material.category || "General"}

Supplier:
${material.supplier || "N/A"}

Current Stock:
${formatNumber(quantity)}
${material.unit || ""}

Minimum Stock:
${formatNumber(
            material.stockThreshold ??
            material.minimumStock ??
            0
        )}

Unit Price:
$${price.toFixed(2)}

Total Stock Value:
$${formatMoney(stockValue)}

Status:
${status}

Description:
${material.purchaseRequest || "No description"}

Created:
${
            material.createdAt
                ? new Date(
                    material.createdAt
                ).toLocaleString()
                : "N/A"
        }

--------------------------------
        `;


        alert(details);


    } catch (error) {

        console.error(
            "View material error:",
            error
        );


        showToast(
            error.message ||
            "Unable to load material.",
            "error"
        );

    }

}


// =========================================================
// STOCK OPERATIONS
// =========================================================

function openStockModal(operation) {

    stockOperation =
        operation;


    const title =
        document.getElementById(
            "stockModalTitle"
        );


    if (operation === "receive") {

        if (title) {

            title.textContent =
                "Receive Stock (Add to Inventory)";

        }

    }


    else if (operation === "issue") {

        if (title) {

            title.textContent =
                "Issue Stock (Site Distribution)";

        }

    }


    else {

        if (title) {

            title.textContent =
                "Stock Adjustment (Audit/Recount)";

        }

    }


    const form =
        document.getElementById(
            "stockForm"
        );


    if (form) {
        form.reset();
    }


    populateStockMaterials();


    const quantity =
        document.getElementById(
            "stockQuantity"
        );


    /*
     * Adjustment can be zero.
     * Receive / Issue must be greater than zero.
     */

    if (quantity) {

        if (operation === "adjust") {

            quantity.min = "0";

        } else {

            quantity.min = "0.01";

        }

    }


    const modal =
        document.getElementById(
            "stockModal"
        );


    if (modal) {

        modal.classList.add(
            "show"
        );

    }

}


// =========================================================
// CLOSE STOCK MODAL
// =========================================================

function closeStockModal() {

    const modal =
        document.getElementById(
            "stockModal"
        );


    if (modal) {

        modal.classList.remove(
            "show"
        );

    }

}


// =========================================================
// POPULATE STOCK MATERIALS
// =========================================================

function populateStockMaterials() {

    const select =
        document.getElementById(
            "stockMaterial"
        );


    if (!select) {
        return;
    }


    select.innerHTML = `
        <option value="">
            Select material from database...
        </option>
    `;


    materialsList.forEach(material => {

        const option =
            document.createElement(
                "option"
            );


        option.value =
            material.id;


        option.textContent =
            `${material.name}
             (${material.code || "MAT-" + material.id})
             - Current:
             ${formatNumber(material.quantity || 0)}
             ${material.unit || ""}`;


        select.appendChild(
            option
        );

    });

}


// =========================================================
// PROCESS STOCK
// =========================================================

async function processStock(event) {

    event.preventDefault();


    const materialId =
        Number(
            document.getElementById(
                "stockMaterial"
            ).value
        );


    const quantity =
        Number(
            document.getElementById(
                "stockQuantity"
            ).value
        );


    const note =
        document.getElementById(
            "stockNote"
        )?.value.trim() || "";


    // Validate material
    if (!materialId) {

        showToast(
            "Please select a material.",
            "error"
        );

        return;

    }


    // Receive / Issue
    if (
        stockOperation !== "adjust" &&
        quantity <= 0
    ) {

        showToast(
            "Enter a quantity greater than zero.",
            "error"
        );

        return;

    }


    // Adjustment
    if (
        stockOperation === "adjust" &&
        quantity < 0
    ) {

        showToast(
            "Stock quantity cannot be negative.",
            "error"
        );

        return;

    }


    const material =
        materialsList.find(
            item =>
                item.id === materialId
        );


    if (!material) {

        showToast(
            "Material not found.",
            "error"
        );

        return;

    }


    // Issue validation
    if (
        stockOperation === "issue" &&
        quantity >
        Number(material.quantity || 0)
    ) {

        showToast(
            `Cannot issue ${quantity} ${material.unit}. Available stock is only ${material.quantity} ${material.unit}.`,
            "error"
        );

        return;

    }


    const form =
        document.getElementById(
            "stockForm"
        );


    const submitButton =
        form?.querySelector(
            "button[type='submit']"
        );


    const originalText =
        submitButton?.innerHTML ||
        "Confirm Transaction";


    if (submitButton) {

        submitButton.disabled = true;

        submitButton.innerHTML =
            `
                <i class="bi bi-hourglass-split"></i>
                Processing...
            `;

    }


    try {

        let endpoint;


        let payload;


        // RECEIVE
        if (
            stockOperation === "receive"
        ) {

            endpoint =
                `/api/materials/${materialId}/receive`;


            payload = {

                quantity: quantity,

                notes:
                    note || null

            };

        }


        // ISSUE
        else if (
            stockOperation === "issue"
        ) {

            endpoint =
                `/api/materials/${materialId}/issue`;


            payload = {

                quantity: quantity,

                notes:
                    note || null

            };

        }


        // ADJUST
        else {

            endpoint =
                `/api/materials/${materialId}/adjust`;


            payload = {

                newQuantity:
                quantity,

                notes:
                    note || null

            };

        }


        const response =
            await fetch(
                endpoint,
                {
                    method: "POST",
                    headers: getAuthHeaders(),
                    body: JSON.stringify(payload)
                }
            );


        if (!response.ok) {

            throw new Error(
                await getApiError(response)
            );

        }


        const data =
            await response.json();


        closeStockModal();


        if (
            stockOperation === "receive"
        ) {

            showToast(
                `Stock received successfully. New balance: ${data.quantity} ${data.unit}`,
                "success"
            );

        }


        else if (
            stockOperation === "issue"
        ) {

            showToast(
                `Stock issued successfully. New balance: ${data.quantity} ${data.unit}`,
                "success"
            );

        }


        else {

            showToast(
                `Stock adjusted successfully. New balance: ${data.quantity} ${data.unit}`,
                "success"
            );

        }


        await loadMaterials();


    } catch (error) {

        console.error(
            "Stock transaction error:",
            error
        );


        showToast(
            error.message ||
            "Stock transaction failed.",
            "error"
        );

    } finally {

        if (submitButton) {

            submitButton.disabled = false;

            submitButton.innerHTML =
                originalText;

        }

    }

}


// =========================================================
// GENERATE REPORT
// =========================================================

function generateReport() {

    if (materialsList.length === 0) {

        showToast(
            "No materials available for report.",
            "error"
        );

        return;

    }


    const headers = [

        "Material Code",

        "Material Name",

        "Category",

        "Supplier",

        "Quantity",

        "Unit",

        "Unit Price",

        "Stock Value",

        "Minimum Stock",

        "Status"

    ];


    const rows =
        materialsList.map(material => {

            const quantity =
                Number(
                    material.quantity || 0
                );


            const price =
                Number(
                    material.unitPrice || 0
                );


            const stockValue =
                material.stockValue != null
                    ? Number(material.stockValue)
                    : quantity * price;


            return [

                material.code ||
                "MAT-" + material.id,

                material.name || "",

                material.category || "",

                material.supplier || "",

                quantity,

                material.unit || "",

                price.toFixed(2),

                stockValue.toFixed(2),

                material.stockThreshold ??
                material.minimumStock ??
                0,

                getDisplayStatus(material)

            ];

        });


    const csv =
        [
            headers,
            ...rows
        ]
            .map(row =>
                row
                    .map(value =>
                        `"${String(value)
                            .replace(/"/g, '""')}"`
                    )
                    .join(",")
            )
            .join("\n");


    const blob =
        new Blob(
            [csv],
            {
                type:
                    "text/csv;charset=utf-8;"
            }
        );


    const url =
        URL.createObjectURL(
            blob
        );


    const link =
        document.createElement("a");


    link.href =
        url;


    link.download =
        `WBCMS-Material-Inventory-${getTodayDate()}.csv`;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();


    URL.revokeObjectURL(
        url
    );


    showToast(
        "Inventory report generated successfully.",
        "success"
    );

}


// =========================================================
// TOAST
// =========================================================

function showToast(
    message,
    type = "success"
) {

    const toast =
        document.getElementById(
            "toast"
        );


    const toastMessage =
        document.getElementById(
            "toastMessage"
        );


    if (!toast ||
        !toastMessage) {

        // Fallback
        alert(message);

        return;

    }


    toastMessage.textContent =
        message;


    toast.className =
        "toast show " + type;


    setTimeout(
        () => {

            toast.className =
                "toast";

        },
        4000
    );

}


// =========================================================
// API ERROR
// =========================================================

async function getApiError(response) {

    try {

        const data =
            await response.json();


        if (data.message) {
            return data.message;
        }


        if (data.error) {
            return data.error;
        }


        if (data.errors) {

            if (
                typeof data.errors ===
                "object"
            ) {

                return Object
                    .values(data.errors)
                    .join(" ");

            }

            return String(
                data.errors
            );

        }


        return (
            `Request failed (${response.status})`
        );


    } catch {

        return (
            `Request failed (${response.status})`
        );

    }

}


// =========================================================
// UTILITY FUNCTIONS
// =========================================================

function getValue(id) {

    return (
        document.getElementById(id)
            ?.value
            ?.trim() || ""
    );

}


function setValue(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.value =
            value ?? "";

    }

}


function setText(
    id,
    value
) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;

    }

}


function formatNumber(value) {

    return new Intl.NumberFormat(
        "en-US",
        {
            maximumFractionDigits: 3
        }
    ).format(
        Number(value || 0)
    );

}


function formatMoney(value) {

    return Number(
        value || 0
    ).toLocaleString(
        "en-US",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

}


function getTodayDate() {

    return new Date()
        .toISOString()
        .split("T")[0];

}


function escapeHtml(text) {

    return String(
        text ?? ""
    )
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


function debounce(
    fn,
    delay
) {

    let timer;


    return function (...args) {

        clearTimeout(timer);


        timer =
            setTimeout(
                () =>
                    fn.apply(
                        this,
                        args
                    ),
                delay
            );

    };

}


// =========================================================
// SIDEBAR
// =========================================================

function toggleSidebar() {

    const sidebar =
        document.getElementById(
            "sidebar"
        );


    if (sidebar) {

        sidebar.classList.toggle(
            "active"
        );

    }

}


// =========================================================
// LOGOUT
// =========================================================

function logout() {

    if (
        !confirm(
            "Are you sure you want to logout?"
        )
    ) {

        return;

    }


    localStorage.removeItem(
        "wbcms_token"
    );


    localStorage.removeItem(
        "wbcms_user_type"
    );


    localStorage.removeItem(
        "wbcms_role"
    );


    localStorage.removeItem(
        "wbcms_username"
    );


    localStorage.removeItem(
        "wbcms_user"
    );


    window.location.replace(
        "/staff-login.html"
    );

}