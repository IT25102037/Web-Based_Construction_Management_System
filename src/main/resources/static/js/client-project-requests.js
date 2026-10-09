/* =========================================================
   WBCMS - CLIENT PROJECT REQUEST MANAGEMENT
========================================================= */

const API =
    "/api/client/project-requests";


let editingRequestId = null;


/* =========================================================
   AUTHENTICATION
========================================================= */

function getToken() {

    return localStorage.getItem(
        "wbcms_token"
    );
}


function isClientLoggedIn() {

    return (
        getToken() &&
        localStorage.getItem(
            "wbcms_user_type"
        ) === "CLIENT" &&
        localStorage.getItem(
            "wbcms_role"
        ) === "CLIENT"
    );
}


/* =========================================================
   PAGE LOAD
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        if (!isClientLoggedIn()) {

            window.location.replace(
                "/client-login.html"
            );

            return;
        }


        loadRequests();

        setupForm();

        setupModalEvents();

        setMinimumDate();

    }
);


/* =========================================================
   HEADERS
========================================================= */

function getHeaders() {

    return {

        "Content-Type":
            "application/json",

        "Authorization":
            "Bearer " + getToken()

    };

}


/* =========================================================
   LOAD REQUESTS
========================================================= */

async function loadRequests() {

    try {

        const response =
            await fetch(
                API,
                {
                    method: "GET",

                    headers:
                        getHeaders()
                }
            );


        if (
            response.status === 401 ||
            response.status === 403
        ) {

            logout();

            return;
        }


        const data =
            await response
                .json()
                .catch(() => []);


        if (!response.ok) {

            throw new Error(
                data.message ||
                data.error ||
                "Unable to load project requests."
            );
        }


        renderRequests(data);


    } catch (error) {

        console.error(
            "Load requests error:",
            error
        );

        showMessage(
            error.message,
            "error"
        );

    }

}


/* =========================================================
   RENDER REQUESTS
========================================================= */

function renderRequests(requests) {

    const tbody =
        document.getElementById(
            "requestTableBody"
        );


    const emptyState =
        document.getElementById(
            "emptyState"
        );


    const count =
        document.getElementById(
            "requestCount"
        );


    tbody.innerHTML = "";


    count.textContent =
        requests.length +
        (
            requests.length === 1
                ? " Request"
                : " Requests"
        );


    if (!requests.length) {

        emptyState.style.display =
            "block";

        return;
    }


    emptyState.style.display =
        "none";


    requests.forEach(
        function (request) {

            const row =
                document.createElement(
                    "tr"
                );


            row.innerHTML = `

                <td>

                    <div class="project-name">
                        ${escapeHtml(request.projectName)}
                    </div>

                </td>

                <td>
                    ${escapeHtml(request.projectType)}
                </td>

                <td>

                    <div class="location">
                        ${escapeHtml(request.location)}
                    </div>

                </td>

                <td>
                    ${formatCurrency(request.estimatedBudget)}
                </td>

                <td>
                    ${formatDate(request.preferredStartDate)}
                </td>

                <td>

                    <span class="status status-${request.status}">
                        ${request.status}
                    </span>

                </td>

                <td>

                    <div class="actions">

                        <button
                            class="action-btn"
                            title="View"
                            onclick="viewRequest(${request.id})">

                            <i class="fa-solid fa-eye"></i>

                        </button>

                        ${
                request.status === "PENDING"
                    ? `
                                <button
                                    class="action-btn"
                                    title="Edit"
                                    onclick="editRequest(${request.id})">

                                    <i class="fa-solid fa-pen"></i>

                                </button>

                                <button
                                    class="action-btn delete"
                                    title="Delete"
                                    onclick="deleteRequest(${request.id})">

                                    <i class="fa-solid fa-trash"></i>

                                </button>
                            `
                    : ""
            }

                    </div>

                </td>

            `;


            tbody.appendChild(row);

        }
    );

}


/* =========================================================
   OPEN CREATE MODAL
========================================================= */

function openRequestModal() {

    editingRequestId = null;


    document.getElementById(
        "requestForm"
    ).reset();


    document.getElementById(
        "requestId"
    ).value = "";


    document.getElementById(
        "modalTitle"
    ).textContent =
        "Create Project Request";


    document.getElementById(
        "saveRequestBtn"
    ).innerHTML =
        '<i class="fa-solid fa-paper-plane"></i> Submit Request';


    document.getElementById(
        "requestModal"
    ).classList.add(
        "show"
    );

}


/* =========================================================
   CLOSE CREATE/UPDATE MODAL
========================================================= */

function closeRequestModal() {

    document.getElementById(
        "requestModal"
    ).classList.remove(
        "show"
    );

}


/* =========================================================
   SETUP FORM
========================================================= */

function setupForm() {

    document.getElementById(
        "requestForm"
    ).addEventListener(
        "submit",
        saveRequest
    );

}


/* =========================================================
   CREATE / UPDATE
========================================================= */

