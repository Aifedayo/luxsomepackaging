(() => {
    "use strict";

    const API_BASE = window.LUXSOME.apiBase;
    const token = sessionStorage.getItem("luxsomeAdminToken");

    if (!token) {
        window.location.replace("/admin/login/");
        return;
    }

    const state = {
        invoices: [],
        selected: null,
        editingReference: null
    };

    const element = (id) => document.getElementById(id);

    function escapeHtml(value) {
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
    }

    function formatMoney(value, currency = "NGN") {
        return new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency,
            maximumFractionDigits: 0
        }).format(Number(value) || 0);
    }

    function formatDate(value) {
        if (!value) {
            return "—";
        }

        return new Intl.DateTimeFormat("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric"
        }).format(new Date(`${value}T00:00:00`));
    }

    function formatDateTime(value) {
        if (!value) {
            return "—";
        }

        return new Intl.DateTimeFormat("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(new Date(value));
    }

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
                data.message ||
                "The request could not be completed."
            );
        }

        return data;
    }

    function openPanel(id) {
        element("backdrop").hidden = false;
        element(id).classList.add("open");
        element(id).setAttribute("aria-hidden", "false");
    }

    function closePanels() {
        document
            .querySelectorAll(".panel.open")
            .forEach((panel) => {
                panel.classList.remove("open");
                panel.setAttribute("aria-hidden", "true");
            });

        element("backdrop").hidden = true;
    }

    async function loadInvoices() {
        try {
            element("status").textContent = "Loading invoices…";

            const parameters = new URLSearchParams();
            const search = element("search").value.trim();
            const status = element("filter").value;

            if (search) {
                parameters.set("search", search);
            }

            if (status) {
                parameters.set("status", status);
            }

            const data = await api(
                `/admin/invoices?${parameters.toString()}`
            );

            state.invoices = data.invoices || [];
            renderInvoiceList();
            element("status").textContent = "";

            const requestedReference =
                new URLSearchParams(window.location.search)
                    .get("invoice");

            if (requestedReference) {
                history.replaceState(
                    {},
                    "",
                    "/admin/invoices/"
                );

                await viewInvoice(requestedReference);
            }
        } catch (error) {
            element("status").textContent = error.message;
        }
    }

    function renderInvoiceList() {
        const rows = element("rows");
        let outstanding = 0;
        let paid = 0;
        let overdue = 0;

        rows.innerHTML = "";

        state.invoices.forEach((invoice) => {
            outstanding += Number(invoice.balance_due || 0);
            paid += Number(invoice.amount_paid || 0);

            if (invoice.status === "overdue") {
                overdue += 1;
            }

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>
                    <strong>
                        ${escapeHtml(invoice.invoice_reference)}
                    </strong>
                    ${
                        invoice.quote_reference
                            ? `
                                <small>
                                    <br>
                                    ${escapeHtml(invoice.quote_reference)}
                                </small>
                            `
                            : ""
                    }
                </td>
                <td>
                    ${escapeHtml(
                        invoice.brand_name ||
                        invoice.customer_name ||
                        "—"
                    )}
                </td>
                <td>
                    <span class="badge">
                        ${escapeHtml(
                            String(invoice.status || "")
                                .replaceAll("_", " ")
                        )}
                    </span>
                </td>
                <td>${formatMoney(invoice.grand_total)}</td>
                <td>${formatMoney(invoice.amount_paid)}</td>
                <td>${formatMoney(invoice.balance_due)}</td>
                <td>${escapeHtml(invoice.due_date || "—")}</td>
                <td>
                    <button
                        type="button"
                        data-reference="${escapeHtml(
                            invoice.invoice_reference
                        )}"
                    >
                        View
                    </button>
                </td>
            `;

            rows.appendChild(row);
        });

        element("empty").hidden = state.invoices.length > 0;
        element("statTotal").textContent = state.invoices.length;
        element("statOutstanding").textContent =
            formatMoney(outstanding);
        element("statPaid").textContent = formatMoney(paid);
        element("statOverdue").textContent = overdue;
    }

    async function viewInvoice(reference) {
        try {
            const data = await api(
                `/admin/invoices/${encodeURIComponent(reference)}`
            );

            state.selected = data.invoice;
            renderInvoiceDetail();
            openPanel("detail");
        } catch (error) {
            window.alert(error.message);
        }
    }

    function renderInvoiceDetail() {
        const invoice = state.selected;
        const payments = invoice.payments || [];

        element("detailRef").textContent =
            invoice.invoice_reference;

        element("detailBody").innerHTML = `
            <div class="detail-grid">
                <div>
                    <span>Customer</span>
                    <strong>
                        ${escapeHtml(
                            invoice.brand_name ||
                            invoice.customer_name ||
                            "—"
                        )}
                    </strong>
                </div>

                <div>
                    <span>Status</span>
                    <strong>
                        ${escapeHtml(
                            String(invoice.status || "")
                                .replaceAll("_", " ")
                        )}
                    </strong>
                </div>

                <div>
                    <span>Total</span>
                    <strong>
                        ${formatMoney(invoice.grand_total)}
                    </strong>
                </div>

                <div>
                    <span>Balance due</span>
                    <strong>
                        ${formatMoney(invoice.balance_due)}
                    </strong>
                </div>

                <div>
                    <span>Issue date</span>
                    <strong>
                        ${formatDate(invoice.issue_date)}
                    </strong>
                </div>

                <div>
                    <span>Due date</span>
                    <strong>
                        ${formatDate(invoice.due_date)}
                    </strong>
                </div>

                <div>
                    <span>Last sent</span>
                    <strong>
                        ${formatDateTime(invoice.sent_at)}
                    </strong>
                </div>

                <div>
                    <span>Views</span>
                    <strong>
                        ${escapeHtml(invoice.view_count || 0)}
                    </strong>
                </div>
            </div>

            <div class="detail-items">
                ${(invoice.items || []).map((item) => `
                    <article>
                        <div>
                            <strong>
                                ${escapeHtml(item.description)}
                            </strong>
                            ${
                                item.details
                                    ? `
                                        <small>
                                            <br>
                                            ${escapeHtml(item.details)}
                                        </small>
                                    `
                                    : ""
                            }
                        </div>

                        <span>
                            ${escapeHtml(item.quantity)}
                            ×
                            ${formatMoney(item.unit_price)}
                            =
                            <strong>
                                ${formatMoney(item.line_total)}
                            </strong>
                        </span>
                    </article>
                `).join("")}
            </div>

            <section class="payment-history">
                <div class="section-title">
                    <h3>Payments & receipts</h3>
                    <span>${payments.length} recorded</span>
                </div>

                ${
                    payments.length
                        ? payments.map(renderPaymentRow).join("")
                        : `
                            <p class="empty-inline">
                                No payments have been recorded.
                            </p>
                        `
                }
            </section>

            <div class="notes">
                <strong>Payment instructions</strong>
                <p>
                    ${escapeHtml(
                        invoice.payment_instructions || "—"
                    )}
                </p>

                <strong>Customer note</strong>
                <p>
                    ${escapeHtml(invoice.customer_note || "—")}
                </p>
            </div>
        `;
    }

    function renderPaymentRow(payment) {
        return `
            <article class="payment-row">
                <div>
                    <strong>
                        ${formatMoney(payment.amount)}
                    </strong>
                    <span>
                        ${escapeHtml(payment.receipt_reference)}
                        ·
                        ${formatDate(payment.payment_date)}
                    </span>
                    <small>
                        ${escapeHtml(payment.payment_method)}
                        ${
                            payment.payment_reference
                                ? ` · ${escapeHtml(
                                    payment.payment_reference
                                )}`
                                : ""
                        }
                    </small>
                </div>

                <div class="payment-actions">
                    <button
                        type="button"
                        data-receipt="${payment.id}"
                    >
                        ${
                            payment.receipt_sent_at
                                ? "Resend receipt"
                                : "Send receipt"
                        }
                    </button>

                    <a
                        href="/receipt/?token=${encodeURIComponent(
                            payment.receipt_token
                        )}"
                        target="_blank"
                        rel="noopener"
                    >
                        View
                    </a>

                    <button
                        type="button"
                        class="danger-link"
                        data-delete-payment="${payment.id}"
                    >
                        Remove
                    </button>
                </div>
            </article>
        `;
    }

    function addItem(item = {}) {
        const row = document.createElement("div");

        row.className = "item";
        row.innerHTML = `
            <input
                data-key="description"
                placeholder="Description"
                value="${escapeHtml(item.description || "")}"
            >

            <input
                data-key="quantity"
                type="number"
                min="0"
                step="any"
                value="${escapeHtml(item.quantity ?? 1)}"
            >

            <input
                data-key="unitPrice"
                type="number"
                min="0"
                step="any"
                value="${escapeHtml(
                    item.unit_price ??
                    item.unitPrice ??
                    0
                )}"
            >

            <button
                type="button"
                data-remove-item
            >
                ×
            </button>

            <input
                data-key="details"
                placeholder="Details"
                value="${escapeHtml(item.details || "")}"
                style="grid-column: 1 / -1"
            >
        `;

        element("items").appendChild(row);
        calculateBuilderTotals();
    }

    function getBuilderItems() {
        return [...element("items").children].map((row) => ({
            description:
                row.querySelector('[data-key="description"]')
                    .value.trim(),
            details:
                row.querySelector('[data-key="details"]')
                    .value.trim(),
            quantity:
                Number(
                    row.querySelector('[data-key="quantity"]')
                        .value
                ) || 0,
            unitPrice:
                Number(
                    row.querySelector('[data-key="unitPrice"]')
                        .value
                ) || 0
        }));
    }

    function calculateBuilderTotals() {
        const subtotal = getBuilderItems().reduce(
            (total, item) =>
                total + item.quantity * item.unitPrice,
            0
        );

        const discount =
            Number(element("discount").value) || 0;
        const deliveryFee =
            Number(element("deliveryFee").value) || 0;
        const tax =
            Number(element("tax").value) || 0;

        const grandTotal = Math.max(
            0,
            subtotal - discount + deliveryFee + tax
        );

        element("totals").innerHTML = `
            <div>
                <span>Subtotal</span>
                <strong>${formatMoney(subtotal)}</strong>
            </div>

            <div>
                <span>Grand total</span>
                <strong>${formatMoney(grandTotal)}</strong>
            </div>
        `;
    }

    function fillInvoiceBuilder(invoice = null) {
        state.editingReference =
            invoice?.invoice_reference || null;

        element("builderTitle").textContent = invoice
            ? `Edit ${invoice.invoice_reference}`
            : "New invoice";

        const fieldMap = {
            customerName: "customer_name",
            brandName: "brand_name",
            customerEmail: "customer_email",
            customerPhone: "customer_phone",
            issueDate: "issue_date",
            dueDate: "due_date",
            deliveryFee: "delivery_fee",
            paymentTerms: "payment_terms",
            paymentInstructions: "payment_instructions",
            customerNote: "customer_note",
            internalNote: "internal_note"
        };

        Object.entries(fieldMap).forEach(
            ([fieldId, property]) => {
                element(fieldId).value =
                    invoice?.[property] ?? "";
            }
        );

        element("discount").value =
            invoice?.discount ?? 0;
        element("tax").value =
            invoice?.tax ?? 0;

        if (!invoice) {
            const now = new Date();

            element("issueDate").value =
                now.toISOString().slice(0, 10);

            element("dueDate").value =
                new Date(
                    now.getTime() + 7 * 86400000
                ).toISOString().slice(0, 10);
        }

        element("items").innerHTML = "";

        (invoice?.items || [{}]).forEach(addItem);

        calculateBuilderTotals();
        openPanel("builder");
    }

    async function saveInvoice(event) {
        event.preventDefault();

        const payload = {
            customerName: element("customerName").value,
            brandName: element("brandName").value,
            customerEmail: element("customerEmail").value,
            customerPhone: element("customerPhone").value,
            issueDate: element("issueDate").value,
            dueDate: element("dueDate").value,
            discount:
                Number(element("discount").value) || 0,
            deliveryFee:
                Number(element("deliveryFee").value) || 0,
            tax:
                Number(element("tax").value) || 0,
            paymentTerms:
                element("paymentTerms").value,
            paymentInstructions:
                element("paymentInstructions").value,
            customerNote:
                element("customerNote").value,
            internalNote:
                element("internalNote").value,
            items: getBuilderItems()
        };

        try {
            element("formStatus").textContent = "Saving…";

            const path = state.editingReference
                ? `/admin/invoices/${encodeURIComponent(
                    state.editingReference
                )}`
                : "/admin/invoices";

            await api(path, {
                method:
                    state.editingReference
                        ? "PATCH"
                        : "POST",
                body: JSON.stringify(payload)
            });

            closePanels();
            await loadInvoices();
        } catch (error) {
            element("formStatus").textContent =
                error.message;
        }
    }

    function openPaymentPanel() {
        const invoice = state.selected;

        if (!invoice) {
            return;
        }

        if (Number(invoice.balance_due || 0) <= 0) {
            window.alert("This invoice has no outstanding balance.");
            return;
        }

        element("paymentBalance").textContent =
            formatMoney(invoice.balance_due);
        element("paymentAmount").value =
            Number(invoice.balance_due || 0);
        element("paymentAmount").max =
            Number(invoice.balance_due || 0);
        element("paymentDate").value =
            new Date().toISOString().slice(0, 10);
        element("paymentMethod").value = "";
        element("paymentReference").value = "";
        element("paymentNotes").value = "";
        element("paymentFormStatus").textContent = "";

        openPanel("paymentPanel");
    }

    async function recordPayment(event) {
        event.preventDefault();

        const invoice = state.selected;

        if (!invoice) {
            return;
        }

        const button = element("savePayment");

        try {
            button.disabled = true;
            button.textContent = "Recording…";
            element("paymentFormStatus").textContent = "";

            await api(
                `/admin/invoices/${encodeURIComponent(
                    invoice.invoice_reference
                )}/payments`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        amount:
                            Number(
                                element("paymentAmount").value
                            ) || 0,
                        paymentDate:
                            element("paymentDate").value,
                        paymentMethod:
                            element("paymentMethod").value,
                        paymentReference:
                            element("paymentReference")
                                .value.trim(),
                        notes:
                            element("paymentNotes")
                                .value.trim()
                    })
                }
            );

            closePanels();
            await loadInvoices();
            await viewInvoice(invoice.invoice_reference);
        } catch (error) {
            element("paymentFormStatus").textContent =
                error.message;
        } finally {
            button.disabled = false;
            button.textContent = "Record payment";
        }
    }

    async function sendReceipt(paymentId) {
        const message = window.prompt(
            "Optional message to include in the receipt email:",
            ""
        );

        if (message === null) {
            return;
        }

        try {
            const data = await api(
                `/admin/payments/${paymentId}/send-receipt`,
                {
                    method: "POST",
                    body: JSON.stringify({ message })
                }
            );

            window.alert(data.message);

            await viewInvoice(
                state.selected.invoice_reference
            );
        } catch (error) {
            window.alert(error.message);
        }
    }

    async function deletePayment(paymentId) {
        const invoice = state.selected;

        if (!invoice) {
            return;
        }

        const confirmed = window.confirm(
            "Remove this payment? The invoice balance will be recalculated."
        );

        if (!confirmed) {
            return;
        }

        try {
            const data = await api(
                `/admin/invoices/${encodeURIComponent(
                    invoice.invoice_reference
                )}/payments/${paymentId}`,
                {
                    method: "DELETE"
                }
            );

            window.alert(data.message);
            await loadInvoices();
            await viewInvoice(invoice.invoice_reference);
        } catch (error) {
            window.alert(error.message);
        }
    }

    async function createOrder() {
        const invoice = state.selected;

        if (!invoice) {
            return;
        }

        if (Number(invoice.amount_paid || 0) <= 0) {
            window.alert(
                "Record at least one verified payment before creating an order."
            );
            return;
        }

        const confirmed = window.confirm(
            `Create a production order from ${invoice.invoice_reference}?`
        );

        if (!confirmed) {
            return;
        }

        try {
            const data = await api(
                `/admin/orders/from-invoice/${encodeURIComponent(
                    invoice.invoice_reference
                )}`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        priority: "normal"
                    })
                }
            );

            window.location.href =
                `/admin/orders/?order=${encodeURIComponent(
                    data.order.orderReference
                )}`;
        } catch (error) {
            if (error.message.includes("already exists")) {
                window.alert(
                    `${error.message} Open the Orders page to view it.`
                );
            } else {
                window.alert(error.message);
            }
        }
    }

    async function sendInvoice() {
        const invoice = state.selected;

        if (!invoice) {
            return;
        }

        const message = window.prompt(
            "Optional message to include in the invoice email:",
            ""
        );

        if (message === null) {
            return;
        }

        const button = element("sendInvoice");

        try {
            button.disabled = true;
            button.textContent = "Sending…";

            const data = await api(
                `/admin/invoices/${encodeURIComponent(
                    invoice.invoice_reference
                )}/send`,
                {
                    method: "POST",
                    body: JSON.stringify({ message })
                }
            );

            window.alert(data.message);
            closePanels();
            await loadInvoices();
        } catch (error) {
            window.alert(error.message);
        } finally {
            button.disabled = false;
            button.textContent = "Send invoice";
        }
    }

    async function showActivity() {
        const invoice = state.selected;

        if (!invoice) {
            return;
        }

        try {
            const data = await api(
                `/admin/invoices/${encodeURIComponent(
                    invoice.invoice_reference
                )}/activity`
            );

            element("activityBody").innerHTML =
                (data.activity || []).length
                    ? data.activity
                        .map((activity) => `
                            <article class="activity-row">
                                <strong>
                                    ${escapeHtml(activity.title)}
                                </strong>

                                <span>
                                    ${formatDateTime(
                                        activity.created_at
                                    )}
                                </span>

                                ${
                                    activity.details
                                        ? `
                                            <p>
                                                ${escapeHtml(
                                                    activity.details
                                                )}
                                            </p>
                                        `
                                        : ""
                                }
                            </article>
                        `)
                        .join("")
                    : "<p>No activity yet.</p>";

            openPanel("activityPanel");
        } catch (error) {
            window.alert(error.message);
        }
    }

    function printInvoice() {
        const invoice = state.selected;

        if (!invoice) {
            window.alert("Open an invoice before printing.");
            return;
        }

        const printWindow = window.open(
            "",
            "_blank",
            "width=900,height=1100"
        );

        if (!printWindow) {
            window.alert(
                "The print window was blocked. Please allow pop-ups for the Luxsome CRM and try again."
            );
            return;
        }

        const currency = invoice.currency || "NGN";
        const customer =
            invoice.brand_name ||
            invoice.customer_name ||
            "Valued customer";
        const status = escapeHtml(
            String(invoice.status || "")
                .replaceAll("_", " ")
        );

        const items = (invoice.items || [])
            .map((item) => `
                <tr>
                    <td>
                        <strong>${escapeHtml(item.description)}</strong>
                        ${
                            item.details
                                ? `<span class="item-detail">${escapeHtml(item.details)}</span>`
                                : ""
                        }
                    </td>
                    <td>${escapeHtml(item.quantity)}</td>
                    <td>${formatMoney(item.unit_price, currency)}</td>
                    <td>${formatMoney(item.line_total, currency)}</td>
                </tr>
            `)
            .join("");

        printWindow.document.open();
        printWindow.document.write(`
            <!doctype html>
            <html lang="en">
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width,initial-scale=1">
                <title>${escapeHtml(invoice.invoice_reference)} | Luxsome Packaging</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
                <style>
                    @page {
                        size: A4;
                        margin: 14mm;
                    }

                    * {
                        box-sizing: border-box;
                    }

                    html,
                    body {
                        margin: 0;
                        padding: 0;
                        background: #ffffff;
                    }

                    body {
                        color: #2e1c15;
                        font-family: "Montserrat", Arial, sans-serif;
                        font-size: 12px;
                        line-height: 1.6;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }

                    .invoice {
                        width: 100%;
                        max-width: 100%;
                    }

                    .invoice-header {
                        display: flex;
                        align-items: flex-start;
                        justify-content: space-between;
                        gap: 32px;
                        padding-bottom: 24px;
                        margin-bottom: 24px;
                        border-bottom: 1px solid #dfd3ca;
                    }

                    .invoice-brand {
                        margin: 0 0 7px;
                        color: #673629;
                        font-size: 10px;
                        font-weight: 700;
                        letter-spacing: .16em;
                        text-transform: uppercase;
                    }

                    h1 {
                        margin: 0;
                        font-family: "DM Serif Display", Georgia, serif;
                        font-size: 34px;
                        font-weight: 400;
                        line-height: 1;
                    }

                    .invoice-meta {
                        min-width: 180px;
                        text-align: right;
                    }

                    .invoice-meta strong {
                        display: block;
                        margin-bottom: 6px;
                        font-size: 14px;
                    }

                    .invoice-meta p {
                        margin: 0;
                        color: #806b60;
                        font-size: 10px;
                    }

                    .customer-grid {
                        display: grid;
                        grid-template-columns: minmax(0, 1fr) 180px 120px;
                        gap: 18px;
                        margin-bottom: 30px;
                    }

                    .customer-grid > div {
                        padding: 15px;
                        border: 1px solid #e3d8d0;
                    }

                    .customer-grid small {
                        display: block;
                        margin-bottom: 6px;
                        color: #806b60;
                        font-size: 8px;
                        font-weight: 700;
                        letter-spacing: .12em;
                    }

                    .customer-grid h2,
                    .customer-grid h3 {
                        margin: 0;
                    }

                    .customer-grid p {
                        margin: 7px 0 0;
                        color: #806b60;
                        font-size: 10px;
                    }

                    .amount-due h2 {
                        color: #673629;
                        font-size: 20px;
                    }

                    .status {
                        text-transform: capitalize;
                    }

                    table {
                        width: 100%;
                        margin-bottom: 24px;
                        border-collapse: collapse;
                    }

                    thead {
                        background: #2e1c15;
                        color: #ffffff;
                    }

                    th {
                        padding: 10px 12px;
                        font-size: 8px;
                        font-weight: 700;
                        letter-spacing: .08em;
                        text-align: left;
                        text-transform: uppercase;
                    }

                    th:not(:first-child),
                    td:not(:first-child) {
                        text-align: right;
                    }

                    td {
                        padding: 12px;
                        vertical-align: top;
                        border-bottom: 1px solid #eadfd7;
                    }

                    td strong {
                        display: block;
                    }

                    .item-detail {
                        display: block;
                        margin-top: 4px;
                        color: #806b60;
                        font-size: 9px;
                    }

                    .totals {
                        width: 330px;
                        margin-left: auto;
                        margin-bottom: 30px;
                    }

                    .totals > div {
                        display: flex;
                        justify-content: space-between;
                        gap: 25px;
                        padding: 5px 0;
                    }

                    .totals .total {
                        margin-top: 5px;
                        padding-top: 10px;
                        border-top: 1px solid #cbbcb2;
                        font-weight: 700;
                    }

                    .totals .balance {
                        margin-top: 7px;
                        padding-top: 11px;
                        border-top: 2px solid #2e1c15;
                        color: #673629;
                        font-size: 15px;
                        font-weight: 700;
                    }

                    .notes {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 16px;
                        margin-top: 28px;
                    }

                    .note {
                        padding: 16px;
                        border: 1px solid #e3d8d0;
                    }

                    .note strong {
                        display: block;
                        margin-bottom: 7px;
                        font-size: 9px;
                        text-transform: uppercase;
                        letter-spacing: .08em;
                    }

                    .note p {
                        margin: 0;
                        white-space: pre-line;
                    }

                    .footer {
                        margin-top: 34px;
                        padding-top: 15px;
                        border-top: 1px solid #eadfd7;
                        color: #806b60;
                        font-size: 9px;
                        text-align: center;
                    }

                    tr,
                    .invoice-header,
                    .customer-grid,
                    .totals,
                    .notes,
                    .note {
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
                </style>
            </head>
            <body>
                <main class="invoice">
                    <header class="invoice-header">
                        <div>
                            <p class="invoice-brand">LUXSOME PACKAGING</p>
                            <h1>INVOICE</h1>
                        </div>
                        <div class="invoice-meta">
                            <strong>${escapeHtml(invoice.invoice_reference)}</strong>
                            <p>
                                Issue: ${formatDate(invoice.issue_date)}<br>
                                Due: ${formatDate(invoice.due_date)}
                            </p>
                        </div>
                    </header>

                    <section class="customer-grid">
                        <div>
                            <small>BILL TO</small>
                            <h3>${escapeHtml(customer)}</h3>
                            <p>
                                ${invoice.customer_name ? `${escapeHtml(invoice.customer_name)}<br>` : ""}
                                ${invoice.customer_email ? `${escapeHtml(invoice.customer_email)}<br>` : ""}
                                ${escapeHtml(invoice.customer_phone || "")}
                            </p>
                        </div>
                        <div class="amount-due">
                            <small>AMOUNT DUE</small>
                            <h2>${formatMoney(invoice.balance_due, currency)}</h2>
                        </div>
                        <div>
                            <small>STATUS</small>
                            <h3 class="status">${status}</h3>
                        </div>
                    </section>

                    <table>
                        <thead>
                            <tr>
                                <th>Description</th>
                                <th>Qty</th>
                                <th>Unit price</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>${items}</tbody>
                    </table>

                    <section class="totals">
                        <div><span>Subtotal</span><strong>${formatMoney(invoice.subtotal, currency)}</strong></div>
                        <div><span>Discount</span><strong>− ${formatMoney(invoice.discount, currency)}</strong></div>
                        <div><span>Delivery</span><strong>${formatMoney(invoice.delivery_fee, currency)}</strong></div>
                        <div><span>Tax</span><strong>${formatMoney(invoice.tax, currency)}</strong></div>
                        <div class="total"><span>Invoice total</span><strong>${formatMoney(invoice.grand_total, currency)}</strong></div>
                        <div><span>Amount paid</span><strong>${formatMoney(invoice.amount_paid, currency)}</strong></div>
                        <div class="balance"><span>Balance due</span><strong>${formatMoney(invoice.balance_due, currency)}</strong></div>
                    </section>

                    <section class="notes">
                        <article class="note">
                            <strong>Payment instructions</strong>
                            <p>${escapeHtml(invoice.payment_instructions || "Please contact Luxsome Packaging for payment details.")}</p>
                        </article>
                        <article class="note">
                            <strong>Payment terms</strong>
                            <p>${escapeHtml(invoice.payment_terms || "Payment is due according to the agreed project terms.")}</p>
                        </article>
                    </section>

                    <footer class="footer">
                        Luxsome Packaging · Lagos, Nigeria · hello@luxsomepackaging.com
                    </footer>
                </main>
            </body>
            </html>
        `);

        printWindow.document.close();

        const printWhenReady = async () => {
            try {
                if (printWindow.document.fonts?.ready) {
                    await printWindow.document.fonts.ready;
                }
            } catch (_) {
                // Printing can continue if custom fonts fail.
            }

            window.setTimeout(() => {
                printWindow.focus();
                printWindow.print();
            }, 250);
        };

        printWhenReady();
    }

    function showPreview() {
        const invoice = state.selected;

        element("invoicePaper").innerHTML = `
            <div class="inv-head">
                <div>
                    <p>LUXSOME PACKAGING</p>
                    <h1>INVOICE</h1>
                </div>

                <div>
                    <strong>
                        ${escapeHtml(invoice.invoice_reference)}
                    </strong>
                    <p>
                        Issue:
                        ${formatDate(invoice.issue_date)}
                        <br>
                        Due:
                        ${formatDate(invoice.due_date)}
                    </p>
                </div>
            </div>

            <div class="inv-customer">
                <div>
                    <small>BILL TO</small>
                    <h3>
                        ${escapeHtml(
                            invoice.brand_name ||
                            invoice.customer_name ||
                            "—"
                        )}
                    </h3>
                    <p>
                        ${escapeHtml(invoice.customer_name || "")}
                        <br>
                        ${escapeHtml(invoice.customer_email || "")}
                        <br>
                        ${escapeHtml(invoice.customer_phone || "")}
                    </p>
                </div>

                <div>
                    <small>AMOUNT DUE</small>
                    <h2>${formatMoney(invoice.balance_due)}</h2>
                </div>

                <div>
                    <small>STATUS</small>
                    <h3>
                        ${escapeHtml(
                            String(invoice.status || "")
                                .replaceAll("_", " ")
                        )}
                    </h3>
                </div>
            </div>

            <table class="inv-table">
                <thead>
                    <tr>
                        <th>Description</th>
                        <th>Qty</th>
                        <th>Unit price</th>
                        <th>Total</th>
                    </tr>
                </thead>

                <tbody>
                    ${(invoice.items || []).map((item) => `
                        <tr>
                            <td>
                                <strong>
                                    ${escapeHtml(item.description)}
                                </strong>
                                <br>
                                <small>
                                    ${escapeHtml(item.details || "")}
                                </small>
                            </td>
                            <td>${escapeHtml(item.quantity)}</td>
                            <td>${formatMoney(item.unit_price)}</td>
                            <td>${formatMoney(item.line_total)}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>

            <div class="inv-total">
                <div>
                    <span>Subtotal</span>
                    <strong>${formatMoney(invoice.subtotal)}</strong>
                </div>

                <div>
                    <span>Discount</span>
                    <strong>− ${formatMoney(invoice.discount)}</strong>
                </div>

                <div>
                    <span>Delivery</span>
                    <strong>${formatMoney(invoice.delivery_fee)}</strong>
                </div>

                <div>
                    <span>Tax</span>
                    <strong>${formatMoney(invoice.tax)}</strong>
                </div>

                <div>
                    <span>Total</span>
                    <strong>${formatMoney(invoice.grand_total)}</strong>
                </div>

                <div>
                    <span>Paid</span>
                    <strong>${formatMoney(invoice.amount_paid)}</strong>
                </div>

                <div>
                    <span>Balance due</span>
                    <strong>${formatMoney(invoice.balance_due)}</strong>
                </div>
            </div>
        `;

        element("previewModal").hidden = false;
    }

    document
        .querySelectorAll("[data-close]")
        .forEach((button) => {
            button.addEventListener("click", closePanels);
        });

    element("backdrop").addEventListener(
        "click",
        closePanels
    );

    element("logout").addEventListener("click", () => {
        sessionStorage.removeItem("luxsomeAdminToken");
        window.location.replace("/admin/login/");
    });

    element("rows").addEventListener("click", (event) => {
        const button = event.target.closest(
            "[data-reference]"
        );

        if (button) {
            viewInvoice(button.dataset.reference);
        }
    });

    element("detailBody").addEventListener(
        "click",
        (event) => {
            const receiptButton = event.target.closest(
                "[data-receipt]"
            );

            if (receiptButton) {
                sendReceipt(
                    Number(receiptButton.dataset.receipt)
                );
                return;
            }

            const deleteButton = event.target.closest(
                "[data-delete-payment]"
            );

            if (deleteButton) {
                deletePayment(
                    Number(deleteButton.dataset.deletePayment)
                );
            }
        }
    );

    element("items").addEventListener(
        "input",
        calculateBuilderTotals
    );

    element("items").addEventListener("click", (event) => {
        const removeButton = event.target.closest(
            "[data-remove-item]"
        );

        if (!removeButton) {
            return;
        }

        removeButton.closest(".item").remove();

        if (!element("items").children.length) {
            addItem();
        }

        calculateBuilderTotals();
    });

    [
        "discount",
        "deliveryFee",
        "tax"
    ].forEach((fieldId) => {
        element(fieldId).addEventListener(
            "input",
            calculateBuilderTotals
        );
    });

    element("addItem").addEventListener(
        "click",
        () => addItem()
    );

    element("newInvoice").addEventListener(
        "click",
        () => fillInvoiceBuilder()
    );

    element("edit").addEventListener("click", () => {
        closePanels();
        fillInvoiceBuilder(state.selected);
    });

    element("form").addEventListener(
        "submit",
        saveInvoice
    );

    element("recordPayment").addEventListener(
        "click",
        openPaymentPanel
    );

    element("paymentForm").addEventListener(
        "submit",
        recordPayment
    );

    element("createOrder").addEventListener(
        "click",
        createOrder
    );

    element("sendInvoice").addEventListener(
        "click",
        sendInvoice
    );

    element("activity").addEventListener(
        "click",
        showActivity
    );

    element("preview").addEventListener(
        "click",
        showPreview
    );

    element("closePreview").addEventListener(
        "click",
        () => {
            element("previewModal").hidden = true;
        }
    );

    element("print").addEventListener(
        "click",
        printInvoice
    );

    let searchTimer;

    element("search").addEventListener("input", () => {
        window.clearTimeout(searchTimer);
        searchTimer = window.setTimeout(
            loadInvoices,
            300
        );
    });

    element("filter").addEventListener(
        "change",
        loadInvoices
    );

    loadInvoices();
})();
