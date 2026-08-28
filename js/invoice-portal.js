document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = window.LUXSOME?.apiBase;

    if (!API_BASE) {
        throw new Error(
            "Luxsome environment configuration was not loaded."
        );
    }

    const $ = id => document.getElementById(id);
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token") || "";

    let invoice = null;
    let paymentInProgress = false;

    const esc = value => String(value ?? "").replace(
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

    const date = value => value
        ? new Intl.DateTimeFormat("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(new Date(`${value}T00:00:00`))
        : "—";

    async function api(path, options = {}) {
        const response = await fetch(`${API_BASE}${path}`, options);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            /*
             * During development the Worker includes a more specific
             * `error` field for Paystack failures. Prefer it so we can
             * diagnose the real backend problem instead of only showing
             * the generic public message.
             */
            throw new Error(
                data.error ||
                data.message ||
                `Request failed with status ${response.status}`
            );
        }

        return data;
    }

    function setPaymentStatus(message, type = "") {
        const status = $("paymentStatus");

        if (!status) {
            return;
        }

        status.textContent = message || "";
        status.classList.remove("error", "success");

        if (type) {
            status.classList.add(type);
        }
    }

    function renderPaymentCard() {
        const current = invoice;
        const card = $("paymentCard");
        const currency = current.currency || "NGN";
        const balanceDue = Number(current.balance_due || 0);
        const grandTotal = Number(current.grand_total || 0);
        const amountPaid = Number(current.amount_paid || 0);

        if (
            current.status === "paid" ||
            balanceDue <= 0
        ) {
            card.innerHTML = `
                <div class="paid-note">
                    <strong>Payment complete</strong>
                    <p>
                        This invoice has been paid successfully.
                        Thank you for your payment.
                    </p>
                </div>
            `;
            return;
        }

        const depositTarget =
            Math.round(grandTotal * 0.70 * 100) / 100;

        const depositRemaining = Math.max(
            0,
            Math.round((depositTarget - amountPaid) * 100) / 100
        );

        const canPayDeposit =
            depositRemaining > 0 &&
            depositRemaining < balanceDue;

        card.innerHTML = `
            <div class="paystack-card">
                <div>
                    <p class="eyebrow">SECURE PAYMENT</p>
                    <h2>
                        ${amountPaid > 0
                            ? "Pay your remaining balance"
                            : "Choose how you would like to pay"}
                    </h2>
                    <p>
                        ${amountPaid > 0
                            ? `You have already paid ${money(amountPaid, currency)}. Complete the outstanding balance securely through Paystack.`
                            : "You can pay the standard 70% project deposit now, or settle the invoice in full."}
                    </p>
                </div>

                <div class="paystack-summary">
                    <div>
                        <span>Balance due</span>
                        <strong id="paystackBalance">
                            ${money(balanceDue, currency)}
                        </strong>
                    </div>
                </div>

                <div class="payment-options">
                    ${canPayDeposit ? `
                        <button
                            class="paystack-button paystack-button--secondary"
                            type="button"
                            data-payment-option="deposit"
                        >
                            Pay 70% deposit · ${money(depositRemaining, currency)}
                        </button>
                    ` : ""}

                    <button
                        class="paystack-button"
                        type="button"
                        data-payment-option="full"
                    >
                        ${amountPaid > 0
                            ? `Pay remaining balance · ${money(balanceDue, currency)}`
                            : `Pay in full · ${money(balanceDue, currency)}`}
                    </button>
                </div>

                <p
                    id="paymentStatus"
                    class="payment-status"
                    role="status"
                ></p>

                <p class="payment-security-note">
                    You will be redirected to Paystack's secure checkout
                    to complete payment.
                </p>
            </div>
        `;

        card
            .querySelectorAll("[data-payment-option]")
            .forEach(button => {
                button.addEventListener("click", () => {
                    beginPaystackCheckout(
                        button.dataset.paymentOption,
                        button
                    );
                });
            });
    }

    function render() {
        const current = invoice;
        const currency = current.currency || "NGN";

        $("invoiceReference").textContent =
            current.invoice_reference;

        $("customerName").textContent =
            current.brand_name ||
            current.customer_name ||
            "Valued customer";

        $("invoiceStatus").textContent =
            String(current.status || "")
                .replaceAll("_", " ");

        $("balanceDue").textContent =
            money(current.balance_due, currency);

        $("grandTotal").textContent =
            money(current.grand_total, currency);

        $("issueDate").textContent =
            date(current.issue_date);

        $("dueDate").textContent =
            date(current.due_date);

        $("invoiceItems").innerHTML =
            (current.items || []).map(item => `
                <tr>
                    <td>
                        <strong>${esc(item.description)}</strong>
                        ${
                            item.details
                                ? `<span class="item-detail">${esc(item.details)}</span>`
                                : ""
                        }
                    </td>
                    <td>${esc(item.quantity)}</td>
                    <td>${money(item.unit_price, currency)}</td>
                    <td>${money(item.line_total, currency)}</td>
                </tr>
            `).join("");

        $("invoiceTotals").innerHTML = `
            <div>
                <span>Subtotal</span>
                <strong>${money(current.subtotal, currency)}</strong>
            </div>

            <div>
                <span>Discount</span>
                <strong>− ${money(current.discount, currency)}</strong>
            </div>

            <div>
                <span>Delivery</span>
                <strong>${money(current.delivery_fee, currency)}</strong>
            </div>

            <div>
                <span>Tax</span>
                <strong>${money(current.tax, currency)}</strong>
            </div>

            <div>
                <span>Amount paid</span>
                <strong>${money(current.amount_paid, currency)}</strong>
            </div>

            <div class="grand">
                <span>Balance due</span>
                <strong>${money(current.balance_due, currency)}</strong>
            </div>
        `;

        $("paymentInstructions").textContent =
            current.payment_instructions ||
            "Pay securely online using the Paystack payment option below.";

        $("paymentTerms").textContent =
            current.payment_terms ||
            "Payment is due according to the agreed project terms.";

        renderPaymentCard();

        $("loading").hidden = true;
        $("invoice").hidden = false;
    }

    async function beginPaystackCheckout(
        paymentOption = "full",
        button
    ) {
        if (paymentInProgress || !invoice || !button) {
            return;
        }

        const originalLabel = button.textContent;

        try {
            paymentInProgress = true;

            document
                .querySelectorAll("[data-payment-option]")
                .forEach(element => {
                    element.disabled = true;
                });

            button.textContent = "Preparing secure checkout…";
            setPaymentStatus("Preparing your secure Paystack checkout…");

            const data = await api(
                `/public/invoices/${token}/paystack-initialize`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        paymentOption
                    })
                }
            );

            const authorizationUrl =
                data?.payment?.authorizationUrl;

            if (!authorizationUrl) {
                throw new Error(
                    "Paystack did not return a secure checkout link."
                );
            }

            setPaymentStatus(
                `Redirecting you to Paystack for ${money(
                    data?.payment?.amount,
                    data?.payment?.currency || invoice.currency || "NGN"
                )}…`,
                "success"
            );

            window.location.assign(authorizationUrl);
        } catch (error) {
            paymentInProgress = false;

            document
                .querySelectorAll("[data-payment-option]")
                .forEach(element => {
                    element.disabled = false;
                });

            button.textContent = originalLabel;
            setPaymentStatus(error.message, "error");
        }
    }

    function getReturnedPaymentReference() {
        return (
            params.get("reference") ||
            params.get("trxref") ||
            ""
        ).trim();
    }

    function isPaymentReturn() {
        return params.get("payment") === "return";
    }

    function cleanPaymentReturnUrl() {
        const clean = new URL(window.location.href);

        clean.searchParams.delete("payment");
        clean.searchParams.delete("reference");
        clean.searchParams.delete("trxref");

        window.history.replaceState(
            {},
            document.title,
            `${clean.pathname}${clean.search}${clean.hash}`
        );
    }

    async function verifyReturnedPayment() {
        if (!isPaymentReturn()) {
            return false;
        }

        const reference = getReturnedPaymentReference();

        if (!reference) {
            cleanPaymentReturnUrl();
            return false;
        }

        $("loading").textContent =
            "Confirming your Paystack payment…";

        try {
            const data = await api(
                `/public/invoices/${token}/paystack-verify` +
                `?reference=${encodeURIComponent(reference)}`
            );

            const status =
                data?.payment?.status || "";

            cleanPaymentReturnUrl();

            if (status !== "success") {
                throw new Error(
                    "Your payment has not been confirmed yet."
                );
            }

            return true;
        } catch (error) {
            cleanPaymentReturnUrl();

            /*
             * The Paystack webhook can finish a successful payment before
             * the browser callback verification completes. If verification
             * encountered that race, fetch the invoice once more before
             * showing an error. A paid/zero-balance invoice is authoritative.
             */
            try {
                const latest = await api(
                    `/public/invoices/${token}`
                );

                const latestInvoice = latest?.invoice;
                const latestBalance = Number(
                    latestInvoice?.balance_due || 0
                );

                if (
                    latestInvoice &&
                    (
                        latestInvoice.status === "paid" ||
                        latestBalance <= 0
                    )
                ) {
                    invoice = latestInvoice;
                    render();
                    return true;
                }
            } catch {
                // Preserve the original verification error below.
            }

            $("loading").hidden = true;
            $("error").hidden = false;
            $("error").textContent =
                `${error.message} You can refresh this invoice or try again.`;

            return false;
        }
    }

    async function loadInvoice() {
        const data = await api(
            `/public/invoices/${token}`
        );

        invoice = data.invoice;
        render();
    }

    async function load() {
        if (!/^[a-f0-9]{64}$/.test(token)) {
            showError("This invoice link is invalid.");
            return;
        }

        try {
            const returnedFromPayment =
                await verifyReturnedPayment();

            if (
                isPaymentReturn() &&
                !returnedFromPayment &&
                !$("error").hidden
            ) {
                return;
            }

            await loadInvoice();
        } catch (error) {
            showError(error.message);
        }
    }

    function showError(message) {
        $("loading").hidden = true;
        $("error").hidden = false;
        $("error").textContent = message;
    }

    $("printInvoice").onclick = () =>
        window.print();

    load();
});