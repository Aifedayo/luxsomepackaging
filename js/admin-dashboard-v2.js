document.addEventListener("DOMContentLoaded", function () {
    const API_BASE = window.LUXSOME.apiBase;
    const PAGE_SIZE = 20;

    const state = {
        token: sessionStorage.getItem("luxsomeAdminToken") || "",
        view: "all",
        type: "",
        status: "",
        search: "",
        offset: 0,
        total: 0,
        selectedReference: "",
        selectedSubmission: null,
        selectedQuotation: null,
        artworkFiles: [],
        selectedArtwork: null,
        artworkObjectUrls: []
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
        createQuotationButton: document.getElementById("createQuotationButton"),
        searchInput: document.getElementById("searchInput"),
        statusFilter: document.getElementById("statusFilter"),
        tableBody: document.getElementById("submissionsTableBody"),
        dashboardStatus: document.getElementById("dashboardStatus"),
        emptyState: document.getElementById("emptyState"),
        previousButton: document.getElementById("previousButton"),
        nextButton: document.getElementById("nextButton"),
        paginationText: document.getElementById("paginationText"),
        viewTitle: document.getElementById("viewTitle"),
        enquiryTableHead: document.getElementById("enquiryTableHead"),
        quotationTableHead: document.getElementById("quotationTableHead"),
        detailBackdrop: document.getElementById("detailBackdrop"),
        detailPanel: document.getElementById("detailPanel"),
        closeDetailButton: document.getElementById("closeDetailButton"),
        detailStatus: document.getElementById("detailStatus"),
        detailCreateQuoteButton: document.getElementById("detailCreateQuoteButton"),
        payloadList: document.getElementById("payloadList"),
        artworkSection: document.getElementById("artworkSection"),
        artworkGrid: document.getElementById("artworkGrid"),
        artworkCount: document.getElementById("artworkCount"),
        artworkStatus: document.getElementById("artworkStatus"),
        artworkEmpty: document.getElementById("artworkEmpty"),
        artworkReviewForm: document.getElementById("artworkReviewForm"),
        artworkReviewStatus: document.getElementById("artworkReviewStatus"),
        artworkReviewedBy: document.getElementById("artworkReviewedBy"),
        artworkReviewNotes: document.getElementById("artworkReviewNotes"),
        artworkReviewMessage: document.getElementById("artworkReviewMessage"),
        saveArtworkReviewButton: document.getElementById("saveArtworkReviewButton"),
        artworkPreviewBackdrop: document.getElementById("artworkPreviewBackdrop"),
        artworkPreviewModal: document.getElementById("artworkPreviewModal"),
        artworkPreviewTitle: document.getElementById("artworkPreviewTitle"),
        artworkPreviewBody: document.getElementById("artworkPreviewBody"),
        closeArtworkPreviewButton: document.getElementById("closeArtworkPreviewButton"),
        downloadPreviewArtworkButton: document.getElementById("downloadPreviewArtworkButton"),
        quotationBackdrop: document.getElementById("quotationBackdrop"),
        quotationBuilder: document.getElementById("quotationBuilder"),
        quotationForm: document.getElementById("quotationForm"),
        closeQuotationButton: document.getElementById("closeQuotationButton"),
        cancelQuotationButton: document.getElementById("cancelQuotationButton"),
        addQuotationItemButton: document.getElementById("addQuotationItemButton"),
        quotationItems: document.getElementById("quotationItems"),
        quotationFormStatus: document.getElementById("quotationFormStatus"),
        quotationDetailPanel: document.getElementById("quotationDetailPanel"),
        closeQuotationDetailButton: document.getElementById("closeQuotationDetailButton"),
        quoteDetailStatus: document.getElementById("quoteDetailStatus"),
        editQuotationButton: document.getElementById("editQuotationButton"),
        previewQuotationButton: document.getElementById("previewQuotationButton"),
        downloadQuotationPdfButton: document.getElementById("downloadQuotationPdfButton"),
        quotationPreviewBackdrop: document.getElementById("quotationPreviewBackdrop"),
        quotationPreviewModal: document.getElementById("quotationPreviewModal"),
        closeQuotationPreviewButton: document.getElementById("closeQuotationPreviewButton"),
        previewPrintButton: document.getElementById("previewPrintButton"),
        sendQuotationButton: document.getElementById("sendQuotationButton"),
        createInvoiceFromQuoteButton: document.getElementById("createInvoiceFromQuoteButton"),
        sendQuotationBackdrop: document.getElementById("sendQuotationBackdrop"),
        sendQuotationModal: document.getElementById("sendQuotationModal"),
        closeSendQuotationButton: document.getElementById("closeSendQuotationButton"),
        cancelSendQuotationButton: document.getElementById("cancelSendQuotationButton"),
        confirmSendQuotationButton: document.getElementById("confirmSendQuotationButton"),
        sendQuotationStatus: document.getElementById("sendQuotationStatus")
    };

    let searchTimer = null;

    elements.logoutButton.addEventListener("click", logout);
    elements.refreshButton.addEventListener("click", loadCurrentView);
    elements.createQuotationButton.addEventListener("click", function () {
        openQuotationBuilder();
    });

    elements.mobileMenuButton.addEventListener("click", openMobileMenu);
    elements.mobileBackdrop.addEventListener("click", closeMobileMenu);

    document.querySelectorAll(".crm-nav__item").forEach(function (button) {
        button.addEventListener("click", function () {
            document.querySelectorAll(".crm-nav__item").forEach(function (item) {
                item.classList.remove("is-active");
            });

            button.classList.add("is-active");
            state.view = button.dataset.view;
            state.type = ["project", "contact"].includes(state.view)
                ? state.view
                : "";
            state.status = "";
            state.offset = 0;
            elements.statusFilter.value = "";
            elements.searchInput.value = "";
            state.search = "";

            updateViewConfiguration();
            closeMobileMenu();
            loadCurrentView();
        });
    });

    elements.statusFilter.addEventListener("change", function () {
        state.status = elements.statusFilter.value;
        state.offset = 0;
        loadCurrentView();
    });

    elements.searchInput.addEventListener("input", function () {
        clearTimeout(searchTimer);

        searchTimer = setTimeout(function () {
            state.search = elements.searchInput.value.trim();
            state.offset = 0;
            loadCurrentView();
        }, 350);
    });

    elements.previousButton.addEventListener("click", function () {
        state.offset = Math.max(0, state.offset - PAGE_SIZE);
        loadCurrentView();
    });

    elements.nextButton.addEventListener("click", function () {
        if (state.offset + PAGE_SIZE < state.total) {
            state.offset += PAGE_SIZE;
            loadCurrentView();
        }
    });

    elements.tableBody.addEventListener("click", function (event) {
        const submissionTrigger = event.target.closest("[data-reference]");
        const quotationTrigger = event.target.closest("[data-quote-reference]");

        if (quotationTrigger) {
            openQuotationDetail(quotationTrigger.dataset.quoteReference);
            return;
        }

        if (submissionTrigger) {
            openSubmission(submissionTrigger.dataset.reference);
        }
    });

    elements.closeDetailButton.addEventListener("click", closeDetail);
    elements.detailBackdrop.addEventListener("click", closeDetail);

    elements.artworkGrid?.addEventListener("click", handleArtworkGridClick);
    elements.artworkReviewForm?.addEventListener("submit", saveArtworkReview);
    elements.closeArtworkPreviewButton?.addEventListener(
        "click",
        closeArtworkPreview
    );
    elements.artworkPreviewBackdrop?.addEventListener(
        "click",
        closeArtworkPreview
    );
    elements.downloadPreviewArtworkButton?.addEventListener(
        "click",
        function () {
            if (state.selectedArtwork) {
                downloadArtwork(state.selectedArtwork);
            }
        }
    );

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

    elements.detailCreateQuoteButton.addEventListener("click", function () {
        const submission = state.selectedSubmission;
        closeDetail();
        openQuotationBuilder(submission);
    });

    elements.closeQuotationButton.addEventListener("click", closeQuotationBuilder);
    elements.cancelQuotationButton.addEventListener("click", closeQuotationBuilder);
    elements.quotationBackdrop.addEventListener("click", closeAllQuotationPanels);

    elements.addQuotationItemButton.addEventListener("click", function () {
        addQuotationItem();
    });

    elements.quotationItems.addEventListener("input", updateQuotationTotals);
    elements.quotationItems.addEventListener("click", function (event) {
        const removeButton = event.target.closest("[data-remove-item]");

        if (!removeButton) return;

        const item = removeButton.closest(".crm-quote-item");
        item?.remove();

        if (!elements.quotationItems.children.length) {
            addQuotationItem();
        }

        updateQuotationTotals();
    });

    ["quoteDiscount", "quoteDeliveryFee", "quoteTax"].forEach(function (id) {
        document.getElementById(id).addEventListener("input", updateQuotationTotals);
    });

    elements.quotationForm.addEventListener("submit", saveQuotation);

    elements.closeQuotationDetailButton.addEventListener(
        "click",
        closeQuotationDetail
    );

    elements.quoteDetailStatus.addEventListener("change", updateQuotationStatus);

    elements.editQuotationButton.addEventListener("click", function () {
        if (
            !state.selectedQuotation ||
            elements.editQuotationButton.disabled
        ) {
            return;
        }

        const quotation = state.selectedQuotation;
        closeQuotationDetail();
        openQuotationBuilder(null, quotation);
    });

    elements.previewQuotationButton.addEventListener("click", function () {
        if (!state.selectedQuotation) return;
        openQuotationPreview(state.selectedQuotation);
    });

    elements.downloadQuotationPdfButton.addEventListener("click", function () {
        if (!state.selectedQuotation) return;
        openQuotationPreview(state.selectedQuotation, true);
    });

    elements.closeQuotationPreviewButton.addEventListener(
        "click",
        closeQuotationPreview
    );

    elements.quotationPreviewBackdrop.addEventListener(
        "click",
        closeQuotationPreview
    );

    elements.previewPrintButton.addEventListener("click", printQuotation);

    elements.sendQuotationButton.addEventListener("click", function () {
        if (elements.sendQuotationButton.disabled) return;
        openSendQuotationModal();
    });
    elements.createInvoiceFromQuoteButton.addEventListener("click", function () {
        const quotation = state.selectedQuotation;

        if (!quotation?.invoiceReference) {
            window.alert(
                "The automatic invoice is not available yet. Refresh the quotation and try again."
            );
            return;
        }

        window.location.href =
            `/admin/invoices/?invoice=${encodeURIComponent(
                quotation.invoiceReference
            )}`;
    });
    elements.closeSendQuotationButton.addEventListener("click", closeSendQuotationModal);
    elements.cancelSendQuotationButton.addEventListener("click", closeSendQuotationModal);
    elements.sendQuotationBackdrop.addEventListener("click", closeSendQuotationModal);
    elements.confirmSendQuotationButton.addEventListener("click", sendQuotation);


    document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;

        if (elements.artworkPreviewModal?.classList.contains("is-open")) {
            closeArtworkPreview();
        } else if (elements.sendQuotationModal.classList.contains("is-open")) {
            closeSendQuotationModal();
        } else if (elements.quotationPreviewModal.classList.contains("is-open")) {
            closeQuotationPreview();
        } else if (elements.quotationBuilder.classList.contains("is-open")) {
            closeQuotationBuilder();
        } else if (elements.quotationDetailPanel.classList.contains("is-open")) {
            closeQuotationDetail();
        } else if (elements.detailPanel.classList.contains("is-open")) {
            closeDetail();
        } else {
            closeMobileMenu();
        }
    });

    async function loadDashboard() {
        await Promise.all([loadStats(), loadCurrentView()]);
    }

    async function loadCurrentView() {
        if (state.view === "quotations") {
            await loadQuotations();
        } else {
            await loadSubmissions();
        }
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

        try {
            const quotationData = await apiRequest(
                "/admin/quotations?limit=1&offset=0"
            );

            document.getElementById("navQuotationCount").textContent =
                quotationData.pagination.total;
        } catch (_) {
            document.getElementById("navQuotationCount").textContent = "0";
        }
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
            renderSubmissionRows(data.submissions);
            updatePagination();
            setStatus("");
        } catch (error) {
            setStatus(
                error.message || "Enquiries could not be loaded.",
                true
            );
        }
    }

    async function loadQuotations() {
        setStatus("Loading quotations...");

        const params = new URLSearchParams({
            limit: String(PAGE_SIZE),
            offset: String(state.offset)
        });

        if (state.status) params.set("status", state.status);
        if (state.search) params.set("search", state.search);

        try {
            const data = await apiRequest(
                `/admin/quotations?${params.toString()}`
            );

            state.total = data.pagination.total;
            renderQuotationRows(data.quotations);
            updatePagination();
            setStatus("");
        } catch (error) {
            setStatus(
                error.message || "Quotations could not be loaded.",
                true
            );
        }
    }

    function updateViewConfiguration() {
        const isQuotationView = state.view === "quotations";

        elements.enquiryTableHead.hidden = isQuotationView;
        elements.quotationTableHead.hidden = !isQuotationView;

        elements.viewTitle.textContent =
            state.view === "project"
                ? "Project briefs"
                : state.view === "contact"
                    ? "Contact messages"
                    : isQuotationView
                        ? "Quotations"
                        : "All enquiries";

        elements.createQuotationButton.hidden = false;

        const quotationStatuses = [
            ["", "All statuses"],
            ["draft", "Draft"],
            ["sent", "Sent"],
            ["accepted", "Accepted"],
            ["declined", "Declined"],
            ["expired", "Expired"],
            ["cancelled", "Cancelled"]
        ];

        const enquiryStatuses = [
            ["", "All statuses"],
            ["new", "New"],
            ["reviewing", "Reviewing"],
            ["quoted", "Quoted"],
            ["follow_up", "Follow up"],
            ["won", "Won"],
            ["lost", "Lost"],
            ["archived", "Archived"]
        ];

        const options = isQuotationView
            ? quotationStatuses
            : enquiryStatuses;

        elements.statusFilter.replaceChildren();

        options.forEach(function ([value, label]) {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = label;
            elements.statusFilter.appendChild(option);
        });
    }

    function renderSubmissionRows(submissions) {
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

    function renderQuotationRows(quotations) {
        elements.tableBody.replaceChildren();
        elements.emptyState.hidden = quotations.length > 0;

        quotations.forEach(function (quotation) {
            const row = document.createElement("tr");
            const displayName =
                quotation.brand_name ||
                quotation.customer_name ||
                "Unnamed customer";

            row.innerHTML = `
                <td>
                    <button
                        class="crm-reference-button"
                        type="button"
                        data-quote-reference="${escapeHtml(quotation.quote_reference)}"
                    >
                        ${escapeHtml(quotation.quote_reference)}
                    </button>
                </td>
                <td>
                    <strong>${escapeHtml(displayName)}</strong>
                    <small>${escapeHtml(quotation.customer_email || "")}</small>
                </td>
                <td>
                    <span class="crm-status-badge crm-quotation-status-${escapeHtml(quotation.status)}">
                        ${escapeHtml(formatStatus(quotation.status))}
                    </span>
                </td>
                <td>${escapeHtml(String(quotation.item_count || 0))}</td>
                <td><strong>${escapeHtml(formatMoney(quotation.grand_total))}</strong></td>
                <td>${escapeHtml(formatDateOnly(quotation.issue_date))}</td>
                <td>
                    <button
                        class="crm-view-button"
                        type="button"
                        data-quote-reference="${escapeHtml(quotation.quote_reference)}"
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
            state.selectedSubmission = submission;

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
            await loadSubmissionArtwork(submission);

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
                    ![
                        "artwork_upload_id",
                        "artwork_object_keys",
                        "artwork_uploaded"
                    ].includes(key) &&
                    value !== "" &&
                    value !== null &&
                    value !== undefined
                );
            })
            .forEach(function ([key, value]) {
                const term = document.createElement("dt");
                const description = document.createElement("dd");

                term.textContent = formatLabel(key);

                if (
                    ["custom_items", "shop_custom_items"].includes(key)
                ) {
                    const customItems =
                        parseDisplayList(value);

                    description.textContent =
                        customItems.join(", ") ||
                        "None";
                } else if (key === "shop_configuration") {
                    description.textContent =
                        "Full shop configuration saved with this project.";
                } else {
                    description.textContent =
                        Array.isArray(value)
                            ? value.join(", ")
                            : String(value);
                }

                elements.payloadList.append(term, description);
            });
    }


    async function loadSubmissionArtwork(submission) {
        if (!elements.artworkSection) return;

        const isProject = submission.submission_type === "project";
        elements.artworkSection.hidden = !isProject;

        if (!isProject) {
            return;
        }

        revokeArtworkObjectUrls();
        state.artworkFiles = [];
        state.selectedArtwork = null;

        elements.artworkGrid.replaceChildren();
        elements.artworkEmpty.hidden = true;
        elements.artworkStatus.textContent = "Loading artwork files...";
        elements.artworkCount.textContent = "0 files";
        elements.artworkReviewMessage.textContent = "";

        try {
            const data = await apiRequest(
                `/admin/submissions/${encodeURIComponent(
                    submission.reference
                )}/artwork`
            );

            state.artworkFiles = Array.isArray(data.files)
                ? data.files
                : [];

            renderArtworkFiles(state.artworkFiles);
            renderArtworkReview(data.review || {});
            elements.artworkStatus.textContent = "";
        } catch (error) {
            elements.artworkStatus.textContent =
                error.message || "Artwork files could not be loaded.";
            elements.artworkStatus.classList.add("is-error");
            elements.artworkEmpty.hidden = false;
        }
    }

    function renderArtworkFiles(files) {
        elements.artworkGrid.replaceChildren();

        const count = files.length;
        elements.artworkCount.textContent =
            `${count} ${count === 1 ? "file" : "files"}`;
        elements.artworkEmpty.hidden = count > 0;

        if (!count) {
            return;
        }

        files.forEach(function (file) {
            const card = document.createElement("article");
            card.className = "crm-artwork-card";

            const previewable = Boolean(file.previewable);
            const typeLabel =
                file.extension
                    ? file.extension.toUpperCase()
                    : "FILE";

            card.innerHTML = `
                <div class="crm-artwork-card__preview" data-artwork-preview-area>
                    <span class="crm-artwork-card__type">
                        ${escapeHtml(typeLabel)}
                    </span>
                    <span class="crm-artwork-card__icon" aria-hidden="true">
                        ${escapeHtml(artworkTypeIcon(file.extension))}
                    </span>
                </div>

                <div class="crm-artwork-card__content">
                    <strong title="${escapeHtml(file.name)}">
                        ${escapeHtml(file.name)}
                    </strong>

                    <p>
                        ${escapeHtml(formatFileSize(file.size))}
                        ${file.uploadedAt
                            ? ` · ${escapeHtml(formatDate(file.uploadedAt))}`
                            : ""}
                    </p>

                    <div class="crm-artwork-card__actions">
                        ${previewable
                            ? `<button
                                    type="button"
                                    data-artwork-action="preview"
                                    data-artwork-key="${escapeHtml(file.key)}"
                               >
                                    Preview
                               </button>`
                            : ""}

                        <button
                            type="button"
                            data-artwork-action="download"
                            data-artwork-key="${escapeHtml(file.key)}"
                        >
                            Download
                        </button>
                    </div>
                </div>
            `;

            elements.artworkGrid.appendChild(card);

            if (file.thumbnailable) {
                loadArtworkThumbnail(
                    file,
                    card.querySelector("[data-artwork-preview-area]")
                );
            }
        });
    }

    function renderArtworkReview(review) {
        elements.artworkReviewStatus.value =
            review.status || "pending_review";
        elements.artworkReviewedBy.value =
            review.reviewedBy || "";
        elements.artworkReviewNotes.value =
            review.notes || "";
    }

    async function loadArtworkThumbnail(file, container) {
        try {
            const blob = await fetchArtworkBlob(file, "inline");
            const objectUrl = URL.createObjectURL(blob);
            state.artworkObjectUrls.push(objectUrl);

            const image = document.createElement("img");
            image.src = objectUrl;
            image.alt = "";
            image.loading = "lazy";

            container.replaceChildren(image);
        } catch (_) {
            // Keep the file-type placeholder when a thumbnail cannot load.
        }
    }

    function handleArtworkGridClick(event) {
        const button = event.target.closest("[data-artwork-action]");
        if (!button) return;

        const file = state.artworkFiles.find(
            item => item.key === button.dataset.artworkKey
        );

        if (!file) return;

        if (button.dataset.artworkAction === "preview") {
            previewArtwork(file);
        } else {
            downloadArtwork(file);
        }
    }

    async function previewArtwork(file) {
        state.selectedArtwork = file;
        elements.artworkPreviewTitle.textContent = file.name;
        elements.artworkPreviewBody.innerHTML =
            '<p class="crm-artwork-preview__loading">Loading preview...</p>';

        elements.artworkPreviewBackdrop.hidden = false;
        elements.artworkPreviewModal.classList.add("is-open");
        elements.artworkPreviewModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("crm-lock-scroll");

        try {
            const blob = await fetchArtworkBlob(file, "inline");
            const objectUrl = URL.createObjectURL(blob);
            state.artworkObjectUrls.push(objectUrl);

            if (file.kind === "image") {
                const image = document.createElement("img");
                image.src = objectUrl;
                image.alt = file.name;
                elements.artworkPreviewBody.replaceChildren(image);
                return;
            }

            if (file.kind === "pdf") {
                const frame = document.createElement("iframe");
                frame.src = objectUrl;
                frame.title = `Preview of ${file.name}`;
                elements.artworkPreviewBody.replaceChildren(frame);
                return;
            }

            throw new Error("This file type cannot be previewed in the browser.");
        } catch (error) {
            elements.artworkPreviewBody.innerHTML = `
                <div class="crm-artwork-preview__unavailable">
                    <strong>Preview unavailable</strong>
                    <p>${escapeHtml(
                        error.message ||
                        "Download the file to review it."
                    )}</p>
                </div>
            `;
        }
    }

    function closeArtworkPreview() {
        if (!elements.artworkPreviewModal) return;

        elements.artworkPreviewBackdrop.hidden = true;
        elements.artworkPreviewModal.classList.remove("is-open");
        elements.artworkPreviewModal.setAttribute("aria-hidden", "true");
        elements.artworkPreviewBody.replaceChildren();
        state.selectedArtwork = null;

        if (
            !elements.detailPanel.classList.contains("is-open") &&
            !elements.quotationBuilder.classList.contains("is-open") &&
            !elements.quotationDetailPanel.classList.contains("is-open")
        ) {
            document.body.classList.remove("crm-lock-scroll");
        }
    }

    async function downloadArtwork(file) {
        try {
            const blob = await fetchArtworkBlob(file, "attachment");
            const objectUrl = URL.createObjectURL(blob);
            const anchor = document.createElement("a");

            anchor.href = objectUrl;
            anchor.download = file.name || "luxsome-artwork";
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();

            window.setTimeout(function () {
                URL.revokeObjectURL(objectUrl);
            }, 1000);
        } catch (error) {
            window.alert(
                error.message || "The artwork file could not be downloaded."
            );
        }
    }

    async function fetchArtworkBlob(file, disposition) {
        const params = new URLSearchParams({
            key: file.key,
            disposition
        });

        const response = await fetch(
            `${API_BASE}/admin/submissions/${encodeURIComponent(
                state.selectedReference
            )}/artwork/file?${params.toString()}`,
            {
                headers: {
                    Authorization: `Bearer ${state.token}`
                }
            }
        );

        if (!response.ok) {
            const data = await response.json().catch(function () {
                return {};
            });

            throw new Error(
                data.message || "The artwork file could not be opened."
            );
        }

        return response.blob();
    }

    async function saveArtworkReview(event) {
        event.preventDefault();

        if (!state.selectedReference) return;

        const button = elements.saveArtworkReviewButton;
        elements.artworkReviewMessage.textContent = "Saving review...";
        button.disabled = true;

        try {
            const data = await apiRequest(
                `/admin/submissions/${encodeURIComponent(
                    state.selectedReference
                )}/artwork-review`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        status: elements.artworkReviewStatus.value,
                        reviewedBy: elements.artworkReviewedBy.value.trim(),
                        notes: elements.artworkReviewNotes.value.trim()
                    })
                }
            );

            renderArtworkReview(data.review || {});
            elements.artworkReviewMessage.textContent =
                "Artwork review saved.";
        } catch (error) {
            elements.artworkReviewMessage.textContent =
                error.message || "The artwork review could not be saved.";
        } finally {
            button.disabled = false;
        }
    }

    function artworkTypeIcon(extension) {
        const value = String(extension || "").toLowerCase();

        if (["jpg", "jpeg", "png", "webp", "svg"].includes(value)) {
            return "IMG";
        }

        if (value === "pdf") return "PDF";
        if (["ai", "eps"].includes(value)) return "AI";
        if (value === "psd") return "PSD";
        if (["tif", "tiff"].includes(value)) return "TIF";
        if (value === "zip") return "ZIP";

        return "FILE";
    }

    function formatFileSize(bytes) {
        const size = Number(bytes || 0);

        if (!Number.isFinite(size) || size <= 0) {
            return "Size unavailable";
        }

        const units = ["B", "KB", "MB", "GB"];
        const unitIndex = Math.min(
            Math.floor(Math.log(size) / Math.log(1024)),
            units.length - 1
        );

        const amount = size / Math.pow(1024, unitIndex);

        return `${amount >= 10 || unitIndex === 0
            ? amount.toFixed(0)
            : amount.toFixed(1)} ${units[unitIndex]}`;
    }

    function revokeArtworkObjectUrls() {
        state.artworkObjectUrls.forEach(function (url) {
            URL.revokeObjectURL(url);
        });

        state.artworkObjectUrls = [];
    }

    function closeDetail() {
        elements.detailBackdrop.hidden = true;
        elements.detailPanel.classList.remove("is-open");
        elements.detailPanel.setAttribute("aria-hidden", "true");
        document.body.classList.remove("crm-lock-scroll");
        closeArtworkPreview();
        revokeArtworkObjectUrls();
        state.selectedReference = "";
        state.selectedSubmission = null;
        state.artworkFiles = [];
        state.selectedArtwork = null;

        if (elements.artworkSection) {
            elements.artworkSection.hidden = true;
        }
    }

    function openQuotationBuilder(submission = null, quotation = null) {
        resetQuotationForm();

        if (submission) {
            document.getElementById("quotationSubmissionReference").value =
                submission.reference || "";

            document.getElementById("quoteCustomerName").value =
                submission.customer_name || "";

            document.getElementById("quoteBrandName").value =
                submission.brand_name || "";

            document.getElementById("quoteCustomerEmail").value =
                submission.email || "";

            document.getElementById("quoteCustomerPhone").value =
                submission.phone || "";

            // Do not depend on one exact submission_type value. Older and newer
            // project forms may use different type names. Instead, inspect the
            // submitted payload and import every recognised requested item.
            populateQuotationItemsFromSubmission(submission);
        }

        if (quotation) {
            populateQuotationForm(quotation);
        }

        elements.quotationBackdrop.hidden = false;
        elements.quotationBuilder.classList.add("is-open");
        elements.quotationBuilder.setAttribute("aria-hidden", "false");
        document.body.classList.add("crm-lock-scroll");
    }

    function resetQuotationForm() {
        elements.quotationForm.reset();
        elements.quotationItems.replaceChildren();
        elements.quotationFormStatus.textContent = "";

        document.getElementById("quotationReference").value = "";
        document.getElementById("quotationSubmissionReference").value = "";
        document.getElementById("quotationBuilderTitle").textContent =
            "Create quotation";

        const issue = new Date();
        const expiry = new Date();
        expiry.setDate(issue.getDate() + 7);

        document.getElementById("quoteIssueDate").value = toDateInput(issue);
        document.getElementById("quoteExpiryDate").value = toDateInput(expiry);
        document.getElementById("quoteProductionTimeline").value =
            "15–20 business days after payment and artwork approval.";
        document.getElementById("quotePaymentTerms").value =
            "70% deposit to begin production. 30% before dispatch.";
        document.getElementById("quoteNotes").value =
            "Quotation is subject to final artwork approval.";

        addQuotationItem();
        updateQuotationTotals();
    }

    function populateQuotationItemsFromSubmission(submission) {
        const payload = normaliseSubmissionPayload(submission?.payload);
        const projectItems = extractProjectItems(payload);

        console.debug("[Luxsome CRM] quotation inheritance", {
            reference: submission?.reference,
            submissionType: submission?.submission_type,
            payload,
            projectItems
        });

        if (!projectItems.length) {
            elements.quotationFormStatus.textContent =
                "No item quantities were detected in this project brief. Review the submitted details and add the quotation items manually.";
            return;
        }

        elements.quotationItems.replaceChildren();

        projectItems.forEach(function (item) {
            addQuotationItem({
                description: item.description,
                details: item.details || "Imported from project brief",
                quantity: item.quantity,
                unitPrice: 0,
                requestedQuantity: item.quantity,
                inheritedFromProject: true,
                sourcePath: item.sourcePath || ""
            });
        });

        elements.quotationFormStatus.textContent =
            `${projectItems.length} quotation item${projectItems.length === 1 ? "" : "s"} imported from the customer's selection. Tier systems are kept as one package; Bespoke selections are listed by piece.`;
        updateQuotationTotals();
    }

    function normaliseSubmissionPayload(payload) {
        if (!payload) return {};
        if (typeof payload === "object") return payload;

        if (typeof payload === "string") {
            try {
                const parsed = JSON.parse(payload);
                return parsed && typeof parsed === "object" ? parsed : {};
            } catch (_) {
                return { project_request: payload };
            }
        }

        return {};
    }

    function extractProjectItems(payload) {
        const items = [];
        const seen = new Set();

        function clean(value) {
            return String(value ?? "").trim();
        }

        function title(value) {
            return clean(value)
                .replace(/([a-z])([A-Z])/g, "$1 $2")
                .replace(/[_-]+/g, " ")
                .replace(/\s+/g, " ")
                .replace(/\b\w/g, function (letter) {
                    return letter.toUpperCase();
                });
        }

        function number(value) {
            if (typeof value === "number") {
                return Number.isFinite(value) && value > 0 ? value : null;
            }

            const match = clean(value)
                .replace(/,/g, "")
                .match(/\d+(?:\.\d+)?/);

            if (!match) return null;

            const result = Number(match[0]);
            return Number.isFinite(result) && result > 0 ? result : null;
        }

        function parseJsonValue(value, fallback) {
            if (Array.isArray(value)) return value;

            if (value && typeof value === "object") {
                return value;
            }

            const rawValue = clean(value);
            if (!rawValue) return fallback;

            const candidates = [rawValue];

            try {
                const decoded = decodeURIComponent(rawValue);

                if (decoded !== rawValue) {
                    candidates.push(decoded);
                }
            } catch (_) {
                // The value is not URL encoded.
            }

            for (const candidate of candidates) {
                try {
                    let parsed = JSON.parse(candidate);

                    /*
                     * Some submissions contain JSON encoded twice.
                     */
                    if (typeof parsed === "string") {
                        try {
                            parsed = JSON.parse(parsed);
                        } catch (_) {
                            // Keep the first parsed value.
                        }
                    }

                    return parsed;
                } catch (_) {
                    // Try the next representation.
                }
            }

            return fallback;
        }

        function firstValue(object, keys) {
            for (const key of keys) {
                const value = object?.[key];

                if (
                    value !== undefined &&
                    value !== null &&
                    clean(value)
                ) {
                    return value;
                }
            }

            return "";
        }

        function list(value) {
            const normaliseEntry = entry => {
                if (entry && typeof entry === "object") {
                    return clean(
                        firstValue(entry, [
                            "value",
                            "name",
                            "label",
                            "title",
                            "piece",
                            "item",
                            "description"
                        ])
                    );
                }

                return clean(entry);
            };

            if (Array.isArray(value)) {
                return value.map(normaliseEntry).filter(Boolean);
            }

            const parsed = parseJsonValue(value, null);

            if (Array.isArray(parsed)) {
                return parsed.map(normaliseEntry).filter(Boolean);
            }

            if (parsed && typeof parsed === "object") {
                return Object.entries(parsed)
                    .filter(function ([, selected]) {
                        return (
                            selected === true ||
                            selected === 1 ||
                            selected === "1" ||
                            String(selected).toLowerCase() === "yes"
                        );
                    })
                    .map(function ([key]) {
                        return clean(key);
                    })
                    .filter(Boolean);
            }

            return clean(value)
                .split(/[,;|]/)
                .map(clean)
                .filter(Boolean);
        }

        function add(description, quantity, details, sourcePath) {
            const cleanDescription = title(description);
            const cleanQuantity = number(quantity);

            if (!cleanDescription || !cleanQuantity) return;

            const key =
                `${cleanDescription.toLowerCase()}::${cleanQuantity}`;

            if (seen.has(key)) return;

            seen.add(key);
            items.push({
                description: cleanDescription,
                quantity: cleanQuantity,
                details: clean(details),
                sourcePath: sourcePath || ""
            });
        }

        function configurationFromPayload(source) {
            const root =
                source && typeof source === "object" && !Array.isArray(source)
                    ? source
                    : {};

            const candidates = [
                root.shop_configuration,
                root.shopConfiguration,
                root.configuration,
                root.project_configuration,
                root.projectConfiguration,
                root.project?.configuration
            ];

            let nestedConfiguration = {};

            for (const candidate of candidates) {
                const parsed = parseJsonValue(candidate, null);

                if (
                    parsed &&
                    typeof parsed === "object" &&
                    !Array.isArray(parsed)
                ) {
                    nestedConfiguration = parsed;
                    break;
                }
            }

            /*
             * Project submissions contain a mixture of:
             *   - normal keys: packaging_pieces
             *   - shop-prefixed keys: shop_packaging_pieces
             *   - a serialized shop_configuration object
             *
             * Previously, returning only shop_configuration discarded
             * top-level accessories and additional projects. Bespoke quotes
             * therefore imported only part of the customer's selection.
             */
            const merged = {
                ...root,
                ...nestedConfiguration
            };

            /*
             * Create unprefixed aliases for every shop_* field. Existing
             * unprefixed fields remain authoritative when both are present.
             */
            Object.entries(merged).forEach(function ([key, value]) {
                if (!key.startsWith("shop_")) return;

                const unprefixedKey = key.slice(5);

                if (
                    merged[unprefixedKey] === undefined ||
                    merged[unprefixedKey] === null ||
                    clean(merged[unprefixedKey]) === ""
                ) {
                    merged[unprefixedKey] = value;
                }
            });

            return merged;
        }

        function pieceName(piece) {
            const normalised = clean(piece).toLowerCase();

            if (/rigid|box/.test(normalised)) return "Rigid box";
            if (/hang\s*tag|product\s*tag|tag/.test(normalised)) return "Hang tag";
            if (/thank/.test(normalised) && /card/.test(normalised)) return "Thank-you card";
            if (/sticker|seal/.test(normalised)) return "Sticker seal";
            if (/tissue/.test(normalised)) return "Branded tissue";
            if (/envelope/.test(normalised)) return "Envelope";
            if (/ribbon/.test(normalised)) return "Branded ribbon";
            if (/shopping\s*bag|paper\s*bag|bag/.test(normalised)) return "Shopping bag";
            if (/product\s*(description|care)\s*card/.test(normalised)) {
                return "Product description card";
            }
            if (/pull\s*tab/.test(normalised)) return "Pull tab";
            if (/ribbon\s*handle/.test(normalised)) {
                return "Ribbon handle with eyelets";
            }
            if (/insert/.test(normalised)) return "Product insert";

            return title(piece);
        }

        function selectedSystem(configuration) {
            return clean(
                firstValue(configuration, [
                    "system",
                    "product_name",
                    "productName",
                    "package_type",
                    "packageType",
                    "submitted_packaging_system",
                    "packaging_system",
                    "packagingSystem",
                    "tier",
                    "shop_system",
                    "shop_product",
                    "shop_product_name"
                ])
            );
        }

        function isBespokeSelection(configuration) {
            const system = selectedSystem(configuration).toLowerCase();

            const projectType = clean(
                firstValue(configuration, [
                    "project_type",
                    "projectType",
                    "shop_project_type"
                ])
            ).toLowerCase();

            return (
                system.includes("bespoke") ||
                projectType.includes("bespoke") ||
                projectType.includes("custom")
            );
        }

        function tierDisplayName(configuration) {
            const system = selectedSystem(configuration);

            if (/\btier\s*1\b/i.test(system) || /foundation/i.test(system)) {
                return "Tier 1 Packaging System";
            }

            if (/\btier\s*2\b/i.test(system) || /signature/i.test(system)) {
                return "Tier 2 Packaging System";
            }

            if (
                /\btier\s*3\b/i.test(system) ||
                /prestige|platinum/i.test(system)
            ) {
                return "Tier 3 Packaging System";
            }

            return system || "Packaging System";
        }

        function pieceDetails(piece, configuration) {
            const name = pieceName(piece);
            const details = [];

            const styleMap = {
                "Hang tag": ["tag_style", "tagStyle"],
                "Thank-you card": [
                    "thank_you_card",
                    "thankYouCard",
                    "card_style",
                    "cardStyle"
                ],
                "Sticker seal": ["sticker_style", "stickerStyle"],
                "Branded tissue": ["tissue_style", "tissueStyle"],
                "Envelope": ["envelope_style", "envelopeStyle"],
                "Branded ribbon": ["ribbon_style", "ribbonStyle"],
                "Shopping bag": ["bag_style", "bagStyle"],
                "Product description card": [
                    "product_description_card",
                    "productDescriptionCard"
                ],
                "Product insert": ["insert_style", "insertStyle"],
                "Ribbon handle with eyelets": [
                    "ribbon_handle",
                    "ribbonHandle"
                ],
                "Pull tab": ["pull_tab", "pullTab"]
            };

            const colourMap = {
                "Thank-you card": [
                    "thank_you_card_colour",
                    "thankYouCardColour",
                    "thank_you_card_color",
                    "thankYouCardColor"
                ],
                "Branded tissue": [
                    "tissue_colour",
                    "tissueColour",
                    "tissue_color",
                    "tissueColor"
                ],
                "Envelope": [
                    "envelope_colour",
                    "envelopeColour",
                    "envelope_color",
                    "envelopeColor"
                ],
                "Branded ribbon": [
                    "ribbon_colour",
                    "ribbon_color",
                    "ribbonColour",
                    "ribbonColor"
                ]
            };

            const style = firstValue(
                configuration,
                styleMap[name] || []
            );

            if (style) {
                details.push(clean(style));
            }

            const colour = firstValue(
                configuration,
                colourMap[name] || []
            );

            if (colour) {
                details.push(
                    `Colour: ${clean(colour)}`
                );
            }

            return details.join(" · ");
        }

        function boxDetails(configuration) {
            const details = [];

            const length = firstValue(
                configuration,
                [
                    "box_length_cm",
                    "boxLength",
                    "box_length",
                    "boxLengthDisplay",
                    "length"
                ]
            );

            const breadth = firstValue(
                configuration,
                [
                    "box_breadth_cm",
                    "boxBreadth",
                    "box_breadth",
                    "boxBreadthDisplay",
                    "breadth",
                    "width"
                ]
            );

            const height = firstValue(
                configuration,
                [
                    "box_height_cm",
                    "boxHeight",
                    "box_height",
                    "boxHeightDisplay",
                    "height"
                ]
            );

            if (length && breadth && height) {
                details.push(
                    `${clean(length)} × ${clean(breadth)} × ${clean(height)} cm`
                );
            }

            const logoFinish = firstValue(
                configuration,
                ["logo_finish", "logoFinish"]
            );

            if (logoFinish) {
                details.push(`Logo finish: ${clean(logoFinish)}`);
            }

            return details.join(" · ");
        }

        function tierDetails(configuration) {
            const details = [];
            const boxStyle = firstValue(
                configuration,
                ["box_style", "boxStyle"]
            );

            if (boxStyle) {
                details.push(`Box: ${clean(boxStyle)}`);
            }

            const pieces = list(
                firstValue(configuration, [
                    "packaging_pieces",
                    "packagingPieces",
                    "submitted_components",
                    "components",
                    "shop_packaging_pieces"
                ])
            );

            if (pieces.length) {
                details.push(
                    `Includes: ${pieces.map(pieceName).join(", ")}`
                );
            }

            const dimensions = boxDetails(configuration);
            if (dimensions) details.push(dimensions);

            return details.join(" · ");
        }

        function accessoryNames(configuration) {
            return list(
                firstValue(configuration, [
                    "accessories",
                    "added_accessories",
                    "addedAccessories",
                    "additional_accessories",
                    "additionalAccessories",
                    "extras",
                    "selected_extras",
                    "selectedExtras",
                    "shop_accessories"
                ])
            ).map(pieceName);
        }

        function accessoryQuantity(accessory, configuration, fallbackQuantity) {
            const slug = clean(accessory)
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "_")
                .replace(/^_+|_+$/g, "");

            return firstValue(configuration, [
                `${slug}_quantity`,
                `${slug}Quantity`,
                "accessory_quantity",
                "accessoryQuantity",
                "other_pieces_quantity",
                "otherPiecesQuantity"
            ]) || fallbackQuantity;
        }

        function importTier(configuration) {
            const quantity = firstValue(
                configuration,
                [
                    "quantity",
                    "requested_quantity",
                    "requestedQuantity",
                    "box_quantity",
                    "boxQuantity",
                    "shop_quantity",
                    "shop_box_quantity"
                ]
            );

            add(
                tierDisplayName(configuration),
                quantity,
                tierDetails(configuration),
                "shop_configuration.quantity"
            );

            accessoryNames(configuration).forEach(function (accessory) {
                add(
                    accessory,
                    accessoryQuantity(accessory, configuration, quantity),
                    pieceDetails(accessory, configuration),
                    "shop_configuration.accessories"
                );
            });
        }

        function importBespoke(configuration, prefix = "") {
            let pieces = list(
                firstValue(configuration, [
                    "packaging_pieces",
                    "packagingPieces",
                    "submitted_components",
                    "components",
                    "shop_packaging_pieces"
                ])
            );

            const customItems = list(
                firstValue(configuration, [
                    "custom_items",
                    "customItems",
                    "other_custom_items",
                    "otherCustomItems",
                    "shop_custom_items",
                    "shop_other_custom_items"
                ])
            );

            if (!pieces.length) {
                const inferred = [
                    ["box_style", "Rigid box"],
                    ["boxStyle", "Rigid box"],
                    ["tag_style", "Hang tag"],
                    ["tagStyle", "Hang tag"],
                    ["thank_you_card", "Thank-you card"],
                    ["thankYouCard", "Thank-you card"],
                    ["sticker_style", "Sticker seal"],
                    ["stickerStyle", "Sticker seal"],
                    ["tissue_style", "Branded tissue"],
                    ["tissueStyle", "Branded tissue"],
                    ["envelope_style", "Envelope"],
                    ["envelopeStyle", "Envelope"],
                    ["ribbon_style", "Branded ribbon"],
                    ["ribbonStyle", "Branded ribbon"]
                ];

                inferred.forEach(function ([key, label]) {
                    if (
                        clean(configuration[key]) &&
                        !pieces.includes(label)
                    ) {
                        pieces.push(label);
                    }
                });
            }

            const generalQuantity = firstValue(
                configuration,
                ["quantity", "requested_quantity", "requestedQuantity"]
            );

            const boxQuantity = firstValue(
                configuration,
                [
                    "box_quantity",
                    "boxQuantity",
                    "shop_box_quantity"
                ]
            ) || generalQuantity;

            const otherQuantity = firstValue(
                configuration,
                [
                    "other_pieces_quantity",
                    "otherPiecesQuantity",
                    "other_quantity",
                    "otherQuantity",
                    "shop_other_pieces_quantity"
                ]
            ) || generalQuantity;

            pieces.forEach(function (rawPiece) {
                const name = pieceName(rawPiece);

                if (name === "Rigid box") {
                    const boxStyle = firstValue(
                        configuration,
                        ["box_style", "boxStyle"]
                    ) || "Rigid box";

                    add(
                        prefix ? `${prefix} — ${boxStyle}` : boxStyle,
                        boxQuantity,
                        boxDetails(configuration),
                        "shop_configuration.box_quantity"
                    );

                    return;
                }

                /*
                 * "Other custom item" is only the selector used on the
                 * Bespoke shop page. When the customer supplied actual
                 * custom item names, quote those names instead of exposing
                 * the placeholder as a quotation line.
                 */
                if (
                    /^other custom item$/i.test(name) &&
                    customItems.length
                ) {
                    return;
                }

                add(
                    prefix ? `${prefix} — ${name}` : name,
                    otherQuantity,
                    pieceDetails(name, configuration),
                    "shop_configuration.other_pieces_quantity"
                );
            });

            customItems.forEach(function (customItem) {
                const itemName =
                    clean(customItem);

                if (!itemName) return;

                add(
                    prefix
                        ? `${prefix} — ${itemName}`
                        : itemName,
                    otherQuantity,
                    "Custom Bespoke item",
                    "shop_configuration.custom_items"
                );
            });

            const additionalProjects = parseJsonValue(
                firstValue(configuration, [
                    "additional_projects",
                    "additionalProjects",
                    "shop_additional_projects"
                ]),
                []
            );

            const additionalProjectList = Array.isArray(additionalProjects)
                ? additionalProjects
                : (
                    additionalProjects &&
                    typeof additionalProjects === "object"
                        ? [additionalProjects]
                        : []
                );

            additionalProjectList.forEach(function (project, index) {
                if (!project || typeof project !== "object") return;

                const projectConfiguration = configurationFromPayload(project);
                const projectName = clean(
                    firstValue(projectConfiguration, [
                        "brand_name",
                        "brandName",
                        "project_name",
                        "projectName",
                        "name",
                        "title"
                    ])
                ) || `Additional project ${index + 1}`;

                importBespoke(projectConfiguration, projectName);
            });
        }

        const source = normaliseSubmissionPayload(payload);
        const configuration = configurationFromPayload(source);

        if (isBespokeSelection(configuration)) {
            importBespoke(configuration);
        } else {
            importTier(configuration);
        }

        if (!items.length) {
            const quantityWords =
                /(?:quantity|qty|units?|copies|order[_\s-]*size|requested[_\s-]*quantity|number[_\s-]*required|how[_\s-]*many)/i;

            const ignoredWords =
                /(?:phone|mobile|whatsapp|postal|zip|year|date|budget|price|amount|cost|width|height|length|depth|gsm|email)/i;

            const nameWords =
                /(?:item|product|packaging|component|system|package[_\s-]*type|box[_\s-]*style|type|category|style|option|title|description)/i;

            const personNameWords =
                /^(?:name|full[_\s-]*name|contact[_\s-]*(?:name|person)|customer[_\s-]*name|brand[_\s-]*name)$/i;

            function pickName(object, fallback) {
                const priorityKeys = [
                    "item_description",
                    "itemDescription",
                    "description",
                    "item_name",
                    "itemName",
                    "product_name",
                    "productName",
                    "product",
                    "component",
                    "box_style",
                    "boxStyle",
                    "style",
                    "type",
                    "title"
                ];

                for (const key of priorityKeys) {
                    const value = object[key];

                    if (typeof value === "string" && value.trim()) {
                        return value;
                    }
                }

                const preferred = Object.entries(object).find(
                    function ([key, value]) {
                        return (
                            !personNameWords.test(key) &&
                            nameWords.test(key) &&
                            typeof value === "string" &&
                            value.trim()
                        );
                    }
                );

                return preferred ? preferred[1] : fallback;
            }

            function walk(value, path, parentKey) {
                if (typeof value === "string") {
                    const parsed = parseJsonValue(value, null);

                    if (parsed && typeof parsed === "object") {
                        walk(parsed, path, parentKey);
                    }

                    return;
                }

                if (Array.isArray(value)) {
                    value.forEach(function (entry, index) {
                        walk(entry, `${path}[${index}]`, parentKey);
                    });

                    return;
                }

                if (!value || typeof value !== "object") return;

                const entries = Object.entries(value);

                const quantityEntry = entries.find(
                    function ([key, fieldValue]) {
                        return (
                            quantityWords.test(key) &&
                            !ignoredWords.test(key) &&
                            number(fieldValue)
                        );
                    }
                );

                if (quantityEntry) {
                    const [quantityKey, quantityValue] = quantityEntry;

                    const fallback =
                        parentKey &&
                        !/^(items?|products?|requirements?|selection)$/i.test(
                            parentKey
                        )
                            ? parentKey
                            : path.split(".").pop();

                    add(
                        pickName(value, fallback),
                        quantityValue,
                        "Imported from legacy project brief",
                        `${path}.${quantityKey}`
                    );
                }

                entries.forEach(function ([key, child]) {
                    walk(
                        child,
                        path ? `${path}.${key}` : key,
                        key
                    );
                });
            }

            walk(source, "payload", "");
        }

        return items;
    }

    function populateQuotationForm(quotation) {
        document.getElementById("quotationBuilderTitle").textContent =
            `Edit ${quotation.quote_reference}`;

        document.getElementById("quotationReference").value =
            quotation.quote_reference || "";

        document.getElementById("quotationSubmissionReference").value =
            quotation.submission_reference || "";

        document.getElementById("quoteCustomerName").value =
            quotation.customer_name || "";

        document.getElementById("quoteBrandName").value =
            quotation.brand_name || "";

        document.getElementById("quoteCustomerEmail").value =
            quotation.customer_email || "";

        document.getElementById("quoteCustomerPhone").value =
            quotation.customer_phone || "";

        document.getElementById("quoteIssueDate").value =
            quotation.issue_date || "";

        document.getElementById("quoteExpiryDate").value =
            quotation.expiry_date || "";

        document.getElementById("quoteCurrency").value =
            quotation.currency || "NGN";

        document.getElementById("quoteProductionTimeline").value =
            quotation.production_timeline || "";

        document.getElementById("quotePaymentTerms").value =
            quotation.payment_terms || "";

        document.getElementById("quoteDiscount").value =
            quotation.discount || 0;

        document.getElementById("quoteDeliveryFee").value =
            quotation.delivery_fee || 0;

        document.getElementById("quoteTax").value =
            quotation.tax || 0;

        document.getElementById("quoteNotes").value =
            quotation.notes || "";

        elements.quotationItems.replaceChildren();

        (quotation.items || []).forEach(function (item) {
            addQuotationItem({
                description: item.description,
                details: item.details,
                quantity: item.quantity,
                unitPrice: item.unit_price
            });
        });

        if (!quotation.items?.length) {
            addQuotationItem();
        }

        updateQuotationTotals();
    }

    function addQuotationItem(item = {}) {
        const wrapper = document.createElement("div");
        wrapper.className = "crm-quote-item";
        wrapper.dataset.requestedQuantity = item.requestedQuantity ?? "";
        wrapper.dataset.inheritedFromProject = item.inheritedFromProject ? "true" : "false";
        wrapper.dataset.sourcePath = item.sourcePath || "";

        wrapper.innerHTML = `
            <label>
                Item description
                <input
                    type="text"
                    data-item-description
                    maxlength="240"
                    value="${escapeHtml(item.description || "")}"
                    placeholder="Magnetic flap rigid box"
                    required
                >
            </label>

            <label>
                Details
                <input
                    type="text"
                    data-item-details
                    maxlength="1000"
                    value="${escapeHtml(item.details || "")}"
                    placeholder="Matte laminated, custom printed"
                >
            </label>

            <label>
                Quantity
                <input
                    type="number"
                    data-item-quantity
                    min="0.01"
                    step="0.01"
                    value="${escapeHtml(item.quantity || 1)}"
                    required
                >
            </label>

            <label>
                Unit price
                <input
                    type="number"
                    data-item-price
                    min="0"
                    step="1"
                    value="${escapeHtml(item.unitPrice || 0)}"
                    required
                >
            </label>

            <div class="crm-quote-item__total" data-item-total>₦0</div>

            <button
                class="crm-quote-item__remove"
                type="button"
                data-remove-item
                aria-label="Remove quotation item"
            >×</button>
        `;

        elements.quotationItems.appendChild(wrapper);
        updateQuotationTotals();
    }

    function collectQuotationItems() {
        return Array.from(
            elements.quotationItems.querySelectorAll(".crm-quote-item")
        ).map(function (item) {
            return {
                description:
                    item.querySelector("[data-item-description]").value.trim(),
                details:
                    item.querySelector("[data-item-details]").value.trim(),
                quantity:
                    Number(item.querySelector("[data-item-quantity]").value),
                unitPrice:
                    Number(item.querySelector("[data-item-price]").value)
            };
        });
    }

    function updateQuotationTotals() {
        let subtotal = 0;

        elements.quotationItems
            .querySelectorAll(".crm-quote-item")
            .forEach(function (item) {
                const quantity = Number(
                    item.querySelector("[data-item-quantity]").value
                ) || 0;

                const price = Number(
                    item.querySelector("[data-item-price]").value
                ) || 0;

                const total = Math.round(quantity * price);
                subtotal += total;

                item.querySelector("[data-item-total]").textContent =
                    formatMoney(total);
            });

        const discount = Math.max(
            0,
            Number(document.getElementById("quoteDiscount").value) || 0
        );

        const delivery = Math.max(
            0,
            Number(document.getElementById("quoteDeliveryFee").value) || 0
        );

        const tax = Math.max(
            0,
            Number(document.getElementById("quoteTax").value) || 0
        );

        const grandTotal = Math.max(
            0,
            subtotal - Math.min(discount, subtotal) + delivery + tax
        );

        document.getElementById("quoteSubtotal").textContent =
            formatMoney(subtotal);

        document.getElementById("quoteDiscountDisplay").textContent =
            `− ${formatMoney(discount)}`;

        document.getElementById("quoteDeliveryDisplay").textContent =
            formatMoney(delivery);

        document.getElementById("quoteTaxDisplay").textContent =
            formatMoney(tax);

        document.getElementById("quoteGrandTotal").textContent =
            formatMoney(grandTotal);
    }

    async function saveQuotation(event) {
        event.preventDefault();

        const quoteReference =
            document.getElementById("quotationReference").value.trim();

        const payload = {
            submissionReference:
                document.getElementById("quotationSubmissionReference").value.trim(),
            customerName:
                document.getElementById("quoteCustomerName").value.trim(),
            brandName:
                document.getElementById("quoteBrandName").value.trim(),
            customerEmail:
                document.getElementById("quoteCustomerEmail").value.trim(),
            customerPhone:
                document.getElementById("quoteCustomerPhone").value.trim(),
            currency:
                document.getElementById("quoteCurrency").value,
            issueDate:
                document.getElementById("quoteIssueDate").value,
            expiryDate:
                document.getElementById("quoteExpiryDate").value,
            productionTimeline:
                document.getElementById("quoteProductionTimeline").value.trim(),
            paymentTerms:
                document.getElementById("quotePaymentTerms").value.trim(),
            discount:
                Number(document.getElementById("quoteDiscount").value) || 0,
            deliveryFee:
                Number(document.getElementById("quoteDeliveryFee").value) || 0,
            tax:
                Number(document.getElementById("quoteTax").value) || 0,
            notes:
                document.getElementById("quoteNotes").value.trim(),
            items: collectQuotationItems()
        };

        const saveButton = document.getElementById("saveQuotationButton");
        saveButton.disabled = true;
        elements.quotationFormStatus.textContent = "Saving quotation...";

        try {
            const endpoint = quoteReference
                ? `/admin/quotations/${encodeURIComponent(quoteReference)}`
                : "/admin/quotations";

            const method = quoteReference ? "PATCH" : "POST";

            const data = await apiRequest(endpoint, {
                method,
                body: JSON.stringify(payload)
            });

            elements.quotationFormStatus.textContent =
                data.message || "Quotation saved.";

            closeQuotationBuilder();
            state.view = "quotations";
            state.status = "";
            state.offset = 0;

            document.querySelectorAll(".crm-nav__item").forEach(function (item) {
                item.classList.toggle(
                    "is-active",
                    item.dataset.view === "quotations"
                );
            });

            updateViewConfiguration();
            await Promise.all([loadStats(), loadQuotations()]);
        } catch (error) {
            elements.quotationFormStatus.textContent =
                error.message || "The quotation could not be saved.";
        } finally {
            saveButton.disabled = false;
        }
    }

    function closeQuotationBuilder() {
        elements.quotationBuilder.classList.remove("is-open");
        elements.quotationBuilder.setAttribute("aria-hidden", "true");
        elements.quotationBackdrop.hidden = true;
        document.body.classList.remove("crm-lock-scroll");
    }


    function updateQuotationActionState(quotation) {
        const status = quotation?.status || "";
        const isAccepted = status === "accepted";
        const isFinal = [
            "accepted",
            "declined",
            "expired",
            "cancelled"
        ].includes(status);

        elements.editQuotationButton.disabled = isFinal;
        elements.sendQuotationButton.disabled = isFinal;
        elements.quoteDetailStatus.disabled = isFinal;

        elements.editQuotationButton.title = isFinal
            ? "Final quotations are locked and cannot be edited."
            : "";

        elements.sendQuotationButton.title = isFinal
            ? "Final quotations are locked and cannot be resent."
            : "";

        if (status === "needs_revision") {
            elements.sendQuotationButton.textContent =
                "Send revised quotation";
        } else {
            elements.sendQuotationButton.textContent =
                quotation?.send_count > 0
                    ? "Resend quotation"
                    : "Send quotation";
        }

        elements.createInvoiceFromQuoteButton.hidden = !isAccepted;
        elements.createInvoiceFromQuoteButton.disabled =
            isAccepted && !quotation?.invoiceReference;

        elements.createInvoiceFromQuoteButton.textContent =
            quotation?.invoiceReference
                ? "View automatic invoice"
                : "Preparing invoice…";

        const lockNotice = document.getElementById(
            "quotationLockNotice"
        );

        if (lockNotice) {
            lockNotice.hidden = !isFinal;
            lockNotice.textContent = isAccepted
                ? quotation?.invoiceReference
                    ? `Accepted and locked. Invoice ${quotation.invoiceReference} was created automatically.`
                    : "Accepted and locked. The automatic invoice is being prepared."
                : "This quotation is final and locked against editing or resending.";
        }
    }

    async function openQuotationDetail(reference) {
        setStatus("Opening quotation...");

        try {
            const data = await apiRequest(
                `/admin/quotations/${encodeURIComponent(reference)}`
            );

            const quotation = data.quotation;
            state.selectedQuotation = quotation;

            document.getElementById("quoteDetailReference").textContent =
                quotation.quote_reference;

            document.getElementById("quoteDetailBrand").textContent =
                quotation.brand_name || "Not supplied";

            document.getElementById("quoteDetailCustomer").textContent =
                quotation.customer_name || "Not supplied";

            const email = document.getElementById("quoteDetailEmail");
            email.textContent = quotation.customer_email || "Not supplied";
            email.href = quotation.customer_email
                ? `mailto:${quotation.customer_email}`
                : "#";

            document.getElementById("quoteDetailTotal").textContent =
                formatMoney(quotation.grand_total);

            elements.quoteDetailStatus.value = quotation.status;

            renderQuotationDetailItems(quotation);
            renderQuotationDetailTerms(quotation);
            renderQuotationActivity(quotation.activity || []);
            updateQuotationActionState(quotation);

            elements.quotationBackdrop.hidden = false;
            elements.quotationDetailPanel.classList.add("is-open");
            elements.quotationDetailPanel.setAttribute("aria-hidden", "false");
            document.body.classList.add("crm-lock-scroll");
            setStatus("");
        } catch (error) {
            setStatus(
                error.message || "The quotation could not be opened.",
                true
            );
        }
    }

    function renderQuotationDetailItems(quotation) {
        const container = document.getElementById("quoteDetailItems");
        container.replaceChildren();

        (quotation.items || []).forEach(function (item) {
            const row = document.createElement("div");
            row.className = "crm-quote-detail-item";

            row.innerHTML = `
                <div>
                    <h4>${escapeHtml(item.description)}</h4>
                    <p>${escapeHtml(item.details || "No additional details")}</p>
                </div>

                <div class="crm-quote-detail-item__amount">
                    <strong>${escapeHtml(formatMoney(item.line_total))}</strong>
                    <small>
                        ${escapeHtml(String(item.quantity))}
                        ×
                        ${escapeHtml(formatMoney(item.unit_price))}
                    </small>
                </div>
            `;

            container.appendChild(row);
        });

        const summary = document.getElementById("quoteDetailSummary");

        summary.innerHTML = `
            <div><span>Subtotal</span><strong>${escapeHtml(formatMoney(quotation.subtotal))}</strong></div>
            <div><span>Discount</span><strong>− ${escapeHtml(formatMoney(quotation.discount))}</strong></div>
            <div><span>Delivery</span><strong>${escapeHtml(formatMoney(quotation.delivery_fee))}</strong></div>
            <div><span>Tax</span><strong>${escapeHtml(formatMoney(quotation.tax))}</strong></div>
            <div class="crm-quote-summary__total">
                <span>Grand total</span>
                <strong>${escapeHtml(formatMoney(quotation.grand_total))}</strong>
            </div>
        `;
    }

    function renderQuotationDetailTerms(quotation) {
        const list = document.getElementById("quoteDetailTerms");
        list.replaceChildren();

        const fields = [
            ["Issue date", formatDateOnly(quotation.issue_date)],
            ["Expiry date", formatDateOnly(quotation.expiry_date)],
            ["Production timeline", quotation.production_timeline || "Not supplied"],
            ["Payment terms", quotation.payment_terms || "Not supplied"],
            ["Notes", quotation.notes || "Not supplied"],
            ["Linked enquiry", quotation.submission_reference || "Not linked"],
            ["Last sent", quotation.sent_at ? formatDate(quotation.sent_at) : "Not sent"],
            ["Times sent", String(quotation.send_count || 0)],
            ["First viewed", quotation.viewed_at ? formatDate(quotation.viewed_at) : "Not viewed"],
            ["Last viewed", quotation.last_viewed_at ? formatDate(quotation.last_viewed_at) : "Not viewed"],
            ["View count", String(quotation.view_count || 0)],
            ["Responded", quotation.responded_at ? formatDate(quotation.responded_at) : "No response"],
            ["Response", quotation.response_type ? formatStatus(quotation.response_type) : "No response"],
            ["Customer comment", quotation.response_comment || "No comment"],
            ["Decline reason", quotation.response_reason || "Not applicable"]
        ];

        fields.forEach(function ([label, value]) {
            const term = document.createElement("dt");
            const detail = document.createElement("dd");

            term.textContent = label;
            detail.textContent = value;

            list.append(term, detail);
        });
    }


    function renderQuotationActivity(activity) {
        const container = document.getElementById("quoteActivityTimeline");
        container.replaceChildren();

        if (!activity.length) {
            const empty = document.createElement("p");
            empty.className = "crm-quote-timeline__empty";
            empty.textContent = "No activity has been recorded yet.";
            container.appendChild(empty);
            return;
        }

        activity.forEach(function (entry) {
            const item = document.createElement("article");
            item.className = "crm-quote-timeline__item";

            item.innerHTML = `
                <span class="crm-quote-timeline__dot"></span>
                <div>
                    <strong>${escapeHtml(entry.title || "Quotation activity")}</strong>
                    <time>${escapeHtml(formatDate(entry.created_at))}</time>
                    ${entry.details ? `<p>${escapeHtml(entry.details)}</p>` : ""}
                </div>
            `;

            container.appendChild(item);
        });
    }

    async function updateQuotationStatus() {
        const quotation = state.selectedQuotation;

        if (
            !quotation ||
            ["accepted", "declined", "expired", "cancelled"].includes(
                quotation.status
            )
        ) {
            updateQuotationActionState(quotation);
            return;
        }

        try {
            elements.quoteDetailStatus.disabled = true;

            await apiRequest(
                `/admin/quotations/${encodeURIComponent(quotation.quote_reference)}`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        status: elements.quoteDetailStatus.value
                    })
                }
            );

            quotation.status = elements.quoteDetailStatus.value;
            await Promise.all([loadStats(), loadQuotations()]);
        } catch (error) {
            window.alert(
                error.message || "The quotation status could not be updated."
            );
        } finally {
            elements.quoteDetailStatus.disabled = false;
        }
    }



    function openSendQuotationModal() {
        const quotation = state.selectedQuotation;

        if (!quotation) return;

        const email = String(quotation.customer_email || "").trim();

        if (!email) {
            window.alert("Add a customer email before sending this quotation.");
            return;
        }

        document.getElementById("sendQuoteReference").textContent =
            quotation.quote_reference || "—";

        document.getElementById("sendQuoteRecipient").textContent = email;
        document.getElementById("sendQuoteTotal").textContent =
            formatMoney(quotation.grand_total);

        document.getElementById("sendQuotationMessage").value = "";
        elements.sendQuotationStatus.textContent = "";
        elements.sendQuotationBackdrop.hidden = false;
        elements.sendQuotationModal.classList.add("is-open");
        elements.sendQuotationModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("crm-lock-scroll");
    }

    async function sendQuotation() {
        const quotation = state.selectedQuotation;

        if (!quotation) return;

        const button = elements.confirmSendQuotationButton;
        button.disabled = true;
        button.textContent = "Sending...";
        elements.sendQuotationStatus.textContent =
            "Sending quotation to the customer...";

        try {
            const data = await apiRequest(
                `/admin/quotations/${encodeURIComponent(
                    quotation.quote_reference
                )}/send`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        message:
                            document
                                .getElementById("sendQuotationMessage")
                                .value
                                .trim()
                    })
                }
            );

            quotation.status = "sent";
            quotation.sent_at = data.quotation?.sentAt || new Date().toISOString();
            quotation.send_count = Number(quotation.send_count || 0) + 1;

            elements.quoteDetailStatus.value = "sent";
            elements.sendQuotationStatus.textContent =
                data.message || "Quotation sent.";

            await Promise.all([loadStats(), loadQuotations()]);

            window.setTimeout(function () {
                closeSendQuotationModal();
                openQuotationDetail(quotation.quote_reference);
            }, 650);
        } catch (error) {
            elements.sendQuotationStatus.textContent =
                error.message || "The quotation could not be sent.";
        } finally {
            button.disabled = false;
            button.textContent = "Send now";
        }
    }

    function closeSendQuotationModal() {
        elements.sendQuotationModal.classList.remove("is-open");
        elements.sendQuotationModal.setAttribute("aria-hidden", "true");
        elements.sendQuotationBackdrop.hidden = true;

        if (
            !elements.detailPanel.classList.contains("is-open") &&
            !elements.quotationBuilder.classList.contains("is-open") &&
            !elements.quotationDetailPanel.classList.contains("is-open") &&
            !elements.quotationPreviewModal.classList.contains("is-open")
        ) {
            document.body.classList.remove("crm-lock-scroll");
        }
    }

    function openQuotationPreview(quotation, printImmediately = false) {
        populateQuotationDocument(quotation);

        document.getElementById("quotationPreviewHeading").textContent =
            quotation.quote_reference || "Quotation";

        elements.quotationPreviewBackdrop.hidden = false;
        elements.quotationPreviewModal.classList.add("is-open");
        elements.quotationPreviewModal.setAttribute("aria-hidden", "false");
        document.body.classList.add("crm-lock-scroll");

        if (printImmediately) {
            window.setTimeout(printQuotation, 250);
        }
    }

    function populateQuotationDocument(quotation) {
        document.getElementById("printQuoteReference").textContent =
            quotation.quote_reference || "—";

        document.getElementById("printQuoteBrand").textContent =
            quotation.brand_name ||
            quotation.customer_name ||
            "Valued customer";

        document.getElementById("printQuoteCustomer").textContent =
            quotation.customer_name || "";

        document.getElementById("printQuoteEmail").textContent =
            quotation.customer_email || "";

        document.getElementById("printQuotePhone").textContent =
            quotation.customer_phone || "";

        document.getElementById("printQuoteIssueDate").textContent =
            formatDateOnly(quotation.issue_date) || "—";

        document.getElementById("printQuoteExpiryDate").textContent =
            formatDateOnly(quotation.expiry_date) || "—";

        document.getElementById("printQuoteStatus").textContent =
            formatStatus(quotation.status || "draft");

        document.getElementById("printQuoteTimeline").textContent =
            quotation.production_timeline || "To be confirmed.";

        document.getElementById("printQuotePaymentTerms").textContent =
            quotation.payment_terms || "To be confirmed.";

        document.getElementById("printQuoteNotes").textContent =
            quotation.notes || "No additional notes.";

        const items = document.getElementById("printQuoteItems");
        items.replaceChildren();

        (quotation.items || []).forEach(function (item) {
            const row = document.createElement("tr");

            row.innerHTML = `
                <td>
                    <strong>${escapeHtml(item.description || "Packaging item")}</strong>
                    <small>${escapeHtml(item.details || "")}</small>
                </td>
                <td>${escapeHtml(formatQuantity(item.quantity))}</td>
                <td>${escapeHtml(formatMoney(item.unit_price))}</td>
                <td><strong>${escapeHtml(formatMoney(item.line_total))}</strong></td>
            `;

            items.appendChild(row);
        });

        const summary = document.getElementById("printQuoteSummary");
        summary.innerHTML = `
            <div>
                <span>Subtotal</span>
                <strong>${escapeHtml(formatMoney(quotation.subtotal))}</strong>
            </div>
            <div>
                <span>Discount</span>
                <strong>- ${escapeHtml(formatMoney(quotation.discount))}</strong>
            </div>
            <div>
                <span>Delivery</span>
                <strong>${escapeHtml(formatMoney(quotation.delivery_fee))}</strong>
            </div>
            <div>
                <span>Tax</span>
                <strong>${escapeHtml(formatMoney(quotation.tax))}</strong>
            </div>
            <div class="lux-quote-summary__grand">
                <span>Grand total</span>
                <strong>${escapeHtml(formatMoney(quotation.grand_total))}</strong>
            </div>
        `;
    }

    function printQuotation() {
        const quotation = state.selectedQuotation;

        if (!quotation) return;

        const previousTitle = document.title;
        document.title = `${quotation.quote_reference || "Luxsome-quotation"}`;

        window.print();

        window.setTimeout(function () {
            document.title = previousTitle;
        }, 500);
    }

    function closeQuotationPreview() {
        elements.quotationPreviewModal.classList.remove("is-open");
        elements.quotationPreviewModal.setAttribute("aria-hidden", "true");
        elements.quotationPreviewBackdrop.hidden = true;

        if (
            !elements.detailPanel.classList.contains("is-open") &&
            !elements.quotationBuilder.classList.contains("is-open") &&
            !elements.quotationDetailPanel.classList.contains("is-open")
        ) {
            document.body.classList.remove("crm-lock-scroll");
        }
    }

    function formatQuantity(value) {
        const number = Number(value);

        if (!Number.isFinite(number)) return "0";

        return Number.isInteger(number)
            ? String(number)
            : number.toLocaleString("en-NG", {
                maximumFractionDigits: 2
            });
    }

    function closeQuotationDetail() {
        elements.quotationDetailPanel.classList.remove("is-open");
        elements.quotationDetailPanel.setAttribute("aria-hidden", "true");
        elements.quotationBackdrop.hidden = true;
        document.body.classList.remove("crm-lock-scroll");
        state.selectedQuotation = null;
    }

    function closeAllQuotationPanels() {
        if (elements.quotationBuilder.classList.contains("is-open")) {
            closeQuotationBuilder();
        }

        if (elements.quotationDetailPanel.classList.contains("is-open")) {
            closeQuotationDetail();
        }
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

        if (
            !elements.detailPanel.classList.contains("is-open") &&
            !elements.quotationBuilder.classList.contains("is-open") &&
            !elements.quotationDetailPanel.classList.contains("is-open")
        ) {
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

    function parseDisplayList(value) {
        if (Array.isArray(value)) {
            return value
                .map(item => String(item || "").trim())
                .filter(Boolean);
        }

        const raw =
            String(value || "").trim();

        if (!raw || raw === "[]") {
            return [];
        }

        try {
            const parsed =
                JSON.parse(raw);

            if (Array.isArray(parsed)) {
                return parsed
                    .map(item =>
                        String(item || "").trim()
                    )
                    .filter(Boolean);
            }
        } catch (_) {
            // Fall back to comma-separated text.
        }

        return raw
            .split(",")
            .map(item => item.trim())
            .filter(Boolean);
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
        const parsed = new Date(value);

        if (Number.isNaN(parsed.getTime())) {
            return value || "";
        }

        return new Intl.DateTimeFormat("en-NG", {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(parsed);
    }

    function formatDateOnly(value) {
        if (!value) return "";

        const parsed = new Date(`${value}T00:00:00`);

        if (Number.isNaN(parsed.getTime())) {
            return value;
        }

        return new Intl.DateTimeFormat("en-NG", {
            dateStyle: "medium"
        }).format(parsed);
    }

    function formatMoney(value) {
        return new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 0
        }).format(Number(value) || 0);
    }

    function toDateInput(value) {
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, "0");
        const day = String(value.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function escapeHtml(value) {
        return String(value ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    updateViewConfiguration();
    loadDashboard();
});
