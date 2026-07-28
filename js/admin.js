document.addEventListener("DOMContentLoaded", function () {
    const API_BASE = "https://api.luxsomepackaging.com";
    const PAGE_SIZE = 20;

    const state = {
        token: sessionStorage.getItem("luxsomeAdminToken") || "",
        type: "",
        status: "",
        search: "",
        offset: 0,
        total: 0,
        selectedReference: ""
    };

    const loginOverlay = document.getElementById("loginOverlay");
    const loginForm = document.getElementById("loginForm");
    const tokenInput = document.getElementById("tokenInput");
    const loginError = document.getElementById("loginError");
    const logoutButton = document.getElementById("logoutButton");
    const refreshButton = document.getElementById("refreshButton");
    const searchInput = document.getElementById("searchInput");
    const statusFilter = document.getElementById("statusFilter");
    const tableBody = document.getElementById("submissionsTableBody");
    const dashboardStatus = document.getElementById("dashboardStatus");
    const emptyState = document.getElementById("emptyState");
    const previousButton = document.getElementById("previousButton");
    const nextButton = document.getElementById("nextButton");
    const paginationText = document.getElementById("paginationText");
    const detailOverlay = document.getElementById("detailOverlay");
    const closeDetailButton = document.getElementById("closeDetailButton");
    const detailStatus = document.getElementById("detailStatus");
    const payloadList = document.getElementById("payloadList");

    let searchTimer = null;

    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();
        loginError.textContent = "";

        state.token = tokenInput.value.trim();

        if (!state.token) {
            loginError.textContent = "Enter the administrator token.";
            return;
        }

        try {
            await loadDashboard();
            sessionStorage.setItem("luxsomeAdminToken", state.token);
            loginOverlay.classList.add("is-hidden");
        } catch (error) {
            state.token = "";
            loginError.textContent =
                error.message || "The administrator token was not accepted.";
        }
    });

    logoutButton.addEventListener("click", function () {
        sessionStorage.removeItem("luxsomeAdminToken");
        state.token = "";
        loginOverlay.classList.remove("is-hidden");
        tokenInput.value = "";
        tokenInput.focus();
    });

    refreshButton.addEventListener("click", loadDashboard);

    document.querySelectorAll(".nav-item").forEach(function (button) {
        button.addEventListener("click", function () {
            document.querySelectorAll(".nav-item").forEach(function (item) {
                item.classList.remove("is-active");
            });

            button.classList.add("is-active");
            state.type = button.dataset.view === "all"
                ? ""
                : button.dataset.view;
            state.offset = 0;
            loadSubmissions();
        });
    });

    statusFilter.addEventListener("change", function () {
        state.status = statusFilter.value;
        state.offset = 0;
        loadSubmissions();
    });

    searchInput.addEventListener("input", function () {
        clearTimeout(searchTimer);

        searchTimer = setTimeout(function () {
            state.search = searchInput.value.trim();
            state.offset = 0;
            loadSubmissions();
        }, 350);
    });

    previousButton.addEventListener("click", function () {
        state.offset = Math.max(0, state.offset - PAGE_SIZE);
        loadSubmissions();
    });

    nextButton.addEventListener("click", function () {
        if (state.offset + PAGE_SIZE < state.total) {
            state.offset += PAGE_SIZE;
            loadSubmissions();
        }
    });

    tableBody.addEventListener("click", function (event) {
        const button = event.target.closest("[data-reference]");

        if (button) {
            openSubmission(button.dataset.reference);
        }
    });

    closeDetailButton.addEventListener("click", closeDetail);

    detailOverlay.addEventListener("click", function (event) {
        if (event.target === detailOverlay) {
            closeDetail();
        }
    });

    detailStatus.addEventListener("change", async function () {
        if (!state.selectedReference) return;

        try {
            detailStatus.disabled = true;

            await apiRequest(
                `/admin/submissions/${encodeURIComponent(state.selectedReference)}`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        status: detailStatus.value
                    })
                }
            );

            await Promise.all([loadStats(), loadSubmissions()]);
        } catch (error) {
            alert(error.message || "The status could not be updated.");
        } finally {
            detailStatus.disabled = false;
        }
    });

    async function loadDashboard() {
        await Promise.all([loadStats(), loadSubmissions()]);
    }

    async function loadStats() {
        const data = await apiRequest("/admin/stats");

        document.getElementById("totalStat").textContent =
            data.stats.total;
        document.getElementById("newStat").textContent =
            data.stats.new;
        document.getElementById("reviewingStat").textContent =
            data.stats.reviewing;
        document.getElementById("quotedStat").textContent =
            data.stats.quoted;
        document.getElementById("wonStat").textContent =
            data.stats.won;
    }

    async function loadSubmissions() {
        setStatus("Loading enquiries...");

        const params = new URLSearchParams({
            limit: String(PAGE_SIZE),
            offset: String(state.offset)
        });

        if (state.type) params.set("type", state.type);
        if (state.status) params.set("status", state.status);
        if (state.search) params.set("search", state.search);

        try {
            const data = await apiRequest(
                `/admin/submissions?${params.toString()}`
            );

            state.total = data.pagination.total;
            renderRows(data.submissions);
            updatePagination();
            setStatus("");
        } catch (error) {
            setStatus(error.message || "Enquiries could not be loaded.", true);
            throw error;
        }
    }

    function renderRows(submissions) {
        tableBody.replaceChildren();
        emptyState.hidden = submissions.length > 0;

        submissions.forEach(function (submission) {
            const row = document.createElement("tr");
            const displayName =
                submission.brand_name ||
                submission.customer_name ||
                "Unnamed enquiry";

            row.innerHTML = `
                <td>
                    <button
                        class="reference-button"
                        type="button"
                        data-reference="${escapeHtml(submission.reference)}"
                    >
                        ${escapeHtml(submission.reference)}
                    </button>
                </td>
                <td>
                    <strong>${escapeHtml(displayName)}</strong>
                    <small>${escapeHtml(submission.email || "")}</small>
                </td>
                <td>
                    <span class="type-badge">
                        ${submission.submission_type === "project"
                            ? "Project"
                            : "Contact"}
                    </span>
                </td>
                <td>
                    <span class="status-badge status-${escapeHtml(submission.status)}">
                        ${escapeHtml(formatStatus(submission.status))}
                    </span>
                </td>
                <td>${escapeHtml(formatDate(submission.created_at))}</td>
                <td>
                    <button
                        class="view-button"
                        type="button"
                        data-reference="${escapeHtml(submission.reference)}"
                    >
                        View
                    </button>
                </td>
            `;

            tableBody.appendChild(row);
        });
    }

    async function openSubmission(reference) {
        setStatus("Opening enquiry...");

        try {
            const data = await apiRequest(
                `/admin/submissions/${encodeURIComponent(reference)}`
            );
            const submission = data.submission;

            state.selectedReference = submission.reference;

            document.getElementById("detailType").textContent =
                submission.submission_type === "project"
                    ? "PROJECT BRIEF"
                    : "CONTACT ENQUIRY";

            document.getElementById("detailReference").textContent =
                submission.reference;
            document.getElementById("detailBrand").textContent =
                submission.brand_name || "Not supplied";
            document.getElementById("detailCustomer").textContent =
                submission.customer_name || "Not supplied";

            const emailLink = document.getElementById("detailEmail");
            emailLink.textContent = submission.email || "Not supplied";
            emailLink.href = submission.email
                ? `mailto:${submission.email}`
                : "#";

            const phoneLink = document.getElementById("detailPhone");
            phoneLink.textContent = submission.phone || "Not supplied";
            phoneLink.href = submission.phone
                ? `https://wa.me/${submission.phone.replace(/\D/g, "")}`
                : "#";

            detailStatus.value = submission.status;
            renderPayload(submission.payload || {});

            detailOverlay.hidden = false;
            document.body.classList.add("detail-open");
            setStatus("");
        } catch (error) {
            setStatus(error.message || "The enquiry could not be opened.", true);
        }
    }

    function renderPayload(payload) {
        payloadList.replaceChildren();

        Object.entries(payload)
            .filter(function ([key, value]) {
                return (
                    !key.startsWith("_") &&
                    value !== "" &&
                    value !== null &&
                    value !== undefined
                );
            })
            .forEach(function ([key, value]) {
                const term = document.createElement("dt");
                const description = document.createElement("dd");

                term.textContent = formatLabel(key);
                description.textContent = Array.isArray(value)
                    ? value.join(", ")
                    : String(value);

                payloadList.append(term, description);
            });
    }

    function closeDetail() {
        detailOverlay.hidden = true;
        document.body.classList.remove("detail-open");
        state.selectedReference = "";
    }

    async function apiRequest(path, options = {}) {
        const response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: {
                Accept: "application/json",
                "Content-Type": "application/json",
                Authorization: `Bearer ${state.token}`,
                ...(options.headers || {})
            }
        });

        const data = await response.json().catch(function () {
            return {};
        });

        if (!response.ok) {
            if (response.status === 401) {
                sessionStorage.removeItem("luxsomeAdminToken");
                loginOverlay.classList.remove("is-hidden");
            }

            throw new Error(
                data.message || "The CRM request could not be completed."
            );
        }

        return data;
    }

    function updatePagination() {
        const currentPage = Math.floor(state.offset / PAGE_SIZE) + 1;
        const totalPages = Math.max(
            1,
            Math.ceil(state.total / PAGE_SIZE)
        );

        paginationText.textContent =
            `Page ${currentPage} of ${totalPages}`;

        previousButton.disabled = state.offset === 0;
        nextButton.disabled =
            state.offset + PAGE_SIZE >= state.total;
    }

    function setStatus(message, isError = false) {
        dashboardStatus.textContent = message;
        dashboardStatus.classList.toggle("is-error", isError);
    }

    function formatStatus(status) {
        return String(status || "")
            .replace(/_/g, " ")
            .replace(/\b\w/g, function (letter) {
                return letter.toUpperCase();
            });
    }

    function formatLabel(key) {
        return String(key)
            .replace(/_/g, " ")
            .replace(/\b\w/g, function (letter) {
                return letter.toUpperCase();
            });
    }

    function formatDate(value) {
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return value || "";
        }

        return new Intl.DateTimeFormat("en-NG", {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(date);
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    if (state.token) {
        loadDashboard()
            .then(function () {
                loginOverlay.classList.add("is-hidden");
            })
            .catch(function () {
                state.token = "";
            });
    } else {
        tokenInput.focus();
    }
});
