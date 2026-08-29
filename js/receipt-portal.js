document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = window.LUXSOME?.apiBase;
    const element = id => document.getElementById(id);

    if (!API_BASE) {
        throw new Error("Luxsome environment configuration was not loaded.");
    }

    const token =
        new URLSearchParams(window.location.search).get("token") || "";

    function formatMoney(value, currency = "NGN") {
        try {
            return new Intl.NumberFormat("en-NG", {
                style: "currency",
                currency: currency || "NGN",
                maximumFractionDigits: 0
            }).format(Number(value) || 0);
        } catch {
            return `₦${Number(value || 0).toLocaleString("en-NG")}`;
        }
    }

    function formatDate(value) {
        if (!value) return "—";

        const raw = String(value);

        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
            return new Intl.DateTimeFormat("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric"
            }).format(new Date(`${raw}T00:00:00`));
        }

        return new Intl.DateTimeFormat("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(new Date(raw));
    }

    function titleCase(value) {
        return String(value || "")
            .replaceAll("_", " ")
            .replace(/\b\w/g, character => character.toUpperCase());
    }

    function showError(message) {
        element("loading").hidden = true;
        element("error").hidden = false;
        element("error").textContent = message;
    }

    function getPaymentType(receipt) {
        const total = Number(receipt.grand_total || 0);
        const amount = Number(receipt.amount || 0);
        const balance = Number(receipt.balance_due_at_receipt || 0);
        const cumulative = Number(receipt.amount_paid_at_receipt || 0);

        if (balance <= 0 && total > 0) {
            return {
                label: "Final payment received",
                note: "This payment completed the invoice.",
                stamp: "PAID IN FULL",
                status: "Paid in full"
            };
        }

        const ratio = total > 0 ? amount / total : 0;
        const cumulativeRatio = total > 0 ? cumulative / total : 0;

        if (
            Math.abs(ratio - 0.70) < 0.015 ||
            Math.abs(cumulativeRatio - 0.70) < 0.015
        ) {
            return {
                label: "70% deposit received",
                note: "Standard project deposit received.",
                stamp: "DEPOSIT RECEIVED",
                status: "Partially paid"
            };
        }

        return {
            label: "Payment received",
            note: balance > 0
                ? "A balance remains on this invoice."
                : "This invoice has been settled.",
            stamp: balance > 0 ? "PAYMENT RECEIVED" : "PAID IN FULL",
            status: balance > 0 ? "Partially paid" : "Paid in full"
        };
    }

    function paymentMethodLabel(receipt) {
        if (String(receipt.provider || "").toLowerCase() === "paystack") {
            return "Paystack";
        }

        return receipt.payment_method || "—";
    }

    function paymentReference(receipt) {
        return (
            receipt.provider_reference ||
            receipt.payment_reference ||
            receipt.provider_transaction_id ||
            "Not supplied"
        );
    }

    function renderReceipt(receipt) {
        const currency = receipt.currency || "NGN";
        const type = getPaymentType(receipt);
        const balance = Number(receipt.balance_due_at_receipt || 0);

        element("receiptReference").textContent =
            receipt.receipt_reference || "—";

        element("customerName").textContent =
            receipt.brand_name ||
            receipt.customer_name ||
            "Valued customer";

        element("paymentTypeLabel").textContent = type.label;
        element("paymentTypeNote").textContent = type.note;
        element("paymentStamp").textContent = type.stamp;

        if (balance <= 0) {
            element("paymentStamp").classList.add("paid-stamp--complete");
        }

        element("amountReceived").textContent =
            formatMoney(receipt.amount, currency);

        element("invoiceReference").textContent =
            receipt.invoice_reference || "—";

        element("paymentDate").textContent =
            formatDate(receipt.payment_date || receipt.created_at);

        element("paymentMethod").textContent =
            paymentMethodLabel(receipt);

        element("paymentChannel").textContent =
            receipt.channel
                ? titleCase(receipt.channel)
                : "—";

        element("paymentReference").textContent =
            paymentReference(receipt);

        element("invoiceTotal").textContent =
            formatMoney(receipt.grand_total, currency);

        element("totalPaid").textContent =
            formatMoney(receipt.amount_paid_at_receipt, currency);

        element("balanceDue").textContent =
            formatMoney(receipt.balance_due_at_receipt, currency);

        element("invoiceStatus").textContent = type.status;

        if (receipt.notes) {
            element("notesSection").hidden = false;
            element("paymentNotes").textContent = receipt.notes;
        }

        element("balanceMessage").innerHTML =
            balance > 0
                ? `
                    <strong>Balance remaining</strong>
                    <p>
                        ${formatMoney(balance, currency)} remains on invoice
                        ${String(receipt.invoice_reference || "")}.
                    </p>
                `
                : `
                    <strong>Invoice paid in full</strong>
                    <p>
                        No balance remains on this invoice.
                    </p>
                `;

        element("balanceMessage").classList.toggle(
            "balance-message--complete",
            balance <= 0
        );

        element("loading").hidden = true;
        element("receipt").hidden = false;
    }

    async function loadReceipt() {
        if (!/^[a-f0-9]{64}$/.test(token)) {
            showError("This receipt link is invalid.");
            return;
        }

        try {
            const response = await fetch(
                `${API_BASE}/public/receipts/${token}`,
                {
                    headers: {
                        Accept: "application/json"
                    }
                }
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    data.message ||
                    "The receipt could not be opened."
                );
            }

            if (!data.receipt) {
                throw new Error("The receipt could not be opened.");
            }

            renderReceipt(data.receipt);
        } catch (error) {
            showError(error.message);
        }
    }

    element("printReceipt").addEventListener(
        "click",
        () => window.print()
    );

    loadReceipt();
});