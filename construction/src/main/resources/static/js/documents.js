/* =========================================================
   WBCMS - DOCUMENT MANAGEMENT JAVASCRIPT
   Real Full-Stack Integration with Spring Boot & SQL Server
========================================================= */

const authToken = localStorage.getItem("wbcms_token");
const userType = localStorage.getItem("wbcms_user_type");
const username = localStorage.getItem("wbcms_username") || "Staff User";
const role = localStorage.getItem("wbcms_role") || localStorage.getItem("wbcms_staff_role") || "STAFF";

if (!authToken || userType === "CLIENT") {
    window.location.replace("/staff-login.html");
}

let allDocuments = [];
let projectsList = [];
let editingDocId = null;

document.addEventListener("DOMContentLoaded", async function () {
    loadUserInformation();
    await loadProjects();
    await loadDocuments();

    const searchInput = document.getElementById("documentSearch");
    if (searchInput) {
        searchInput.addEventListener("input", debounce(renderDocuments, 250));
    }
});

function loadUserInformation() {
    const pName = document.getElementById("profileName");
    const pRole = document.getElementById("profileRole");
    const dropName = document.getElementById("dropdownUserName");

    if (pName) pName.textContent = username;
    if (pRole) pRole.textContent = formatRole(role);
    if (dropName) dropName.textContent = username;
}

function formatRole(value) {
    if (!value) return "Staff";
    return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function getAuthHeaders(isJson = true) {
    const headers = {
        "Authorization": "Bearer " + authToken
    };
    if (isJson) {
        headers["Content-Type"] = "application/json";
    }
    return headers;
}

async function loadProjects() {
    try {
        const res = await fetch("/api/projects?page=0&size=200", { headers: getAuthHeaders() });
        if (res.ok) {
            const data = await res.json();
            projectsList = data.content || data || [];
            populateProjectsSelects();
        }
    } catch (err) {
        console.warn("Could not load projects for documents:", err);
    }
}

function populateProjectsSelects() {
    const modalSel = document.getElementById("documentProject");
    const filterSel = document.getElementById("projectFilter");

    if (modalSel) {
        modalSel.innerHTML = '<option value="">Select Project</option>';
        projectsList.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = p.name;
            modalSel.appendChild(opt);
        });
    }

    if (filterSel) {
        filterSel.innerHTML = '<option value="">All Projects</option>';
        projectsList.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.id;
            opt.textContent = p.name;
            filterSel.appendChild(opt);
        });
    }
}

