const API_URL = "/api/material-requests";

let allRequestsList = [];
let activeDeleteRequestId = null;
let isSavingRequest = false;
let isDeletingRequest = false;
let loadRequestsSeq = 0;

// ===============================
// AUTHENTICATION
// ===============================

const token = localStorage.getItem("wbcms_token");
const userType = localStorage.getItem("wbcms_user_type");

if (!token || userType !== "STAFF") {
    window.location.replace("/staff-login.html");
}

// ===============================
// PAGE LOAD
// ===============================

let syncPollInterval = null;

document.addEventListener("DOMContentLoaded", () => {
    loadUserProfile();
    loadRequests();
    loadSupplierSuggestions();
    startLiveSync();

    const form = document.getElementById("requestForm");
    if (form) {
        form.addEventListener("submit", saveRequest);
    }

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", debounce(() => {
            renderRequests();
        }, 200));
    }

    const statusFilter = document.getElementById("statusFilter");
    if (statusFilter) {
        statusFilter.addEventListener("change", () => {
            renderRequests();
        });
    }

    // Outside-click dismissal for modals
    window.addEventListener("click", event => {
        if (event.target && event.target.classList.contains("modal-overlay")) {
            closeModal();
            closeViewModal();
            closeDeleteModal();
        }
    });

    // Escape key dismissal
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeModal();
            closeViewModal();
            closeDeleteModal();
        }
    });
});

function startLiveSync() {
    if (syncPollInterval) clearInterval(syncPollInterval);
    // Poll every 4 seconds to synchronize supplier decisions and new requisitions automatically
    syncPollInterval = setInterval(() => {
        loadRequests(true);
    }, 4000);
}

// ===============================
// USER PROFILE DISPLAY
// ===============================

function loadUserProfile() {
    const username = localStorage.getItem("wbcms_username") || "Staff User";
    const role = localStorage.getItem("wbcms_role") || localStorage.getItem("wbcms_staff_role") || "Procurement Operations";

    const pName = document.getElementById("profileName");
    const pRole = document.getElementById("profileRole");
    const dName = document.getElementById("dropdownUserName");

    if (pName) pName.textContent = username;
    if (dName) dName.textContent = username;
    if (pRole) {
        pRole.textContent = role
            .toLowerCase()
            .replace(/_/g, " ")
            .replace(/\b\w/g, c => c.toUpperCase());
    }
}

// ===============================
// API HEADERS
// ===============================

function getHeaders() {
    const currentToken = localStorage.getItem("wbcms_token") || token;
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + currentToken,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache"
    };
}

// ===============================
// LOAD REQUESTS
// ===============================

