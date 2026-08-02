(function () {
    "use strict";

    const API_BASE = window.LUXSOME.apiBase;

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") || "";

    let quote = null;
    let action = "";

    const $ = (id) => document.getElementById(id);

    const money = (value) => {
        return new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: "NGN",
            maximumFractionDigits: 0
        }).format(Number(value) || 0);
    };

    const date = (value) => {
        if (!value) {
            return "—";
        }

        return new Intl.DateTimeFormat("en-NG", {
            day: "numeric",
            month: "long",
            year: "numeric",
            timeZone: "UTC"
        }).format(new Date(`${value}T00:00:00Z`));
    };

    const esc = (value) => {
        return String(value ?? "").replace(
            /[&<>"']/g,
            (character) => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            })[character]
        );
    };

    async function api(path, options = {}) {
        let response;

        try {
            response = await fetch(`${API}${path}`, {
                ...options,
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                    ...(options.headers || {})
                }
            });
        } catch (error) {
            throw new Error(
                "The quotation service could not be reached. Please check your connection and try again."
            );
        }

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const message =
                data.error ||
                data.message ||
                `Request failed with status ${response.status}.`;

            throw new Error(message);
        }

        return data;
    }

    function statusLabel(value) {
        const labels = {
            sent: "Sent",
            accepted: "Accepted",
            needs_revision: "Changes requested",
            declined: "Declined",
            expired: "Expired",
            cancelled: "Cancelled",
            draft: "Draft"
        };

        return labels[value] || value;
    }

    async function load() {
        if (!token) {
            showError("The quotation link is missing.");
            return;
        }

        try {
            const data = await api(
                `/public/quotations/${encodeURIComponent(token)}`
            );

            quote = data.quotation;
            render();
        } catch (error) {
            showError(error.message);
        }
    }

    function render() {
        $("portalLoading").hidden = true;
        $("portalQuotation").hidden = false;

        $("quoteReference").textContent = quote.quoteReference;

        $("quoteBrand").textContent =
            quote.brandName ||
            quote.customerName ||
            "Valued customer";

        $("quoteStatus").textContent = statusLabel(quote.status);
        $("issueDate").textContent = date(quote.issueDate);
        $("expiryDate").textContent = date(quote.expiryDate);
        $("heroTotal").textContent = money(quote.grandTotal);

        $("productionTimeline").textContent =
            quote.productionTimeline || "To be confirmed.";

        $("paymentTerms").textContent =
            quote.paymentTerms || "To be confirmed.";

        $("quoteNotes").textContent =
            quote.notes || "No additional notes.";

        $("quoteItems").innerHTML = (quote.items || [])
            .map((item) => {
                return `
                    <div class="quote-item">
                        <div>
                            <h3>${esc(item.description)}</h3>
                            <p>${esc(item.details || "")}</p>
                        </div>

                        <div class="quote-item__amount">
                            <strong>
                                ${esc(money(item.line_total))}
                            </strong>

                            <small>
                                ${esc(item.quantity)}
                                ×
                                ${esc(money(item.unit_price))}
                            </small>
                        </div>
                    </div>
                `;
            })
            .join("");

        $("quoteTotals").innerHTML = `
            <div>
                <span>Subtotal</span>
                <strong>${esc(money(quote.subtotal))}</strong>
            </div>

            <div>
                <span>Discount</span>
                <strong>− ${esc(money(quote.discount))}</strong>
            </div>

            <div>
                <span>Delivery</span>
                <strong>${esc(money(quote.deliveryFee))}</strong>
            </div>

            <div>
                <span>VAT</span>
                <strong>${esc(money(quote.tax))}</strong>
            </div>

            <div>
                <span>Grand total</span>
                <strong>${esc(money(quote.grandTotal))}</strong>
            </div>
        `;

        if (
            ["accepted", "needs_revision", "declined"].includes(
                quote.status
            )
        ) {
            showCompleted(
                quote.status,
                quote.responseComment
            );
        }

        if (
            ["expired", "cancelled"].includes(
                quote.status
            )
        ) {
            $("responseSection").hidden = true;

            showCompleted(
                quote.status,
                "Please contact Luxsome Packaging for assistance."
            );
        }
    }

    function showError(message) {
        $("portalLoading").hidden = true;
        $("portalError").hidden = false;
        $("portalErrorMessage").textContent = message;
    }

    function openModal(selectedAction) {
        action = selectedAction;
    
        const configurations = {
            accepted: {
                eyebrow: "ACCEPT QUOTATION",
                title: "Ready to proceed?",
                description:
                    "Once confirmed, Luxsome Packaging will be notified that you have accepted this quotation and will contact you with the next steps.",
                buttonText: "Accept quotation",
                reasonVisible: false,
                commentVisible: false,
                commentLabel: ""
            },
    
            needs_revision: {
                eyebrow: "REQUEST CHANGES",
                title: "What would you like us to change?",
                description:
                    "Describe the changes you would like Luxsome Packaging to make to this quotation.",
                buttonText: "Send change request",
                reasonVisible: false,
                commentVisible: true,
                commentLabel: "Requested changes"
            },
    
            declined: {
                eyebrow: "DECLINE QUOTATION",
                title: "Are you sure you want to decline?",
                description:
                    "You may tell us why this quotation was not the right fit. Your feedback is optional.",
                buttonText: "Decline quotation",
                reasonVisible: true,
                commentVisible: true,
                commentLabel: "Additional comment (optional)"
            }
        };
    
        const configuration = configurations[selectedAction];
    
        if (!configuration) {
            return;
        }
    
        const reasonField = $("reasonField");
        const commentField = $("commentField");
        const submitButton = $("submitResponse");
    
        $("responseEyebrow").textContent =
            configuration.eyebrow;
    
        $("responseTitle").textContent =
            configuration.title;
    
        $("responseDescription").textContent =
            configuration.description;
    
        $("commentLabel").textContent =
            configuration.commentLabel;
    
        reasonField.hidden =
            !configuration.reasonVisible;
    
        commentField.hidden =
            !configuration.commentVisible;
    
        /*
         * Also set display directly in case an existing
         * stylesheet overrides the hidden attribute.
         */
        reasonField.style.display =
            configuration.reasonVisible ? "grid" : "none";
    
        commentField.style.display =
            configuration.commentVisible ? "grid" : "none";
    
        $("responseReason").value = "";
        $("responseComment").value = "";
        $("responseStatus").textContent = "";
    
        submitButton.textContent =
            configuration.buttonText;
    
        submitButton.dataset.defaultText =
            configuration.buttonText;
    
        $("responseBackdrop").hidden = false;
        $("responseBackdrop").style.display = "block";
    
        $("responseModal").classList.add("is-open");
    
        $("responseModal").setAttribute(
            "aria-hidden",
            "false"
        );
    
        document.body.classList.add("modal-open");
    
        window.setTimeout(() => {
            if (configuration.commentVisible) {
                $("responseComment").focus();
            } else {
                submitButton.focus();
            }
        }, 100);
    }

    function closeModal() {
        const backdrop = $("responseBackdrop");
    
        backdrop.hidden = true;
        backdrop.style.display = "none";
    
        $("responseModal").classList.remove("is-open");
    
        $("responseModal").setAttribute(
            "aria-hidden",
            "true"
        );
    
        document.body.classList.remove("modal-open");
    
        action = "";
    }

    async function submit() {
        if (
            action === "needs_revision" &&
            !$("responseComment").value.trim()
        ) {
            $("responseStatus").textContent =
                "Please tell us what you would like changed.";
            return;
        }
    
        const button = $("submitResponse");
    
        button.disabled = true;
        button.textContent = "Submitting...";
    
        $("responseStatus").textContent = "";
    
        const payload = {
            action
        };
    
        if (action === "needs_revision") {
            payload.comment = $("responseComment").value.trim();
        }
    
        if (action === "declined") {
            payload.comment = $("responseComment").value.trim();
            payload.reason = $("responseReason").value;
        }
    
        try {
            const data = await api(
                "/public/quotations/" + encodeURIComponent(token),
                {
                    method: "POST",
                    body: JSON.stringify(payload)
                }
            );
    
            closeModal();
    
            quote.status = action;
    
            showCompleted(action, data.message);
    
        } catch (e) {
            $("responseStatus").textContent = e.message;
        } finally {
            button.disabled = false;
            button.textContent =
                button.dataset.defaultText ||
                "Confirm";
        }
    }

    function showCompleted(status, message) {
        $("responseSection").hidden = true;
        $("completedResponse").hidden = false;

        const configurations = {
            accepted: {
                icon: "✓",
                title: "Quotation accepted",
                message:
                    "Thank you — Luxsome Packaging has been notified and will contact you about the next steps."
            },

            needs_revision: {
                icon: "↻",
                title: "Changes requested",
                message:
                    "Your requested changes have been sent to Luxsome Packaging."
            },

            declined: {
                icon: "—",
                title: "Response received",
                message:
                    "Thank you for letting us know."
            },

            expired: {
                icon: "!",
                title: "Quotation expired",
                message:
                    "This quotation has passed its validity date."
            },

            cancelled: {
                icon: "!",
                title: "Quotation unavailable",
                message:
                    "This quotation is no longer active."
            }
        };

        const configuration =
            configurations[status];

        if (!configuration) {
            return;
        }

        $("completedIcon").textContent =
            configuration.icon;

        $("completedTitle").textContent =
            configuration.title;

        $("completedMessage").textContent =
            message || configuration.message;

        $("quoteStatus").textContent =
            statusLabel(status);
    }

    document
        .querySelectorAll("[data-response]")
        .forEach((button) => {
            button.addEventListener("click", () => {
                openModal(button.dataset.response);
            });
        });

    $("closeResponseModal").addEventListener(
        "click",
        closeModal
    );

    $("responseBackdrop").addEventListener(
        "click",
        closeModal
    );

    $("submitResponse").addEventListener(
        "click",
        submit
    );

    document.addEventListener("keydown", (event) => {
        if (
            event.key === "Escape" &&
            $("responseModal").classList.contains("is-open")
        ) {
            closeModal();
        }
    });

    load();
})();