async function loadDocuments() {
    const tableBody = document.getElementById("documentTableBody");
    try {
        const res = await fetch("/api/documents?page=0&size=500", {
            headers: getAuthHeaders()
        });

        if (!res.ok) {
            throw new Error("Failed to load documents (" + res.status + ")");
        }

        const data = await res.json();
        allDocuments = data.content || data || [];

        renderDocuments();
        updateStatistics();

    } catch (error) {
        console.error("Documents error:", error);
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding: 30px; color: #f87171;">
                        <i class="bi bi-exclamation-triangle" style="font-size:20px; display:block; margin-bottom:6px;"></i>
                        Error loading documents: ${escapeHtml(error.message)}
                    </td>
                </tr>
            `;
        }
    }
}

function renderDocuments() {
    const tableBody = document.getElementById("documentTableBody");
    const emptyTable = document.getElementById("emptyTable");
    const search = (document.getElementById("documentSearch")?.value || "").toLowerCase().trim();
    const typeFilter = (document.getElementById("typeFilter")?.value || "").toUpperCase();
    const projectFilter = document.getElementById("projectFilter")?.value || "";

    const filtered = allDocuments.filter(d => {
        const title = (d.title || "").toLowerCase();
        const desc = (d.description || "").toLowerCase();
        const pName = (d.projectName || "").toLowerCase();
        const docType = (d.documentType || "").toUpperCase();

        const matchesSearch = !search || title.includes(search) || desc.includes(search) || pName.includes(search);
        const matchesType = !typeFilter || docType === typeFilter;
        const matchesProject = !projectFilter || String(d.projectId) === String(projectFilter);

        return matchesSearch && matchesType && matchesProject;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = "";
        if (emptyTable) emptyTable.style.display = "block";
        return;
    }

    if (emptyTable) emptyTable.style.display = "none";
    tableBody.innerHTML = "";

    filtered.forEach((d, index) => {
        const projName = d.projectName || `Project #${d.projectId}`;
        const dateStr = d.createdAt ? new Date(d.createdAt).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric'
        }) : "N/A";

        const typeClass = (d.documentType || "other").toLowerCase();
        const typeLabel = formatDocType(d.documentType);
        const versionBadge = d.version ? `<span class="version-badge">${escapeHtml(d.version)}</span>` : "";
        const sizeBadge = d.fileSize ? `<small style="color:#64748b; font-size:11px; margin-left:4px;">(${escapeHtml(d.fileSize)})</small>` : "";

        let fileLink = `<span style="color:#64748b; font-size:12px;">Local Vault</span>`;
        if (d.fileUrl) {
            fileLink = `
                <a href="${escapeHtml(d.fileUrl)}" target="_blank" rel="noopener noreferrer" style="color:#2563eb; font-weight:600; text-decoration:none; font-size:12.5px; display:inline-flex; align-items:center; gap:4px;">
                    <i class="bi bi-box-arrow-up-right"></i> Open File
                </a>
            `;
        }

        const row = document.createElement("tr");
        row.innerHTML = `
            <td style="color:#64748b; font-weight:600;">${index + 1}</td>
            <td>
                <div style="font-weight:700; color:#0f172a; font-size:13.5px;">${escapeHtml(d.title)}</div>
                <div style="display:flex; align-items:center; gap:6px; margin-top:3px;">
                    ${versionBadge}
                    ${sizeBadge}
                </div>
                ${d.description ? `<small style="color:#475569; display:block; margin-top:2px; max-width:280px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(d.description)}</small>` : ""}
            </td>
            <td><span class="doc-type-pill ${typeClass}">${escapeHtml(typeLabel)}</span></td>
            <td>
                <span style="color:#0f172a; font-weight:600; font-size:12.5px;">
                    <i class="bi bi-building" style="color:var(--orange); margin-right:4px;"></i>${escapeHtml(projName)}
                </span>
            </td>
            <td>${fileLink}</td>
            <td>
                <span style="color:#334155; font-weight:500; font-size:12.5px;">
                    <i class="bi bi-person-check" style="color:#059669; margin-right:4px;"></i>${escapeHtml(d.uploadedByName || "Staff User")}
                </span>
            </td>
            <td><small style="color:#0f172a; font-weight:600; font-size:12px;">${escapeHtml(dateStr)}</small></td>
            <td style="text-align: right;">
                <div class="table-actions" style="justify-content: flex-end;">
                    <button class="table-action view" title="View Document Details" onclick="viewDocument(${d.id})">
                        <i class="bi bi-eye"></i>
                    </button>
                    ${d.fileUrl ? `
                    <a href="${escapeHtml(d.fileUrl)}" target="_blank" class="table-action download" title="Download / Open File" rel="noopener noreferrer">
                        <i class="bi bi-download"></i>
                    </a>` : ""}
                    <button class="table-action edit" title="Edit Metadata" onclick="editDocument(${d.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="table-action delete" title="Delete Document" onclick="deleteDocument(${d.id})">
                        <i class="bi bi-trash3"></i>
                    </button>
                </div>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function formatDocType(type) {
    if (!type) return "Document";
    switch (type.toUpperCase()) {
        case "BLUEPRINT": return "CAD Blueprint";
        case "CONTRACT": return "Contract";
        case "PERMIT": return "Permit";
        case "REPORT": return "Inspection Report";
        case "SPECIFICATION": return "Specification";
        default: return type;
    }
}