async function loadRequests(isSilent = false) {
    const currentSeq = ++loadRequestsSeq;
    const tbody = document.getElementById("requestTableBody");

    if (!isSilent && tbody && allRequestsList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding: 40px;">
                    <i class="bi bi-arrow-repeat" style="font-size: 24px; animation: spin 1s linear infinite; display: inline-block; color:var(--orange);"></i>
                    <p style="margin-top: 8px; color: #8a99ad;">Loading material requests from SQL Server...</p>
                </td>
            </tr>
        `;
    }

    try {
        const url = `${API_URL}?page=0&size=200&_t=${Date.now()}`;
        const response = await fetch(url, {
            headers: getHeaders(),
            cache: "no-store"
        });

        if (currentSeq !== loadRequestsSeq) return;

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

        // Sort newest first by requiredDate or ID
        loadedList.sort((a, b) => {
            const timeA = new Date(a.requiredDate || 0).getTime();
            const timeB = new Date(b.requiredDate || 0).getTime();
            if (timeB !== timeA) return timeB - timeA;
            return (b.id || 0) - (a.id || 0);
        });

        // Detect if any status changed while running silent sync
        if (isSilent && allRequestsList.length > 0) {
            loadedList.forEach(fresh => {
                const prev = allRequestsList.find(r => r.id === fresh.id);
                if (prev && prev.status !== fresh.status) {
                    showToast(`Requisition #${fresh.requestCode} was updated to ${formatStatus(fresh.status)}!`, "info");
                }
            });
        }

        allRequestsList = loadedList;

        updateStatistics();
        renderRequests();
    } catch (error) {
        if (currentSeq !== loadRequestsSeq) return;
        console.error("Load requests error:", error);
        if (tbody && allRequestsList.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align:center; padding: 35px; color:#ef4444;">
                        <i class="bi bi-exclamation-triangle" style="font-size:24px;"></i>
                        <p style="margin-top:8px;">${escapeHtml(error.message || "Failed to load material requests.")}</p>
                        <button type="button" class="action-button" style="margin-top:10px;" onclick="loadRequests()">Retry</button>
                    </td>
                </tr>
            `;
        }
        if (isSilent) {
            // Silently log in background without disruption
            console.debug("Silent background sync:", error.message);
        }
    }
}

// ===============================
// RENDER TABLE
// ===============================

function renderRequests() {
    const tbody = document.getElementById("requestTableBody");
    const emptyMessage = document.getElementById("emptyMessage");
    if (!tbody) return;

    const searchInput = document.getElementById("searchInput");
    const statusFilter = document.getElementById("statusFilter");

    const search = searchInput ? searchInput.value.toLowerCase().trim() : "";
    const status = statusFilter ? statusFilter.value.toUpperCase().trim() : "";

    const filtered = allRequestsList.filter(request => {
        const text = [
            request.requestCode,
            request.materialName,
            request.projectName,
            request.requestedBy,
            request.reason
        ].filter(Boolean).join(" ").toLowerCase();

        const matchSearch = !search || text.includes(search);
        const matchStatus = !status || (request.status || "").toUpperCase() === status;

        return matchSearch && matchStatus;
    });

    tbody.innerHTML = "";

    if (filtered.length === 0) {
        if (emptyMessage) emptyMessage.style.display = "block";
        return;
    }

    if (emptyMessage) emptyMessage.style.display = "none";

    filtered.forEach(request => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>
                <span style="font-weight:700; color:var(--blue-primary, #1a56db); font-family:monospace; background:#eff6ff; padding:3px 8px; border-radius:6px; border:1px solid #dbeafe;">
                    ${escapeHtml(request.requestCode)}
                </span>
            </td>
            <td>
                <strong style="color:var(--text-title, #0f172a); font-weight:600;">
                    ${escapeHtml(request.materialName)}
                </strong>
            </td>
            <td>
                <span style="font-weight:600;">${request.quantity}</span>
                <span style="font-size:12px; color:#64748b;">${escapeHtml(request.unit)}</span>
            </td>
            <td>
                <span style="color:#334155; font-size:13px;">
                    <i class="bi bi-building" style="margin-right:4px; color:#64748b;"></i>${escapeHtml(request.projectName)}
                </span>
            </td>
            <td>
                <span style="color:#475569; font-size:13px;">
                    <i class="bi bi-person" style="margin-right:4px; color:#64748b;"></i>${escapeHtml(request.requestedBy)}
                </span>
            </td>
            <td>
                ${request.supplierName ? `
                    <span style="font-size:12.5px; font-weight:600; color:#0f172a; display:inline-flex; align-items:center; gap:5px;">
                        <i class="bi bi-truck" style="color:#2563eb;"></i>${escapeHtml(request.supplierName)}
                    </span>
                ` : `
                    <span style="font-size:12px; color:#94a3b8; font-style:italic;">Open / Any Vendor</span>
                `}
            </td>
            <td>
                <span style="color:#475569; font-size:12.5px;">
                    <i class="bi bi-calendar3" style="margin-right:4px; color:#64748b;"></i>${request.requiredDate || "-"}
                </span>
            </td>
            <td>
                <span class="status ${getStatusClass(request.status)}">
                    ${formatStatus(request.status)}
                </span>
            </td>
            <td class="actions">
                <button type="button" class="view-btn" onclick="viewRequest(${request.id})" title="View Details">
                    <i class="bi bi-eye"></i> View
                </button>
                <button type="button" class="edit-btn" onclick="editRequest(${request.id})" title="Edit Request">
                    <i class="bi bi-pencil"></i> Edit
                </button>
                <button type="button" class="delete-btn" onclick="deleteRequest(${request.id})" title="Delete Request">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

// ===============================
// STATISTICS
// ===============================

function updateStatistics() {
    const total = allRequestsList.length;
    const pending = allRequestsList.filter(r => (r.status || "").toUpperCase() === "PENDING").length;
    const approved = allRequestsList.filter(r => {
        const s = (r.status || "").toUpperCase();
        return s === "APPROVED" || s === "ACCEPTED";
    }).length;
    const fulfilled = allRequestsList.filter(r => (r.status || "").toUpperCase() === "FULFILLED").length;

    const totalEl = document.getElementById("totalRequests");
    const pendingEl = document.getElementById("pendingRequests");
    const approvedEl = document.getElementById("approvedRequests");
    const fulfilledEl = document.getElementById("fulfilledRequests");

    if (totalEl) totalEl.textContent = total;
    if (pendingEl) pendingEl.textContent = pending;
    if (approvedEl) approvedEl.textContent = approved;
    if (fulfilledEl) fulfilledEl.textContent = fulfilled;
}

// ===============================
// CREATE MODAL
// ===============================

function generateNextRequestCode() {
    const yr = new Date().getFullYear();
    let num = (allRequestsList ? allRequestsList.length : 0) + 1;
    let candidate = `REQ-${yr}-${num.toString().padStart(3, "0")}`;
    while (allRequestsList && allRequestsList.some(r => r.requestCode === candidate)) {
        num++;
        candidate = `REQ-${yr}-${num.toString().padStart(3, "0")}`;
    }
    return candidate;
}

function openCreateModal() {
    loadSupplierSuggestions();
    const form = document.getElementById("requestForm");
    if (form) form.reset();

    const titleEl = document.getElementById("modalTitle");
    const subEl = document.getElementById("modalSubtitle");
    const idEl = document.getElementById("requestId");
    const statusEl = document.getElementById("status");
    const saveBtn = document.getElementById("saveRequestBtn");

    if (titleEl) titleEl.textContent = "New Material Request";
    if (subEl) subEl.textContent = "Fill in the requisition details and procurement parameters below.";
    if (idEl) idEl.value = "";
    if (statusEl) statusEl.value = "PENDING";

    const reqCodeInput = document.getElementById("requestCode");
    if (reqCodeInput) {
        reqCodeInput.value = generateNextRequestCode();
    }

    const supplierEl = document.getElementById("supplierName");
    if (supplierEl) supplierEl.value = "";

    // Auto set date to today if blank
    const dateInput = document.getElementById("requiredDate");
    if (dateInput && !dateInput.value) {
        const today = new Date().toISOString().split("T")[0];
        dateInput.value = today;
    }

    if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="bi bi-check-lg"></i> <span>Save Request</span>';
    }

    const modal = document.getElementById("requestModal");
    if (modal) modal.classList.add("show");
}

// ===============================
// CLOSE MODALS
// ===============================

function closeModal() {
    const modal = document.getElementById("requestModal");
    if (modal) modal.classList.remove("show");
}

function closeViewModal() {
    const modal = document.getElementById("viewRequestModal");
    if (modal) modal.classList.remove("show");
}

function closeDeleteModal() {
    activeDeleteRequestId = null;
    const modal = document.getElementById("deleteRequestModal");
    if (modal) modal.classList.remove("show");
}

// ===============================
// SAVE REQUEST (CREATE / EDIT)
// ===============================

async function saveRequest(event) {
    event.preventDefault();

    if (isSavingRequest) {
        return;
    }

    const id = document.getElementById("requestId").value.trim();
    const isEdit = Boolean(id);

    const requestCode = document.getElementById("requestCode").value.trim();
    const materialName = document.getElementById("materialName").value.trim();
    const quantityVal = document.getElementById("quantity").value;
    const quantity = parseFloat(quantityVal);
    const unit = document.getElementById("unit").value.trim();
    const projectName = document.getElementById("projectName").value.trim();
    const requestedBy = document.getElementById("requestedBy").value.trim();
    const requiredDate = document.getElementById("requiredDate").value;
    const reason = document.getElementById("reason").value.trim();
    const status = document.getElementById("status").value;

    if (!requestCode) {
        showToast("Request code is required.", "error");
        return;
    }
    if (!materialName) {
        showToast("Material name is required.", "error");
        return;
    }
    if (isNaN(quantity) || quantity <= 0) {
        showToast("Quantity must be greater than zero.", "error");
        return;
    }
    if (!unit) {
        showToast("Unit of measure is required.", "error");
        return;
    }
    if (!projectName) {
        showToast("Project name is required.", "error");
        return;
    }
    if (!requestedBy) {
        showToast("Requested by is required.", "error");
        return;
    }
    if (!requiredDate) {
        showToast("Required by date is required.", "error");
        return;
    }

    const supplierName = document.getElementById("supplierName")?.value.trim() || null;

    const requestData = {
        requestCode,
        materialName,
        quantity,
        unit,
        projectName,
        requestedBy,
        requiredDate,
        reason: reason || null,
        status: status || "PENDING",
        supplierName: supplierName || null
    };

    const saveBtn = document.getElementById("saveRequestBtn");
    const originalBtnHtml = isEdit
        ? '<i class="bi bi-pencil-square"></i> <span>Edit Request</span>'
        : '<i class="bi bi-check-lg"></i> <span>Save Request</span>';

    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = isEdit
            ? '<i class="bi bi-arrow-repeat spin"></i> <span>Updating Request...</span>'
            : '<i class="bi bi-arrow-repeat spin"></i> <span>Saving...</span>';
    }

    isSavingRequest = true;

    try {
        const url = isEdit ? `${API_URL}/${id}` : API_URL;
        const method = isEdit ? "PUT" : "POST";

        const response = await fetch(url, {
            method,
            headers: getHeaders(),
            body: JSON.stringify(requestData),
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(await getApiError(response));
        }

        const savedItem = await response.json();

        // Update local state immediately
        if (isEdit) {
            const idx = allRequestsList.findIndex(r => r.id === Number(id));
            if (idx !== -1) {
                allRequestsList[idx] = savedItem;
            } else {
                allRequestsList.unshift(savedItem);
            }
        } else {
            allRequestsList.unshift(savedItem);
            // Clear search and filter so the newly created request is immediately visible
            const searchInput = document.getElementById("searchInput");
            const statusFilter = document.getElementById("statusFilter");
            if (searchInput) searchInput.value = "";
            if (statusFilter) statusFilter.value = "";
        }

        // Re-sort newest first
        allRequestsList.sort((a, b) => {
            const timeA = new Date(a.requiredDate || 0).getTime();
            const timeB = new Date(b.requiredDate || 0).getTime();
            if (timeB !== timeA) return timeB - timeA;
            return (b.id || 0) - (a.id || 0);
        });

        // Immediately update all dashboard counters and table
        updateStatistics();
        renderRequests();

        closeModal();

        showToast(
            isEdit ? "Successfully updated request!" : "Successfully created request!",
            "success"
        );

        // Synchronize in background with verified server state
        await loadRequests(true);
    } catch (error) {
        console.error("Save request error:", error);
        showToast(
            error.message || (isEdit ? "Error editing request: Failed to update." : "Error creating request: Failed to save."),
            "error"
        );
    } finally {
        isSavingRequest = false;
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalBtnHtml;
        }
    }
}

// ===============================
// EDIT REQUEST
// ===============================

async function editRequest(id) {
    loadSupplierSuggestions();
    try {
        let request = allRequestsList.find(r => r.id === id);

        // Fetch fresh data from API with cache-busting
        const response = await fetch(`${API_URL}/${id}?_t=${Date.now()}`, {
            headers: getHeaders(),
            cache: "no-store"
        });

        if (response.ok) {
            request = await response.json();
            // Update in local state
            const idx = allRequestsList.findIndex(r => r.id === id);
            if (idx !== -1) allRequestsList[idx] = request;
        } else if (!request) {
            throw new Error(await getApiError(response));
        }

        const titleEl = document.getElementById("modalTitle");
        const subEl = document.getElementById("modalSubtitle");
        const saveBtn = document.getElementById("saveRequestBtn");

        if (titleEl) titleEl.textContent = "Edit Material Request";
        if (subEl) subEl.textContent = "Update requisition parameters and procurement status.";

        document.getElementById("requestId").value = request.id;
        document.getElementById("requestCode").value = request.requestCode || "";
        document.getElementById("materialName").value = request.materialName || "";
        document.getElementById("quantity").value = request.quantity != null ? request.quantity : "";
        document.getElementById("unit").value = request.unit || "";
        document.getElementById("projectName").value = request.projectName || "";
        document.getElementById("requestedBy").value = request.requestedBy || "";
        document.getElementById("requiredDate").value = request.requiredDate || "";
        document.getElementById("reason").value = request.reason || "";
        document.getElementById("status").value = request.status || "PENDING";
        const supplierInput = document.getElementById("supplierName");
        if (supplierInput) supplierInput.value = request.supplierName || "";

        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="bi bi-pencil-square"></i> <span>Edit Request</span>';
        }

        // Close view modal if it was open
        closeViewModal();

        const modal = document.getElementById("requestModal");
        if (modal) modal.classList.add("show");
    } catch (error) {
        console.error("Edit request error:", error);
        showToast(error.message || "Failed to load request for editing.", "error");
    }
}

// ===============================
// VIEW REQUEST DETAILS
// ===============================

async function viewRequest(id) {
    let request = allRequestsList.find(r => r.id === id);

    try {
        const response = await fetch(`${API_URL}/${id}?_t=${Date.now()}`, {
            headers: getHeaders(),
            cache: "no-store"
        });
        if (response.ok) {
            request = await response.json();
            const idx = allRequestsList.findIndex(r => r.id === id);
            if (idx !== -1) allRequestsList[idx] = request;
        }
    } catch (_) {}

    if (!request) {
        showToast("Request details not found.", "error");
        return;
    }

    const codeEl = document.getElementById("viewReqCode");
    const statusEl = document.getElementById("viewReqStatus");
    const matEl = document.getElementById("viewReqMaterial");
    const qtyEl = document.getElementById("viewReqQuantity");
    const projEl = document.getElementById("viewReqProject");
    const reqByEl = document.getElementById("viewReqRequestedBy");
    const dateEl = document.getElementById("viewReqDate");
    const supplierEl = document.getElementById("viewReqSupplier");
    const reasonEl = document.getElementById("viewReqReason");
    const editBtn = document.getElementById("viewModalEditBtn");

    const decisionBadge = document.getElementById("viewReqDecisionBadge");
    const decisionBy = document.getElementById("viewReqDecisionBy");
    const decisionDate = document.getElementById("viewReqDecisionDate");
    const decisionRemarks = document.getElementById("viewReqDecisionRemarks");

    if (codeEl) codeEl.textContent = request.requestCode || `#${request.id}`;
    if (statusEl) {
        statusEl.innerHTML = `<span class="status ${getStatusClass(request.status)}">${formatStatus(request.status)}</span>`;
    }
    if (matEl) matEl.textContent = request.materialName || "-";
    if (qtyEl) qtyEl.textContent = `${request.quantity} ${request.unit || ""}`;
    if (projEl) projEl.textContent = request.projectName || "-";
    if (reqByEl) reqByEl.textContent = request.requestedBy || "-";
    if (dateEl) dateEl.textContent = request.requiredDate || "-";
    if (supplierEl) supplierEl.textContent = request.supplierName || "Open / Unassigned";
    if (reasonEl) reasonEl.textContent = request.reason || "No site purpose or remarks provided.";

    if (decisionBadge) {
        decisionBadge.className = `status ${getStatusClass(request.status)}`;
        decisionBadge.textContent = formatStatus(request.status);
    }
    if (decisionBy) decisionBy.textContent = request.decisionBy || (request.supplierName ? request.supplierName : "Pending Review");
    if (decisionDate) decisionDate.textContent = request.decisionDate ? new Date(request.decisionDate).toLocaleString() : "Not decided yet";
    if (decisionRemarks) decisionRemarks.textContent = request.decisionRemarks || "No response remarks provided by supplier.";

    if (editBtn) {
        editBtn.onclick = () => editRequest(request.id);
    }

    const modal = document.getElementById("viewRequestModal");
    if (modal) modal.classList.add("show");
}

// ===============================
// DELETE REQUEST
// ===============================

function deleteRequest(id) {
    const request = allRequestsList.find(r => r.id === id);
    activeDeleteRequestId = id;

    const codeEl = document.getElementById("deleteRequestCode");
    if (codeEl) {
        codeEl.textContent = request ? request.requestCode : `#${id}`;
    }

    const confirmBtn = document.getElementById("confirmDeleteBtn");
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="bi bi-trash-fill"></i> <span>Yes, Delete Request</span>';
    }

    const modal = document.getElementById("deleteRequestModal");
    if (modal) modal.classList.add("show");
}

