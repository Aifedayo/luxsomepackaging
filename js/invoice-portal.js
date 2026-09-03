document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = window.LUXSOME?.apiBase;

    if (!API_BASE) {
        throw new Error(
            "Luxsome environment configuration was not loaded."
        );
    }
    const MAX_SLIP_SIZE = 5 * 1024 * 1024;
    const ALLOWED_SLIP_TYPES = new Set([
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf"
    ]);
    const $ = id => document.getElementById(id);
    const token = new URLSearchParams(location.search).get("token") || "";
    let invoice = null;
    let previewUrl = "";

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
                throw new Error(
                    data.message ||
                    data.error ||
                    `Request failed with status ${response.status}`
                );
            }
        
            return data;
        }

    function render() {
        const current = invoice;
        const currency = current.currency || "NGN";

        $("invoiceReference").textContent = current.invoice_reference;
        $("customerName").textContent =
            current.brand_name || current.customer_name || "Valued customer";
        $("invoiceStatus").textContent =
            String(current.status || "").replaceAll("_", " ");
        $("balanceDue").textContent = money(current.balance_due, currency);
        $("grandTotal").textContent = money(current.grand_total, currency);
        $("issueDate").textContent = date(current.issue_date);
        $("dueDate").textContent = date(current.due_date);

        $("invoiceItems").innerHTML = current.items.map(item => `
            <tr>
                <td>
                    <strong>${esc(item.description)}</strong>
                    ${item.details
                        ? `<span class="item-detail">${esc(item.details)}</span>`
                        : ""}
                </td>
                <td>${esc(item.quantity)}</td>
                <td>${money(item.unit_price, currency)}</td>
                <td>${money(item.line_total, currency)}</td>
            </tr>
        `).join("");

        $("invoiceTotals").innerHTML = `
            <div><span>Subtotal</span><strong>${money(current.subtotal, currency)}</strong></div>
            <div><span>Discount</span><strong>− ${money(current.discount, currency)}</strong></div>
            <div><span>Delivery</span><strong>${money(current.delivery_fee, currency)}</strong></div>
            <div><span>Tax</span><strong>${money(current.tax, currency)}</strong></div>
            <div><span>Amount paid</span><strong>${money(current.amount_paid, currency)}</strong></div>
            <div class="grand"><span>Balance due</span><strong>${money(current.balance_due, currency)}</strong></div>
        `;

        $("paymentInstructions").textContent =
            current.payment_instructions ||
            "Please contact Luxsome Packaging for payment details.";
        $("paymentTerms").textContent =
            current.payment_terms ||
            "Payment is due according to the agreed project terms.";
        $("paymentAmount").value = Math.max(
            0,
            Number(current.balance_due) || 0
        );

        if (current.status === "paid" || Number(current.balance_due) <= 0) {
            $("paymentCard").innerHTML = `
                <div class="paid-note">
                    <strong>Payment complete</strong>
                    <p>This invoice has been marked as paid.</p>
                </div>
            `;
        } else if (current.payment_confirmation_status === "submitted") {
            $("paymentCard").innerHTML = `
                <div class="payment-submitted">
                    <strong>Payment information submitted</strong>
                    <p>Luxsome Packaging is verifying the payment of ${money(
                        current.payment_confirmation_amount,
                        currency
                    )}.</p>
                    ${current.payment_confirmation_file_name
                        ? `<p>Attached slip: ${esc(
                            current.payment_confirmation_file_name
                        )}</p>`
                        : ""}
                </div>
            `;
        }

        $("loading").hidden = true;
        $("invoice").hidden = false;
        $("printInvoice").disabled = false;
    }

    async function load() {
        if (!/^[a-f0-9]{64}$/.test(token)) {
            showError("This invoice link is invalid.");
            return;
        }

        try {
            const data = await api(`/public/invoices/${token}`);
            invoice = data.invoice;
            render();
        } catch (error) {
            showError(error.message);
        }
    }

    function showError(message) {
        $("loading").hidden = true;
        $("error").hidden = false;
        $("error").textContent = message;
    }

    function clearSlipPreview() {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            previewUrl = "";
        }

        $("paymentSlip").value = "";
        $("paymentSlipPreview").hidden = true;
        $("paymentSlipImage").hidden = true;
        $("paymentSlipImage").removeAttribute("src");
        $("paymentSlipName").textContent = "";
        $("paymentSlipSize").textContent = "";
    }

    $("paymentSlip").addEventListener("change", event => {
        const file = event.target.files?.[0];

        if (!file) {
            clearSlipPreview();
            return;
        }

        if (!ALLOWED_SLIP_TYPES.has(file.type)) {
            clearSlipPreview();
            $("paymentStatus").textContent =
                "Upload a JPG, PNG, WEBP or PDF payment slip.";
            return;
        }

        if (file.size > MAX_SLIP_SIZE) {
            clearSlipPreview();
            $("paymentStatus").textContent =
                "The payment slip must not exceed 5 MB.";
            return;
        }

        $("paymentStatus").textContent = "";
        $("paymentSlipName").textContent = file.name;
        $("paymentSlipSize").textContent =
            `${(file.size / 1024 / 1024).toFixed(2)} MB`;
        $("paymentSlipPreview").hidden = false;

        if (file.type.startsWith("image/")) {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }

            previewUrl = URL.createObjectURL(file);
            $("paymentSlipImage").src = previewUrl;
            $("paymentSlipImage").hidden = false;
        } else {
            $("paymentSlipImage").hidden = true;
        }
    });

    $("removePaymentSlip").addEventListener("click", clearSlipPreview);

    $("paymentForm").addEventListener("submit", async event => {
        event.preventDefault();

        const button = $("paymentButton");
        const slip = $("paymentSlip").files?.[0];

        if (!slip) {
            $("paymentStatus").textContent = "Attach your payment slip.";
            return;
        }

        button.disabled = true;
        $("paymentStatus").textContent = "Uploading payment information…";

        const formData = new FormData();
        formData.append(
            "amount",
            String(Number($("paymentAmount").value) || 0)
        );
        formData.append(
            "reference",
            $("paymentReference").value.trim()
        );
        formData.append("note", $("paymentNote").value.trim());
        formData.append("paymentSlip", slip, slip.name);

        try {
            const data = await api(
                `/public/invoices/${token}/confirm-payment`,
                {
                    method: "POST",
                    body: formData
                }
            );

            $("paymentStatus").textContent = data.message;
            $("paymentForm")
                .querySelectorAll("input,textarea,button")
                .forEach(element => {
                    element.disabled = true;
                });
        } catch (error) {
            $("paymentStatus").textContent = error.message;
            button.disabled = false;
        }
    });

    $("printInvoice").addEventListener("click", async () => {
        if (!invoice || $("invoice").hidden) {
            return;
        }
    
        const invoiceElement = $("invoice");
    
        /*
         * Clone the invoice so we can remove interactive sections
         * without affecting the page the customer is viewing.
         */
        const printableInvoice = invoiceElement.cloneNode(true);
    
        printableInvoice.removeAttribute("hidden");
        printableInvoice.removeAttribute("id");
    
        /*
         * Payment confirmation belongs to the web portal,
         * not the PDF invoice.
         */
        printableInvoice
            .querySelector("#paymentCard")
            ?.remove();
    
        const printWindow = window.open(
            "",
            "_blank",
            "width=900,height=1100"
        );
    
        if (!printWindow) {
            alert(
                "Your browser blocked the print window. Please allow pop-ups for Luxsome Packaging and try again."
            );
            return;
        }
    
        printWindow.document.open();
    
        printWindow.document.write(`
            <!doctype html>
            <html lang="en">
            <head>
                <meta charset="utf-8">
    
                <title>
                    ${esc(invoice.invoice_reference || "Luxsome Invoice")}
                </title>
    
                <meta
                    name="viewport"
                    content="width=device-width,initial-scale=1"
                >
    
                <link
                    rel="preconnect"
                    href="https://fonts.googleapis.com"
                >
    
                <link
                    rel="preconnect"
                    href="https://fonts.gstatic.com"
                    crossorigin
                >
    
                <link
                    href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Montserrat:wght@400;500;600;700&display=swap"
                    rel="stylesheet"
                >
    
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
                        color: #2e1c15;
                    }
    
                    body {
                        font-family:
                            "Montserrat",
                            Arial,
                            sans-serif;
    
                        font-size: 12px;
                        line-height: 1.6;
    
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
    
                    .invoice-paper {
                        display: block;
                        width: 100%;
                        max-width: 100%;
                        margin: 0;
                        padding: 0;
                        background: #ffffff;
                        color: #2e1c15;
                    }
    
                    .invoice-heading {
                        display: grid;
                        grid-template-columns:
                            minmax(0, 1fr)
                            auto;
    
                        gap: 30px;
                        align-items: start;
    
                        padding-bottom: 24px;
                        margin-bottom: 24px;
    
                        border-bottom:
                            1px solid #dfd3ca;
                    }
    
                    .eyebrow {
                        margin:
                            0
                            0
                            8px;
    
                        color: #8b604d;
    
                        font-size: 10px;
                        font-weight: 700;
    
                        letter-spacing: .15em;
                        text-transform: uppercase;
                    }
    
                    h1,
                    h2,
                    p {
                        margin-top: 0;
                    }
    
                    h1 {
                        margin-bottom: 6px;
    
                        font-family:
                            "DM Serif Display",
                            Georgia,
                            serif;
    
                        font-size: 30px;
                        font-weight: 400;
                        line-height: 1.1;
                    }
    
                    h2 {
                        margin-bottom: 8px;
    
                        font-size: 12px;
                        font-weight: 700;
                    }
    
                    .status-box {
                        min-width: 130px;
                        padding: 14px 16px;
    
                        border:
                            1px solid #dfd3ca;
    
                        text-align: right;
                    }
    
                    .status-box span {
                        display: block;
    
                        margin-bottom: 3px;
    
                        color: #806b60;
    
                        font-size: 9px;
                        font-weight: 600;
    
                        text-transform: uppercase;
                        letter-spacing: .1em;
                    }
    
                    .status-box strong {
                        text-transform: capitalize;
                    }
    
                    .summary-grid {
                        display: grid;
                        grid-template-columns:
                            repeat(4, 1fr);
    
                        margin-bottom: 28px;
    
                        border:
                            1px solid #dfd3ca;
                    }
    
                    .summary-grid article {
                        padding: 14px;
                    }
    
                    .summary-grid article + article {
                        border-left:
                            1px solid #dfd3ca;
                    }
    
                    .summary-grid span {
                        display: block;
    
                        margin-bottom: 5px;
    
                        color: #806b60;
    
                        font-size: 9px;
                        font-weight: 600;
    
                        text-transform: uppercase;
                        letter-spacing: .08em;
                    }
    
                    .summary-grid strong {
                        font-size: 12px;
                    }
    
                    .items-wrap {
                        margin-bottom: 24px;
                    }
    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                    }
    
                    thead {
                        background: #2e1c15;
                        color: #ffffff;
                    }
    
                    th {
                        padding: 10px 12px;
    
                        font-size: 9px;
                        font-weight: 700;
    
                        letter-spacing: .06em;
                        text-align: left;
                        text-transform: uppercase;
                    }
    
                    th:nth-child(n + 2),
                    td:nth-child(n + 2) {
                        text-align: right;
                    }
    
                    td {
                        padding: 12px;
    
                        border-bottom:
                            1px solid #e8ded7;
    
                        vertical-align: top;
                    }
    
                    td strong {
                        display: block;
                    }
    
                    .item-detail {
                        display: block;
    
                        margin-top: 4px;
    
                        color: #806b60;
                        font-size: 10px;
                    }
    
                    .totals {
                        width: 310px;
                        margin:
                            0
                            0
                            30px
                            auto;
                    }
    
                    .totals > div {
                        display: flex;
                        justify-content: space-between;
                        gap: 30px;
    
                        padding: 6px 0;
                    }
    
                    .totals .grand {
                        margin-top: 5px;
                        padding-top: 10px;
    
                        border-top:
                            1px solid #2e1c15;
    
                        font-size: 14px;
                    }
    
                    .notes-grid {
                        display: grid;
                        grid-template-columns:
                            repeat(2, 1fr);
    
                        gap: 18px;
                    }
    
                    .notes-grid article {
                        padding: 16px;
    
                        border:
                            1px solid #dfd3ca;
    
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
    
                    .notes-grid p {
                        margin-bottom: 0;
                        white-space: pre-line;
                    }
    
                    tr,
                    .invoice-heading,
                    .summary-grid,
                    .totals,
                    .notes-grid {
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
    
                    @media print {
                        html,
                        body {
                            width: auto;
                            height: auto;
                            overflow: visible;
                        }
                    }
                </style>
            </head>
    
            <body>
                ${printableInvoice.outerHTML}
            </body>
            </html>
        `);
    
        printWindow.document.close();
    
        /*
         * Wait for fonts/images/layout before opening the
         * browser's PDF/print dialog.
         */
        const waitForPrintAssets = async () => {
            try {
                await printWindow.document.fonts?.ready;
            } catch (_) {
                // Browser without FontFaceSet support.
            }
    
            const images = Array.from(
                printWindow.document.images
            );
    
            await Promise.all(
                images.map(image => {
                    if (image.complete) {
                        return Promise.resolve();
                    }
    
                    return new Promise(resolve => {
                        image.addEventListener(
                            "load",
                            resolve,
                            { once: true }
                        );
    
                        image.addEventListener(
                            "error",
                            resolve,
                            { once: true }
                        );
                    });
                })
            );
        };
    
        await waitForPrintAssets();
    
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 250);
    });
    window.addEventListener("beforeunload", () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
    });

    load();
});