async function saveRequest(event) {

    event.preventDefault();


    const projectName =
        document.getElementById(
            "projectName"
        ).value.trim();


    const projectType =
        document.getElementById(
            "projectType"
        ).value;


    const location =
        document.getElementById(
            "location"
        ).value.trim();


    const description =
        document.getElementById(
            "description"
        ).value.trim();


    const estimatedBudget =
        Number(
            document.getElementById(
                "estimatedBudget"
            ).value
        );


    const preferredStartDate =
        document.getElementById(
            "preferredStartDate"
        ).value;


    /* ===============================
       VALIDATION
    =============================== */

    if (!projectName) {

        showMessage(
            "Project name is required.",
            "error"
        );

        return;
    }


    if (!projectType) {

        showMessage(
            "Please select a project type.",
            "error"
        );

        return;
    }


    if (!location) {

        showMessage(
            "Project location is required.",
            "error"
        );

        return;
    }


    if (!description) {

        showMessage(
            "Project description is required.",
            "error"
        );

        return;
    }


    if (
        !estimatedBudget ||
        estimatedBudget <= 0
    ) {

        showMessage(
            "Estimated budget must be greater than zero.",
            "error"
        );

        return;
    }


    if (!preferredStartDate) {

        showMessage(
            "Please select a preferred start date.",
            "error"
        );

        return;
    }


    const selectedDate =
        new Date(
            preferredStartDate +
            "T00:00:00"
        );


    const today =
        new Date();

    today.setHours(
        0,
        0,
        0,
        0
    );


    if (selectedDate < today) {

        showMessage(
            "Preferred start date cannot be in the past.",
            "error"
        );

        return;
    }


    const requestBody = {

        projectName:
        projectName,

        projectType:
        projectType,

        location:
        location,

        description:
        description,

        estimatedBudget:
        estimatedBudget,

        preferredStartDate:
        preferredStartDate

    };


    const saveButton =
        document.getElementById(
            "saveRequestBtn"
        );


    saveButton.disabled = true;

    saveButton.innerHTML =
        '<i class="fa-solid fa-spinner fa-spin"></i> Saving...';


    try {

        const isUpdate =
            editingRequestId !== null;


        const url =
            isUpdate
                ? `${API}/${editingRequestId}`
                : API;


        const response =
            await fetch(
                url,
                {

                    method:
                        isUpdate
                            ? "PUT"
                            : "POST",

                    headers:
                        getHeaders(),

                    body:
                        JSON.stringify(
                            requestBody
                        )

                }
            );


        const data =
            await response
                .json()
                .catch(() => ({}));


        if (!response.ok) {

            throw new Error(
                data.message ||
                data.error ||
                "Unable to save project request."
            );
        }


        closeRequestModal();


        showMessage(
            isUpdate
                ? "Project request updated successfully."
                : "Project request submitted successfully.",
            "success"
        );


        await loadRequests();


    } catch (error) {

        console.error(
            "Save request error:",
            error
        );

        showMessage(
            error.message,
            "error"
        );


    } finally {

        saveButton.disabled = false;

        saveButton.innerHTML =
            editingRequestId !== null

                ? '<i class="fa-solid fa-floppy-disk"></i> Update Request'

                : '<i class="fa-solid fa-paper-plane"></i> Submit Request';

    }

}


/* =========================================================
   EDIT REQUEST
========================================================= */

async function editRequest(id) {

    try {

        const response =
            await fetch(
                `${API}/${id}`,
                {
                    method: "GET",
                    headers: getHeaders()
                }
            );


        const data =
            await response
                .json()
                .catch(() => ({}));


        if (!response.ok) {

            throw new Error(
                data.message ||
                data.error ||
                "Unable to load request."
            );
        }


        if (
            data.status !== "PENDING"
        ) {

            showMessage(
                "Only pending requests can be edited.",
                "error"
            );

            return;
        }


        editingRequestId =
            data.id;


        document.getElementById(
            "requestId"
        ).value =
            data.id;


        document.getElementById(
            "projectName"
        ).value =
            data.projectName || "";


        document.getElementById(
            "projectType"
        ).value =
            data.projectType || "";


        document.getElementById(
            "location"
        ).value =
            data.location || "";


        document.getElementById(
            "description"
        ).value =
            data.description || "";


        document.getElementById(
            "estimatedBudget"
        ).value =
            data.estimatedBudget || "";


        document.getElementById(
            "preferredStartDate"
        ).value =
            data.preferredStartDate || "";


        document.getElementById(
            "modalTitle"
        ).textContent =
            "Update Project Request";


        document.getElementById(
            "saveRequestBtn"
        ).innerHTML =
            '<i class="fa-solid fa-floppy-disk"></i> Update Request';


        document.getElementById(
            "requestModal"
        ).classList.add(
            "show"
        );


    } catch (error) {

        console.error(
            "Edit request error:",
            error
        );

        showMessage(
            error.message,
            "error"
        );

    }

}


/* =========================================================
   VIEW REQUEST
========================================================= */