async function confirmDeleteRequest() {
    if (!activeDeleteRequestId || isDeletingRequest) return;

    const id = activeDeleteRequestId;
    const confirmBtn = document.getElementById("confirmDeleteBtn");

    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> <span>Deleting...</span>';
    }

    isDeletingRequest = true;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "DELETE",
            headers: getHeaders(),
            cache: "no-store"
        });

        if (!response.ok) {
            throw new Error(await getApiError(response));
        }

        // Update local state immediately
        allRequestsList = allRequestsList.filter(r => r.id !== id);

        // Update UI immediately
        updateStatistics();
        renderRequests();

        closeDeleteModal();

        showToast("Successfully deleted request!", "success");

        // Sync with verified server state
        await loadRequests(true);
    } catch (error) {
        console.error("Delete request error:", error);
        showToast(error.message || "Error deleting request.", "error");
    } finally {
        isDeletingRequest = false;
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="bi bi-trash-fill"></i> <span>Yes, Delete Request</span>';
        }
    }
}

// ===============================
// STATUS CLASS HELPER
// ===============================

function getStatusClass(status) {
    const s = String(status || "").toUpperCase();
    switch (s) {
        case "PENDING":
            return "pending";
        case "APPROVED":
        case "ACCEPTED":
            return "approved";
        case "REJECTED":
        case "DECLINED":
        case "CANCELLED":
            return "rejected";
        case "FULFILLED":
            return "fulfilled";
        default:
            return "pending";
    }
}