function updateStatistics() {
    const total = allDocuments.length;
    const blueprints = allDocuments.filter(d => (d.documentType || "").toUpperCase() === "BLUEPRINT").length;
    const contracts = allDocuments.filter(d => (d.documentType || "").toUpperCase() === "CONTRACT").length;
    const permits = allDocuments.filter(d => (d.documentType || "").toUpperCase() === "PERMIT").length;

    const totalEl = document.getElementById("totalDocuments");
    const bpEl = document.getElementById("blueprintDocs");
    const contEl = document.getElementById("contractDocs");
    const permEl = document.getElementById("permitDocs");

    if (totalEl) totalEl.textContent = total;
    if (bpEl) bpEl.textContent = blueprints;
    if (contEl) contEl.textContent = contracts;
    if (permEl) permEl.textContent = permits;
}

function openDocumentModal() {
    editingDocId = null;
    document.getElementById("modalTitle").innerHTML = `<i class="bi bi-cloud-arrow-up-fill" style="color:var(--orange);"></i> Add New Document`;
    document.getElementById("documentForm").reset();
    document.getElementById("documentId").value = "";
    document.getElementById("version").value = "v1.0";
    document.getElementById("fileDropText").textContent = "Click to choose a file or drag and drop";
    const prog = document.getElementById("uploadProgressText");
    if (prog) prog.style.display = "none";

    clearValidation();
    const modal = document.getElementById("documentModal");
    if (modal) {
        modal.classList.add("show");
        modal.style.display = "flex";
    }
}

function editDocument(id) {
    const d = allDocuments.find(item => item.id === id);
    if (!d) return;

    editingDocId = id;
    document.getElementById("modalTitle").innerHTML = `<i class="bi bi-pencil-square" style="color:var(--orange);"></i> Edit Document Metadata`;
    document.getElementById("documentId").value = d.id;
    document.getElementById("documentTitle").value = d.title || "";
    document.getElementById("documentType").value = d.documentType || "BLUEPRINT";
    document.getElementById("documentProject").value = d.projectId || "";
    document.getElementById("fileUrl").value = d.fileUrl || "";
    document.getElementById("version").value = d.version || "v1.0";
    document.getElementById("fileSize").value = d.fileSize || "";
    document.getElementById("documentDescription").value = d.description || "";
    document.getElementById("fileDropText").textContent = "Choose new file to replace (optional)";
    const prog = document.getElementById("uploadProgressText");
    if (prog) prog.style.display = "none";

    clearValidation();
    const modal = document.getElementById("documentModal");
    if (modal) {
        modal.classList.add("show");
        modal.style.display = "flex";
    }
}

function closeDocumentModal() {
    const modal = document.getElementById("documentModal");
    if (modal) {
        modal.classList.remove("show");
        modal.style.display = "none";
    }
}