async function viewRequest(id) {

    try {

        const response =
            await fetch(
                `${API}/${id}`,
                {
                    method: "GET",
                    headers: getHeaders()
                }
            );


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                data.error ||
                "Unable to load request."
            );
        }


        document.getElementById(
            "viewContent"
        ).innerHTML = `

            <div class="detail">

                <span>Project Name</span>

                <strong>
                    ${escapeHtml(data.projectName)}
                </strong>

            </div>

            <div class="detail">

                <span>Project Type</span>

                <strong>
                    ${escapeHtml(data.projectType)}
                </strong>

            </div>

            <div class="detail">

                <span>Location</span>

                <strong>
                    ${escapeHtml(data.location)}
                </strong>

            </div>

            <div class="detail">

                <span>Estimated Budget</span>

                <strong>
                    ${formatCurrency(data.estimatedBudget)}
                </strong>

            </div>

            <div class="detail">

                <span>Preferred Start Date</span>

                <strong>
                    ${formatDate(data.preferredStartDate)}
                </strong>

            </div>

            <div class="detail">

                <span>Status</span>

                <strong>
                    ${escapeHtml(data.status)}
                </strong>

            </div>

            <div class="detail">

                <span>Description</span>

                <strong>
                    ${escapeHtml(data.description)}
                </strong>

            </div>

        `;


        document.getElementById(
            "viewModal"
        ).classList.add(
            "show"
        );


    } catch (error) {

        console.error(
            "View request error:",
            error
        );

        showMessage(
            error.message,
            "error"
        );

    }

}


/* =========================================================
   CLOSE VIEW
========================================================= */

function closeViewModal() {

    document.getElementById(
        "viewModal"
    ).classList.remove(
        "show"
    );

}


/* =========================================================
   DELETE REQUEST
========================================================= */

async function deleteRequest(id) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this project request?"
        );


    if (!confirmed) {

        return;
    }


    try {

        const response =
            await fetch(
                `${API}/${id}`,
                {

                    method: "DELETE",

                    headers:
                        getHeaders()

                }
            );


        if (!response.ok) {

            const data =
                await response
                    .json()
                    .catch(() => ({}));


            throw new Error(
                data.message ||
                data.error ||
                "Unable to delete project request."
            );
        }


        showMessage(
            "Project request deleted successfully.",
            "success"
        );


        await loadRequests();


    } catch (error) {

        console.error(
            "Delete request error:",
            error
        );

        showMessage(
            error.message,
            "error"
        );

    }

}


/* =========================================================
   MODAL EVENTS
========================================================= */

function setupModalEvents() {

    const requestModal =
        document.getElementById(
            "requestModal"
        );


    const viewModal =
        document.getElementById(
            "viewModal"
        );


    window.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                requestModal
            ) {

                closeRequestModal();

            }


            if (
                event.target ===
                viewModal
            ) {

                closeViewModal();

            }

        }
    );


    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Escape"
            ) {

                closeRequestModal();

                closeViewModal();

            }

        }
    );

}


/* =========================================================
   MINIMUM DATE
========================================================= */

function setMinimumDate() {

    const input =
        document.getElementById(
            "preferredStartDate"
        );


    if (!input) {

        return;
    }


    const today =
        new Date();


    const year =
        today.getFullYear();


    const month =
        String(
            today.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            today.getDate()
        ).padStart(2, "0");


    input.min =
        `${year}-${month}-${day}`;

}


/* =========================================================
   FORMAT CURRENCY
========================================================= */

function formatCurrency(value) {

    const number =
        Number(value);


    if (Number.isNaN(number)) {

        return "-";
    }


    return new Intl.NumberFormat(
        "en-LK",
        {
            style: "currency",
            currency: "LKR",
            maximumFractionDigits: 2
        }
    ).format(number);

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatDate(value) {

    if (!value) {

        return "-";
    }


    const date =
        new Date(
            value + "T00:00:00"
        );


    return date.toLocaleDateString(
        "en-LK",
        {
            year: "numeric",
            month: "short",
            day: "numeric"
        }
    );

}


/* =========================================================
   HTML ESCAPE
========================================================= */

function escapeHtml(value) {

    if (value === null ||
        value === undefined) {

        return "";
    }


    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
    message,
    type
) {

    const element =
        document.getElementById(
            "message"
        );


    element.textContent =
        message;


    element.className =
        "message show " +
        type;


    setTimeout(
        function () {

            element.className =
                "message";

        },
        4000
    );

}


/* =========================================================
   LOGOUT
========================================================= */

function logout() {

    localStorage.removeItem(
        "wbcms_token"
    );

    localStorage.removeItem(
        "wbcms_user_id"
    );

    localStorage.removeItem(
        "wbcms_username"
    );

    localStorage.removeItem(
        "wbcms_role"
    );

    localStorage.removeItem(
        "wbcms_user_type"
    );

    localStorage.removeItem(
        "wbcms_user"
    );


    window.location.replace(
        "/client-login.html"
    );

}