const API_URL = "/api/material-requests";

let requests = [];
let activeDeleteRequestId = null;

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

document.addEventListener("DOMContentLoaded", () => {
    loadRequests();

    const form = document.getElementById("requestForm");
    if (form) {
        form.addEventListener("submit", saveRequest);
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

// ===============================
// API HEADERS
// ===============================

function getHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
    };
}

// ===============================
// LOAD REQUESTS
// ===============================

async function loadRequests() {
    try {
        const searchInput = document.getElementById("searchInput");
        const statusFilter = document.getElementById("statusFilter");

        const search = searchInput ? searchInput.value.trim() : "";
        const status = statusFilter ? statusFilter.value : "";

        let url = `${API_URL}?page=0&size=200`;
        if (search) {
            url += `&search=${encodeURIComponent(search)}`;
        }
        if (status) {
            url += `&status=${encodeURIComponent(status)}`;
        }

        const response = await fetch(url, {
            headers: getHeaders()
        });

        if (!response.ok) {
            throw new Error(await getApiError(response));
        }

        const data = await response.json();
        requests = data.content || [];

        renderRequests();
        updateStatistics();
    } catch (error) {
        console.error("Load requests error:", error);
        showToast(error.message || "Failed to load material requests.", "error");
    }
}

// ===============================
// RENDER TABLE
// ===============================

function renderRequests() {
    const tbody = document.getElementById("requestTableBody");
    const emptyMessage = document.getElementById("emptyMessage");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (requests.length === 0) {
        if (emptyMessage) emptyMessage.style.display = "block";
        return;
    }

    if (emptyMessage) emptyMessage.style.display = "none";

    requests.forEach(request => {
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
                <span style="color:#475569; font-size:12.5px;">
                    <i class="bi bi-calendar3" style="margin-right:4px; color:#64748b;"></i>${request.requiredDate || "-"}
                </span>
            </td>
            <td>
                <span class="status ${getStatusClass(request.status)}">
                    ${escapeHtml(request.status)}
                </span>
            </td>
            <td class="actions">
                <button class="view-btn" onclick="viewRequest(${request.id})" title="View Details">
                    <i class="bi bi-eye"></i> View
                </button>
                <button class="edit-btn" onclick="editRequest(${request.id})" title="Edit Request">
                    <i class="bi bi-pencil"></i> Edit
                </button>
                <button class="delete-btn" onclick="deleteRequest(${request.id})" title="Delete Request">
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
    const total = requests.length;
    const pending = requests.filter(r => r.status === "PENDING").length;
    const approved = requests.filter(r => r.status === "APPROVED").length;
    const fulfilled = requests.filter(r => r.status === "FULFILLED").length;

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

function openCreateModal() {
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

    // Auto set date to today if blank
    const dateInput = document.getElementById("requiredDate");
    if (dateInput && !dateInput.value) {
        const today = new Date().toISOString().split("T")[0];
        dateInput.value = today;
    }

    if (saveBtn) {
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

    const requestData = {
        requestCode,
        materialName,
        quantity,
        unit,
        projectName,
        requestedBy,
        requiredDate,
        reason: reason || null,
        status: status || "PENDING"
    };

    const saveBtn = document.getElementById("saveRequestBtn");
    const originalBtnHtml = saveBtn ? saveBtn.innerHTML : "";
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> <span>Saving...</span>';
    }

    try {
        const url = isEdit ? `${API_URL}/${id}` : API_URL;
        const method = isEdit ? "PUT" : "POST";

        const response = await fetch(url, {
            method,
            headers: getHeaders(),
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            throw new Error(await getApiError(response));
        }

        closeModal();

        showToast(
            isEdit ? "Successfully edited request!" : "Successfully created request!",
            "success"
        );

        await loadRequests();
    } catch (error) {
        console.error("Save request error:", error);
        showToast(
            error.message || (isEdit ? "Error editing request: Failed to update." : "Error creating request: Failed to save."),
            "error"
        );
    } finally {
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
    try {
        let request = requests.find(r => r.id === id);

        // Fetch fresh data from API
        const response = await fetch(`${API_URL}/${id}`, {
            headers: getHeaders()
        });

        if (response.ok) {
            request = await response.json();
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

        if (saveBtn) {
            saveBtn.innerHTML = '<i class="bi bi-check-lg"></i> <span>Update Request</span>';
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
    let request = requests.find(r => r.id === id);

    if (!request) {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                headers: getHeaders()
            });
            if (response.ok) {
                request = await response.json();
            }
        } catch (_) {}
    }

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
    const reasonEl = document.getElementById("viewReqReason");
    const editBtn = document.getElementById("viewModalEditBtn");

    if (codeEl) codeEl.textContent = request.requestCode || `#${request.id}`;
    if (statusEl) {
        statusEl.innerHTML = `<span class="status ${getStatusClass(request.status)}">${escapeHtml(request.status)}</span>`;
    }
    if (matEl) matEl.textContent = request.materialName || "-";
    if (qtyEl) qtyEl.textContent = `${request.quantity} ${request.unit || ""}`;
    if (projEl) projEl.textContent = request.projectName || "-";
    if (reqByEl) reqByEl.textContent = request.requestedBy || "-";
    if (dateEl) dateEl.textContent = request.requiredDate || "-";
    if (reasonEl) reasonEl.textContent = request.reason || "No site purpose or remarks provided.";

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
    const request = requests.find(r => r.id === id);
    activeDeleteRequestId = id;

    const codeEl = document.getElementById("deleteRequestCode");
    if (codeEl) {
        codeEl.textContent = request ? request.requestCode : `#${id}`;
    }

    const modal = document.getElementById("deleteRequestModal");
    if (modal) modal.classList.add("show");
}

async function confirmDeleteRequest() {
    if (!activeDeleteRequestId) return;

    const id = activeDeleteRequestId;
    closeDeleteModal();

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "DELETE",
            headers: getHeaders()
        });

        if (!response.ok) {
            throw new Error(await getApiError(response));
        }

        showToast("Successfully deleted request!", "success");
        await loadRequests();
    } catch (error) {
        console.error("Delete request error:", error);
        showToast(error.message || "Error deleting request.", "error");
    }
}

// ===============================
// STATUS CLASS HELPER
// ===============================

function getStatusClass(status) {
    switch (status) {
        case "PENDING":
            return "pending";
        case "APPROVED":
            return "approved";
        case "REJECTED":
            return "rejected";
        case "FULFILLED":
            return "fulfilled";
        default:
            return "";
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
// TOAST NOTIFICATION
// ===============================

function showToast(message, type = "success") {
    if (typeof window.showToast === "function") {
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