function formatStatus(status) {
    const s = String(status || "").toUpperCase();
    switch (s) {
        case "PENDING":
            return "Pending Review";
        case "ACCEPTED":
        case "APPROVED":
            return "Accepted by Supplier";
        case "DECLINED":
        case "REJECTED":
            return "Declined by Supplier";
        case "FULFILLED":
            return "Fulfilled";
        default:
            return s || "Pending Review";
    }
}

// ===============================
// API ERROR PARSER
// ===============================

async function getApiError(response) {
    try {
        const contentType = response.headers.get("content-type") || "";

        if (contentType.includes("application/json")) {
            const data = await response.json();
            return data.message || data.error || `Error ${response.status}: Request failed.`;
        }

        const text = await response.text();
        return text || `Error ${response.status}: Request failed.`;
    } catch {
        return `Error ${response.status}: Request failed.`;
    }
}

// ===============================
// HTML ESCAPE
// ===============================

function escapeHtml(value) {
    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// ===============================
// DEBOUNCE UTILITY
// ===============================

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ===============================
// TOAST NOTIFICATION
// ===============================

function showToast(message, type = "success") {
    if (typeof window.showToast === "function" && window.showToast !== showToast) {
        window.showToast(message, type);
        return;
    }

    const toast = document.getElementById("toast");
    if (!toast) return;

    const msgEl = document.getElementById("toastMessage") || toast.querySelector("span");
    if (msgEl) {
        msgEl.textContent = message;
    } else {
        toast.textContent = message;
    }

    toast.className = "toast " + type;
    toast.classList.add("show");

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3500);
}

// ===============================
// SUPPLIER SUGGESTIONS
// ===============================

async function loadSupplierSuggestions() {
    const dataList = document.getElementById("supplierListSuggestions");
    if (!dataList) return;

    try {
        const response = await fetch(`/api/suppliers?page=0&size=100&_t=${Date.now()}`, {
            headers: getHeaders(),
            cache: "no-store"
        });

        const namesSet = new Set();

        if (response.ok) {
            const data = await response.json();
            const list = Array.isArray(data) ? data : (data.content || []);
            list.forEach(s => {
                if (s && s.name && s.name.trim()) {
                    namesSet.add(s.name.trim());
                }
            });
        }

        // Also add suppliers currently in requests list
        if (Array.isArray(allRequestsList)) {
            allRequestsList.forEach(r => {
                if (r && r.supplierName && r.supplierName.trim()) {
                    namesSet.add(r.supplierName.trim());
                }
            });
        }

        dataList.innerHTML = Array.from(namesSet)
            .sort((a, b) => a.localeCompare(b))
            .map(name => `<option value="${escapeHtml(name)}"></option>`)
            .join("");
    } catch (err) {
        console.warn("Could not load supplier suggestions:", err);
    }
}