async function handleFileSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    const dropText = document.getElementById("fileDropText");
    const progressText = document.getElementById("uploadProgressText");
    const titleInput = document.getElementById("documentTitle");
    const urlInput = document.getElementById("fileUrl");
    const sizeInput = document.getElementById("fileSize");

    dropText.textContent = `Selected: ${file.name}`;
    if (progressText) {
        progressText.style.display = "block";
        progressText.textContent = "Uploading file to server vault...";
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch("/api/documents/upload", {
            method: "POST",
            headers: {
                "Authorization": "Bearer " + authToken
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error("File upload failed (" + response.status + ")");
        }

        const data = await response.json();
        if (urlInput) urlInput.value = data.fileUrl;
        if (sizeInput) sizeInput.value = data.fileSize;
        if (titleInput && !titleInput.value.trim()) {
            const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
            titleInput.value = cleanTitle;
        }

        if (progressText) {
            progressText.style.color = "#34d399";
            progressText.textContent = "✓ File uploaded successfully to vault!";
        }
    } catch (err) {
        console.error("Upload error:", err);
        if (progressText) {
            progressText.style.color = "#f87171";
            progressText.textContent = "Upload failed. Please enter URL manually.";
        }
    }
}

async function saveDocument(event) {
    event.preventDefault();

    const title = document.getElementById("documentTitle").value.trim();
    const documentType = document.getElementById("documentType").value;
    const projectId = Number(document.getElementById("documentProject").value);
    const fileUrl = document.getElementById("fileUrl").value.trim();
    const version = document.getElementById("version").value.trim() || "v1.0";
    const fileSize = document.getElementById("fileSize").value.trim();
    const description = document.getElementById("documentDescription").value.trim();

    clearValidation();
    let hasError = false;

    if (!title) {
        document.getElementById("titleError").textContent = "Document title is required.";
        hasError = true;
    }
    if (!projectId) {
        document.getElementById("projectError").textContent = "Please select a project.";
        hasError = true;
    }
    if (!fileUrl) {
        document.getElementById("urlError").textContent = "File URL or path is required.";
        hasError = true;
    }

    if (hasError) return;

    let userObj = {};
    try {
        userObj = JSON.parse(localStorage.getItem("wbcms_user") || "{}");
    } catch (e) {}
    const uploadedById = Number(localStorage.getItem("wbcms_user_id")) || userObj.id || 1;

    const payload = {
        title,
        documentType,
        projectId,
        fileUrl,
        filePath: fileUrl,
        fileSize,
        version,
        description,
        uploadedById
    };

    const submitBtn = document.getElementById("submitDocBtn");
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="bi bi-arrow-repeat" style="animation: spin 1s linear infinite; display: inline-block;"></i> Saving...`;
    }

    try {
        let response;
        if (editingDocId) {
            response = await fetch(`/api/documents/${editingDocId}`, {
                method: "PUT",
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
        } else {
            response = await fetch("/api/documents", {
                method: "POST",
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || errorData.error || "Failed to save document.");
        }

        showToast(editingDocId ? "Successfully updated document!" : "Successfully created document!", "success");
        closeDocumentModal();
        await loadDocuments();

    } catch (error) {
        showToast(error.message || (editingDocId ? "Error updating document." : "Error creating document."), "error");
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="bi bi-check-circle-fill"></i> Save Document`;
        }
    }
}

let pendingDeleteDocId = null;

function deleteDocument(id) {
    const d = allDocuments.find(item => item.id === id);
    if (!d) return;

    pendingDeleteDocId = id;
    const nameEl = document.getElementById("deleteDocName");
    const metaEl = document.getElementById("deleteDocMeta");
    const modal = document.getElementById("deleteDocModal");

    if (nameEl) nameEl.textContent = d.title || "Untitled Document";
    if (metaEl) {
        const projName = d.projectName || `Project #${d.projectId}`;
        const typeStr = formatDocType(d.documentType);
        metaEl.textContent = `${projName} • ${typeStr} • ${d.version || 'v1.0'}`;
    }

    if (modal) {
        modal.classList.add("show");
        modal.style.display = "flex";
    }
}

function closeDeleteDocModal() {
    pendingDeleteDocId = null;
    const modal = document.getElementById("deleteDocModal");
    if (modal) {
        modal.classList.remove("show");
        modal.style.display = "none";
    }
}

async function confirmDeleteDocument() {
    if (!pendingDeleteDocId) return;
    const id = pendingDeleteDocId;
    const btn = document.getElementById("confirmDeleteDocBtn");

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="bi bi-arrow-repeat" style="animation: spin 1s linear infinite; display: inline-block;"></i> Deleting...`;
    }

    try {
        const response = await fetch(`/api/documents/${id}`, {
            method: "DELETE",
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            throw new Error("Failed to delete document (" + response.status + ")");
        }

        closeDeleteDocModal();
        showToast("Document deleted successfully!", "success");
        await loadDocuments();

    } catch (error) {
        showToast(error.message || "Error deleting document.", "error");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="bi bi-trash3-fill"></i> Delete Document`;
        }
    }
}

