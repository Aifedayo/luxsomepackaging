(function () {
    "use strict";

    const API = "https://api.luxsomepackaging.com";

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
        const response = await fetch(`${API}${path}`, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || "Request failed.");
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
                <span>Tax</span>
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
                submitText: "Accept quotation",
                showReason: false,
                showComment: false,
                commentLabel: ""
            },

            needs_revision: {
                eyebrow: "REQUEST CHANGES",
                title: "What would you like us to change?",
                description:
                    "Tell us what you would like adjusted, and Luxsome Packaging will review your request.",
                submitText: "Send change request",
                showReason: false,
                showComment: true,
                commentLabel: "Requested changes"
            },

            declined: {
                eyebrow: "DECLINE QUOTATION",
                title: "Are you sure you want to decline?",
                description:
                    "You may share why this quotation was not the right fit. Your feedback is optional but helps us improve.",
                submitText: "Decline quotation",
                showReason: true,
                showComment: true,
                commentLabel: "Additional comment (optional)"
            }
        };

        const configuration = configurations[action];

        if (!configuration) {
            return;
        }

        $("responseEyebrow").textContent =
            configuration.eyebrow;

        $("responseTitle").textContent =
            configuration.title;

        $("responseDescription").textContent =
            configuration.description;

        $("commentLabel").textContent =
            configuration.commentLabel;

        $("reasonField").hidden =
            !configuration.showReason;

        $("commentField").hidden =
            !configuration.showComment;

        $("responseReason").value = "";
        $("responseComment").value = "";
        $("responseStatus").textContent = "";

        const submitButton = $("submitResponse");

        submitButton.textContent =
            configuration.submitText;

        submitButton.dataset.defaultText =
            configuration.submitText;

        $("responseBackdrop").hidden = false;

        $("responseModal").classList.add("is-open");

        $("responseModal").setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add("modal-open");

        if (configuration.showComment) {
            setTimeout(() => {
                $("responseComment").focus();
            }, 100);
        } else {
            setTimeout(() => {
                submitButton.focus();
            }, 100);
        }
    }

    function closeModal() {
        $("responseBackdrop").hidden = true;

        $("responseModal").classList.remove("is-open");

        $("responseModal").setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove("modal-open");

        action = "";
    }

    async function submit() {
        if (!action) {
            return;
        }

        const comment = $("responseComment").value.trim();
        const reason = $("responseReason").value;

        if (
            action === "needs_revision" &&
            !comment
        ) {
            $("responseStatus").textContent =
                "Please describe the changes you would like us to make.";

            $("responseComment").focus();
            return;
        }

        const button = $("submitResponse");
        const defaultText =
            button.dataset.defaultText || "Confirm";

        button.disabled = true;
        button.textContent = "Submitting...";

        $("responseStatus").textContent = "";

        const payload = {
            action
        };

        /*
         * Do not send an unnecessary reason or comment
         * when the quotation is accepted.
         */
        if (action === "needs_revision") {
            payload.comment = comment;
            payload.reason = "";
        }

        if (action === "declined") {
            payload.comment = comment;
            payload.reason = reason;
        }

        try {
            const data = await api(
                `/public/quotations/${encodeURIComponent(token)}`,
                {
                    method: "POST",
                    body: JSON.stringify(payload)
                }
            );

            const completedAction = action;

            closeModal();

            quote.status = completedAction;

            showCompleted(
                completedAction,
                data.message
            );
        } catch (error) {
            $("responseStatus").textContent =
                error.message;
        } finally {
            button.disabled = false;
            button.textContent = defaultText;
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