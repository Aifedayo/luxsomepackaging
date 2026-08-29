(() => {
    "use strict";

    const API_BASE = window.LUXSOME?.apiBase;
    const token = sessionStorage.getItem("luxsomeAdminToken") || "";

    if (!API_BASE || !token) return;

    const detail = document.getElementById("detail");
    const detailBody = document.getElementById("detailBody");
    const detailRef = document.getElementById("detailRef");

    if (!detail || !detailBody || !detailRef) return;

    let lastReference = "";
    let loadSequence = 0;

    const escapeHtml = value => String(value ?? "").replace(
        /[&<>"']/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]
    );

    const money = (value, currency = "NGN") => {
        try {
            return new Intl.NumberFormat("en-NG", {
                style: "currency",
                currency: currency || "NGN",
                maximumFractionDigits: 0
            }).format(Number(value) || 0);
        } catch {
            return `₦${Number(value || 0).toLocaleString("en-NG")}`;
        }
    };

    const date = value => {
        if (!value) return "—";

        const raw = String(value);
        const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw)
            ? new Date(`${raw}T00:00:00`)
            : new Date(raw);

        if (Number.isNaN(parsed.getTime())) return raw;

        return new Intl.DateTimeFormat("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric"
        }).format(parsed);
    };

    const title = value => String(value || "—")
        .replaceAll("_", " ")
        .replace(/\b\w/g, character => character.toUpperCase());

    async function api(path, options = {}) {
        const response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.error ||
                data.message ||
                "The request could not be completed."
            );
        }

        return data;
    }

    function providerLabel(payment) {
        return String(payment.provider || "").toLowerCase() === "paystack"
            ? "Paystack"
            : payment.payment_method || "Manual";
    }

    function referenceLabel(payment) {
        return (
            payment.provider_reference ||
            payment.payment_reference ||
            "—"
        );
    }

    function receiptState(payment) {
        if (payment.receipt_sent_at) {
            return {
                label: "Receipt emailed",
                className: "is-sent"
            };
        }

        if (payment.receipt_reference) {
            return {
                label: "Receipt created",
                className: "is-created"
            };
        }

        return {
            label: "No receipt",
            className: "is-pending"
        };
    }

    function renderPaymentHistory(invoice) {
        const old = document.getElementById("paystackPaymentHistory");
        old?.remove();

        const section = document.createElement("section");
        section.id = "paystackPaymentHistory";
        section.className = "lux-payment-history";

        const payments = Array.isArray(invoice.payments)
            ? invoice.payments
            : [];

        section.innerHTML = `
            <div class="lux-payment-history__heading">
                <div>
                    <span>PAYMENTS</span>
                    <h3>Payment history</h3>
                </div>

                <strong>
                    ${escapeHtml(money(invoice.amount_paid, invoice.currency))}
                    paid
                </strong>
            </div>

            <div class="lux-payment-history__summary">
                <div>
                    <span>Invoice total</span>
                    <strong>${escapeHtml(money(invoice.grand_total, invoice.currency))}</strong>
                </div>

                <div>
                    <span>Amount paid</span>
                    <strong>${escapeHtml(money(invoice.amount_paid, invoice.currency))}</strong>
                </div>

                <div>
                    <span>Balance</span>
                    <strong>${escapeHtml(money(invoice.balance_due, invoice.currency))}</strong>
                </div>
            </div>

            ${
                payments.length
                    ? `<div class="lux-payment-history__list">
                        ${payments.map(payment => {
                            const receipt = receiptState(payment);
                            const isPaystack =
                                String(payment.provider || "").toLowerCase() === "paystack";

                            return `
                                <article class="lux-payment-entry">
                                    <div class="lux-payment-entry__amount">
                                        <strong>${escapeHtml(money(payment.amount, invoice.currency))}</strong>
                                        <span>${escapeHtml(date(payment.payment_date || payment.created_at))}</span>
                                    </div>

                                    <dl>
                                        <div>
                                            <dt>Provider</dt>
                                            <dd>
                                                ${escapeHtml(providerLabel(payment))}
                                                ${isPaystack ? '<span class="lux-provider-badge">ONLINE</span>' : ""}
                                            </dd>
                                        </div>

                                        <div>
                                            <dt>Channel</dt>
                                            <dd>${escapeHtml(title(payment.channel || payment.payment_method))}</dd>
                                        </div>

                                        <div>
                                            <dt>Reference</dt>
                                            <dd class="lux-payment-reference">${escapeHtml(referenceLabel(payment))}</dd>
                                        </div>

                                        <div>
                                            <dt>Receipt</dt>
                                            <dd>
                                                <span class="lux-receipt-state ${receipt.className}">
                                                    ${escapeHtml(receipt.label)}
                                                </span>
                                            </dd>
                                        </div>
                                    </dl>

                                    ${
                                        payment.receipt_reference
                                            ? `<div class="lux-payment-entry__actions">
                                                <span>${escapeHtml(payment.receipt_reference)}</span>
                                                <button
                                                    type="button"
                                                    data-resend-receipt="${Number(payment.id)}"
                                                >
                                                    ${payment.receipt_sent_at ? "Resend receipt" : "Send receipt"}
                                                </button>
                                            </div>`
                                            : ""
                                    }
                                </article>
                            `;
                        }).join("")}
                    </div>`
                    : `<p class="lux-payment-history__empty">No payments have been recorded yet.</p>`
            }

            <p id="paystackPaymentHistoryStatus" class="lux-payment-history__status"></p>
        `;

        detailBody.appendChild(section);

        section
            .querySelectorAll("[data-resend-receipt]")
            .forEach(button => {
                button.addEventListener("click", async () => {
                    const paymentId = Number(
                        button.dataset.resendReceipt
                    );

                    if (!paymentId) return;

                    const status = document.getElementById(
                        "paystackPaymentHistoryStatus"
                    );

                    const original = button.textContent;

                    try {
                        button.disabled = true;
                        button.textContent = "Sending…";
                        status.textContent = "";

                        const result = await api(
                            `/admin/payments/${paymentId}/send-receipt`,
                            {
                                method: "POST",
                                body: JSON.stringify({})
                            }
                        );

                        status.textContent =
                            result.message || "Receipt sent.";

                        await loadForReference(invoice.invoice_reference, true);
                    } catch (error) {
                        status.textContent = error.message;
                        button.disabled = false;
                        button.textContent = original;
                    }
                });
            });
    }

    async function loadForReference(reference, force = false) {
        const clean = String(reference || "").trim();

        if (!/^[A-Z0-9-]+$/.test(clean)) return;

        if (!force && clean === lastReference) return;

        const sequence = ++loadSequence;
        lastReference = clean;

        try {
            const data = await api(
                `/admin/invoices/${encodeURIComponent(clean)}`
            );

            if (sequence !== loadSequence) return;

            if (
                String(detailRef.textContent || "").trim() !== clean ||
                !detail.classList.contains("open")
            ) {
                return;
            }

            renderPaymentHistory(data.invoice);
        } catch (error) {
            console.error(
                "[Luxsome CRM] payment history enhancement failed",
                error
            );
        }
    }

    function detectInvoice() {
        const reference = String(
            detailRef.textContent || ""
        ).trim();

        if (
            detail.classList.contains("open") &&
            /^[A-Z0-9-]+$/.test(reference)
        ) {
            loadForReference(reference);
        } else if (!detail.classList.contains("open")) {
            lastReference = "";
        }
    }

    const observer = new MutationObserver(() => {
        window.setTimeout(detectInvoice, 0);
    });

    observer.observe(detail, {
        attributes: true,
        attributeFilter: ["class", "aria-hidden"]
    });

    observer.observe(detailRef, {
        childList: true,
        characterData: true,
        subtree: true
    });

    document.addEventListener("click", event => {
        if (
            event.target.closest(
                "#recordPayment, #savePayment, [data-close]"
            )
        ) {
            window.setTimeout(() => {
                lastReference = "";
                detectInvoice();
            }, 500);
        }
    });

    detectInvoice();
})();
