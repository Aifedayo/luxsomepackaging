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

    if (!state.token) {
        window.location.replace("/admin/login/");
        return;
    }

    const elements = {
        sidebar: document.getElementById("crmSidebar"),
        mobileMenuButton: document.getElementById("mobileMenuButton"),
        mobileBackdrop: document.getElementById("mobileBackdrop"),
        logoutButton: document.getElementById("logoutButton"),
        refreshButton: document.getElementById("refreshButton"),
        searchInput: document.getElementById("searchInput"),
        statusFilter: document.getElementById("statusFilter"),
        tableBody: document.getElementById("submissionsTableBody"),
        dashboardStatus: document.getElementById("dashboardStatus"),
        emptyState: document.getElementById("emptyState"),
        previousButton: document.getElementById("previousButton"),
        nextButton: document.getElementById("nextButton"),
        paginationText: document.getElementById("paginationText"),
        viewTitle: document.getElementById("viewTitle"),
        detailBackdrop: document.getElementById("detailBackdrop"),
        detailPanel: document.getElementById("detailPanel"),
        closeDetailButton: document.getElementById("closeDetailButton"),
        detailStatus: document.getElementById("detailStatus"),
        payloadList: document.getElementById("payloadList")
    };

    let searchTimer = null;

    elements.logoutButton.addEventListener("click", logout);

    elements.refreshButton.addEventListener("click", function () {
        loadDashboard();
    });

    elements.mobileMenuButton.addEventListener("click", openMobileMenu);
    elements.mobileBackdrop.addEventListener("click", closeMobileMenu);

    document.querySelectorAll(".crm-nav__item").forEach(function (button) {
        button.addEventListener("click", function () {
            document.querySelectorAll(".crm-nav__item").forEach(function (item) {
                item.classList.remove("is-active");
            });

            button.classList.add("is-active");

            const requestedView = button.dataset.view;
            state.type = requestedView === "all" ? "" : requestedView;
            state.offset = 0;

            elements.viewTitle.textContent =
                requestedView === "project"
                    ? "Project briefs"
                    : requestedView === "contact"
                        ? "Contact messages"
                        : "All enquiries";

            closeMobileMenu();
            loadSubmissions();
        });
    });

    elements.statusFilter.addEventListener("change", function () {
        state.status = elements.statusFilter.value;
        state.offset = 0;
        loadSubmissions();
    });

    elements.searchInput.addEventListener("input", function () {
        clearTimeout(searchTimer);

        searchTimer = setTimeout(function () {
            state.search = elements.searchInput.value.trim();
            state.offset = 0;
            loadSubmissions();
        }, 350);
    });

    elements.previousButton.addEventListener("click", function () {
        state.offset = Math.max(0, state.offset - PAGE_SIZE);
        loadSubmissions();
    });

    elements.nextButton.addEventListener("click", function () {
        if (state.offset + PAGE_SIZE < state.total) {
            state.offset += PAGE_SIZE;
            loadSubmissions();
        }
    });

    elements.tableBody.addEventListener("click", function (event) {
        const trigger = event.target.closest("[data-reference]");

        if (trigger) {
            openSubmission(trigger.dataset.reference);
        }
    });

    elements.closeDetailButton.addEventListener("click", closeDetail);
    elements.detailBackdrop.addEventListener("click", closeDetail);

    elements.detailStatus.addEventListener("change", async function () {
        if (!state.selectedReference) return;

        try {
            elements.detailStatus.disabled = true;

            await apiRequest(
                `/admin/submissions/${encodeURIComponent(state.selectedReference)}`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        status: elements.detailStatus.value
                    })
                }
            );

            await Promise.all([loadStats(), loadSubmissions()]);
        } catch (error) {
            window.alert(error.message || "The status could not be updated.");
        } finally {
            elements.detailStatus.disabled = false;
        }
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            if (elements.detailPanel.classList.contains("is-open")) {
                closeDetail();
            } else {
                closeMobileMenu();
            }
        }
    });

    async function loadDashboard() {
        await Promise.all([loadStats(), loadSubmissions()]);
    }

    async function loadStats() {
        const data = await apiRequest("/admin/stats");

        document.getElementById("totalStat").textContent = data.stats.total;
        document.getElementById("newStat").textContent = data.stats.new;
        document.getElementById("reviewingStat").textContent = data.stats.reviewing;
        document.getElementById("quotedStat").textContent = data.stats.quoted;
        document.getElementById("wonStat").textContent = data.stats.won;

        document.getElementById("navAllCount").textContent = data.stats.total;
        document.getElementById("navProjectCount").textContent = data.stats.projects;
        document.getElementById("navContactCount").textContent = data.stats.contacts;
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
            setStatus(
                error.message || "Enquiries could not be loaded.",
                true
            );
        }
    }

    function renderRows(submissions) {
        elements.tableBody.replaceChildren();
        elements.emptyState.hidden = submissions.length > 0;

        submissions.forEach(function (submission) {
            const row = document.createElement("tr");
            const displayName =
                submission.brand_name ||
                submission.customer_name ||
                "Unnamed enquiry";

            row.innerHTML = `
                <td>
                    <button
                        class="crm-reference-button"
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
                    <span class="crm-type-badge">
                        ${submission.submission_type === "project"
                            ? "Project"
                            : "Contact"}
                    </span>
                </td>
                <td>
                    <span class="crm-status-badge crm-status-${escapeHtml(submission.status)}">
                        ${escapeHtml(formatStatus(submission.status))}
                    </span>
                </td>
                <td>${escapeHtml(formatDate(submission.created_at))}</td>
                <td>
                    <button
                        class="crm-view-button"
                        type="button"
                        data-reference="${escapeHtml(submission.reference)}"
                    >
                        View
                    </button>
                </td>
            `;

            elements.tableBody.appendChild(row);
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

            const phoneDigits = String(submission.phone || "").replace(/\D/g, "");
            const phoneLink = document.getElementById("detailPhone");
            phoneLink.textContent = submission.phone || "Not supplied";
            phoneLink.href = phoneDigits
                ? `https://wa.me/${phoneDigits}`
                : "#";

            document.getElementById("emailAction").href = submission.email
                ? `mailto:${submission.email}?subject=${encodeURIComponent(
                    `Re: Luxsome enquiry ${submission.reference}`
                )}`
                : "#";

            document.getElementById("whatsappAction").href = phoneDigits
                ? `https://wa.me/${phoneDigits}`
                : "#";

            elements.detailStatus.value = submission.status;
            renderPayload(submission.payload || {});

            elements.detailBackdrop.hidden = false;
            elements.detailPanel.classList.add("is-open");
            elements.detailPanel.setAttribute("aria-hidden", "false");
            document.body.classList.add("crm-lock-scroll");

            setStatus("");
        } catch (error) {
            setStatus(
                error.message || "The enquiry could not be opened.",
                true
            );
        }
    }

    function renderPayload(payload) {
        elements.payloadList.replaceChildren();

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

                elements.payloadList.append(term, description);
            });
    }

    function closeDetail() {
        elements.detailBackdrop.hidden = true;
        elements.detailPanel.classList.remove("is-open");
        elements.detailPanel.setAttribute("aria-hidden", "true");
        document.body.classList.remove("crm-lock-scroll");
        state.selectedReference = "";
    }

    function openMobileMenu() {
        elements.sidebar.classList.add("is-open");
        elements.mobileBackdrop.hidden = false;
        elements.mobileMenuButton.setAttribute("aria-expanded", "true");
        document.body.classList.add("crm-lock-scroll");
    }

    function closeMobileMenu() {
        elements.sidebar.classList.remove("is-open");
        elements.mobileBackdrop.hidden = true;
        elements.mobileMenuButton.setAttribute("aria-expanded", "false");

        if (!elements.detailPanel.classList.contains("is-open")) {
            document.body.classList.remove("crm-lock-scroll");
        }
    }

    function logout() {
        sessionStorage.removeItem("luxsomeAdminToken");
        window.location.replace("/admin/login/");
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
                window.location.replace("/admin/login/");
                return;
            }

            throw new Error(
                data.message || "The CRM request could not be completed."
            );
        }

        return data;
    }

    function updatePagination() {
        const currentPage = Math.floor(state.offset / PAGE_SIZE) + 1;
        const totalPages = Math.max(1, Math.ceil(state.total / PAGE_SIZE));

        elements.paginationText.textContent =
            `Page ${currentPage} of ${totalPages}`;

        elements.previousButton.disabled = state.offset === 0;
        elements.nextButton.disabled =
            state.offset + PAGE_SIZE >= state.total;
    }

    function setStatus(message, isError = false) {
        elements.dashboardStatus.textContent = message;
        elements.dashboardStatus.classList.toggle("is-error", isError);
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

    loadDashboard();
});