function viewDocument(id) {
    const d = allDocuments.find(item => item.id === id);
    if (!d) return;

    const projName = d.projectName || `Project #${d.projectId}`;
    const dateStr = d.createdAt ? new Date(d.createdAt).toLocaleString() : "N/A";

    const contentEl = document.getElementById("detailsModalContent");
    const actionsEl = document.getElementById("detailsModalActions");

    contentEl.innerHTML = `
        <div style="padding: 20px 24px; border-bottom: 1px solid #f1f5f9;">
            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700;">Document Title</div>
            <h3 style="color: #0f172a; font-size: 17px; margin: 4px 0 0 0; font-weight: 700;">${escapeHtml(d.title)}</h3>
        </div>

        <div style="padding: 20px 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
                <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">Category / Type</div>
                <div style="margin-top: 4px;"><span class="doc-type-pill ${(d.documentType || 'other').toLowerCase()}">${escapeHtml(formatDocType(d.documentType))}</span></div>
            </div>
            <div>
                <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">Project</div>
                <div style="color:#0f172a; font-weight: 600; font-size: 13.5px; margin-top: 4px;"><i class="bi bi-building" style="color:var(--orange); margin-right:4px;"></i>${escapeHtml(projName)}</div>
            </div>
            <div>
                <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">Version Revision</div>
                <div style="color:#0f172a; font-weight: 600; font-size: 13px; margin-top: 4px;">${escapeHtml(d.version || "v1.0")}</div>
            </div>
            <div>
                <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">File Size</div>
                <div style="color:#0f172a; font-weight: 600; font-size: 13px; margin-top: 4px;">${escapeHtml(d.fileSize || "N/A")}</div>
            </div>
            <div>
                <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">Uploaded By</div>
                <div style="color:#334155; font-weight: 600; font-size: 13px; margin-top: 4px;"><i class="bi bi-person-check" style="color:#059669; margin-right:4px;"></i>${escapeHtml(d.uploadedByName || "Staff User")}</div>
            </div>
            <div>
                <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700;">Upload Timestamp</div>
                <div style="color:#0f172a; font-weight: 600; font-size: 12.5px; margin-top: 4px;">${escapeHtml(dateStr)}</div>
            </div>
        </div>

        <div style="padding: 0 24px 20px 24px;">
            <div style="margin-bottom: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
                <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Vault File URL / Storage Path</div>
                <div style="font-size: 12.5px; color:#2563eb; word-break: break-all; font-weight: 500;">${escapeHtml(d.fileUrl || "No direct link")}</div>
            </div>

            <div>
                <div style="font-size: 11px; color: #64748b; text-transform: uppercase; font-weight: 700; margin-bottom: 4px;">Engineering Notes & Description</div>
                <div style="font-size: 13px; color: #334155; font-weight: 400; line-height: 1.6; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
                    ${escapeHtml(d.description || "No description or notes provided for this document.")}
                </div>
            </div>
        </div>
    `;

    actionsEl.innerHTML = `
        <button type="button" class="cancel-button" onclick="closeDetailsModal()">Close</button>
        ${d.fileUrl ? `
        <a href="${escapeHtml(d.fileUrl)}" target="_blank" class="save-button" rel="noopener noreferrer" style="text-decoration:none;">
            <i class="bi bi-box-arrow-up-right"></i> Open / Download File
        </a>` : ""}
    `;

    const dm = document.getElementById("detailsModal");
    if (dm) {
        dm.classList.add("show");
        dm.style.display = "flex";
    }
}

function closeDetailsModal() {
    const dm = document.getElementById("detailsModal");
    if (dm) {
        dm.classList.remove("show");
        dm.style.display = "none";
    }
}

function clearValidation() {
    document.querySelectorAll(".validation-message").forEach(el => el.textContent = "");
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");
    const toastIcon = document.getElementById("toastIcon");
    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;
    if (toastIcon) {
        toastIcon.className = type === "error" ? "bi bi-exclamation-octagon-fill" : "bi bi-check-circle-fill";
    }

    toast.className = `toast show ${type}`;
    setTimeout(() => { toast.className = "toast"; }, 4000);
}

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

function escapeHtml(text) {
    if (!text) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function logout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("wbcms_token");
        localStorage.removeItem("wbcms_user_type");
        localStorage.removeItem("wbcms_role");
        localStorage.removeItem("wbcms_username");
        localStorage.removeItem("wbcms_user");
        window.location.replace("/staff-login.html");
    }
}
