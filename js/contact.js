document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = window.LUXSOME?.apiBase;
    const router = document.getElementById("routerPanel");
    const views = [
        "quotationView",
        "sampleView",
        "simpleContactView",
        "existingView"
    ].map(id => document.getElementById(id)).filter(Boolean);

    const show = view => {
        router.hidden = true;
        views.forEach(item => {
            item.hidden = item !== view;
        });
        view.hidden = false;
        view.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const home = () => {
        views.forEach(view => {
            view.hidden = true;
        });
        router.hidden = false;
        router.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    document.querySelectorAll('[data-back-to="home"]').forEach(button => {
        button.addEventListener("click", home);
    });

    document.querySelectorAll("[data-intent]").forEach(button => {
        button.addEventListener("click", () => {
            const target =
                button.dataset.intent === "quotation"
                    ? "quotationView"
                    : button.dataset.intent === "sample"
                        ? "sampleView"
                        : button.dataset.intent === "existing"
                            ? "existingView"
                            : "simpleContactView";

            show(document.getElementById(target));
        });
    });

    function setupAccordion(root) {
        root?.querySelectorAll(".product-group__toggle").forEach(toggle => {
            toggle.addEventListener("click", () => {
                const group = toggle.closest(".product-group");
                const panel = group.querySelector(".product-group__panel");
                const opening = panel.hidden;

                root.querySelectorAll(".product-group").forEach(item => {
                    item.querySelector(".product-group__panel").hidden = true;
                    item.querySelector(".product-group__toggle")
                        .setAttribute("aria-expanded", "false");
                    item.querySelector(
                        ".product-group__toggle span:last-child"
                    ).textContent = "+";
                });

                if (opening) {
                    panel.hidden = false;
                    toggle.setAttribute("aria-expanded", "true");
                    toggle.querySelector("span:last-child").textContent = "−";
                }
            });
        });
    }

    document.querySelectorAll("[data-product-accordion]")
        .forEach(setupAccordion);

    function productSelector(form, hiddenId, errorId, summaryId) {
        const selected = new Map();
        const hidden = document.getElementById(hiddenId);
        const summary = summaryId
            ? document.getElementById(summaryId)
            : null;

        function sync() {
            hidden.value = JSON.stringify([...selected.values()]);

            if (summary) {
                summary.innerHTML = selected.size
                    ? [...selected.values()]
                        .map(item => (
                            `<span class="selection-chip">${escapeHtml(
                                item.product
                            )}</span>`
                        ))
                        .join("")
                    : '<span class="selection-empty">Nothing selected yet.</span>';
            }
        }

        function clear() {
            selected.clear();
            form.querySelectorAll("[data-product], [data-tier-product]")
                .forEach(button => {
                    button.classList.remove("is-selected");
                    button.setAttribute("aria-pressed", "false");
                });
            sync();
        }

        function selectOne(category, product, button) {
            clear();
            const key = `${category}::${product}`;

            selected.set(key, {
                category,
                product
            });

            if (button) {
                button.classList.add("is-selected");
                button.setAttribute("aria-pressed", "true");
            }

            sync();
            document.getElementById(errorId).textContent = "";
        }

        form.querySelectorAll("[data-product]").forEach(button => {
            button.addEventListener("click", () => {
                // Selecting an individual product exits system mode.
                const tierSelector = document.getElementById("tierSelector");
                if (tierSelector && !tierSelector.hidden) {
                    tierSelector.hidden = true;
                }

                form.querySelectorAll("[data-tier-product]")
                    .forEach(tier => {
                        tier.classList.remove("is-selected");
                        tier.setAttribute("aria-pressed", "false");
                    });

                // If a complete system had been selected, clear it first.
                [...selected.keys()]
                    .filter(key => key.startsWith("Complete Packaging System::"))
                    .forEach(key => selected.delete(key));

                const key =
                    `${button.dataset.category}::${button.dataset.product}`;
                const active = selected.has(key);

                if (active) {
                    selected.delete(key);
                } else {
                    selected.set(key, {
                        category: button.dataset.category,
                        product: button.dataset.product
                    });
                }

                button.classList.toggle("is-selected", !active);
                button.setAttribute("aria-pressed", String(!active));

                sync();
                document.getElementById(errorId).textContent = "";
            });
        });

        return {
            selected,
            clear,
            selectOne,
            sync
        };
    }

    const qForm = document.getElementById("quotationForm");
    const qSelector = productSelector(
        qForm,
        "quotationProductsJson",
        "quotationProductError",
        "quotationSelectionSummary"
    );

    const recommendButton = document.getElementById("recommendSystemButton");
    const tierSelector = document.getElementById("tierSelector");
    const backToIndividual = document.getElementById(
        "backToIndividualSelection"
    );

    recommendButton?.addEventListener("click", () => {
        // This is intentional: recommendation mode replaces all prior choices.
        qSelector.clear();

        tierSelector.hidden = false;
        tierSelector.scrollIntoView({
            behavior: "smooth",
            block: "nearest"
        });
    });

    qForm.querySelectorAll("[data-tier-product]").forEach(button => {
        button.addEventListener("click", () => {
            qSelector.selectOne(
                "Complete Packaging System",
                button.dataset.tierProduct,
                button
            );
        });
    });

    backToIndividual?.addEventListener("click", () => {
        qSelector.clear();
        tierSelector.hidden = true;

        const completeGroup = recommendButton.closest(".product-group");
        completeGroup?.querySelector(".product-group__toggle")
            ?.setAttribute("aria-expanded", "false");

        const panel = completeGroup?.querySelector(".product-group__panel");
        if (panel) panel.hidden = true;

        const symbol = completeGroup?.querySelector(
            ".product-group__toggle span:last-child"
        );
        if (symbol) symbol.textContent = "+";
    });

    let qty = "";

    qForm.querySelectorAll("[data-quantity]").forEach(button => {
        button.addEventListener("click", () => {
            qty = button.dataset.quantity;

            qForm.querySelectorAll("[data-quantity]").forEach(item => {
                item.classList.toggle("is-selected", item === button);
            });

            document.getElementById("selectedQuantity").value = qty;
        });
    });

    qForm.addEventListener("submit", event => {
        submit(
            event,
            qForm,
            "/quotation-requests",
            "quotation",
            "quotationSubmitButton",
            "quotationFormStatus",
            qSelector.selected,
            "quotationProductError"
        );
    });

    const sForm = document.getElementById("sampleForm");
    const sSelector = productSelector(
        sForm,
        "sampleProductsJson",
        "sampleProductError",
        "sampleSelectionSummary"
    );

    const basis = document.getElementById("sampleBasis");
    const upload = document.getElementById("sampleUploadZone");
    const file = document.getElementById("sampleAttachment");
    const filePreview = document.getElementById("sampleFilePreview");
    const fileName = document.getElementById("sampleFileName");
    const fileMeta = document.getElementById("sampleFileMeta");
    const removeFileButton = document.getElementById("removeSampleFile");

    document.querySelectorAll("[data-sample-basis]").forEach(button => {
        button.addEventListener("click", () => {
            basis.value = button.dataset.sampleBasis;

            document.querySelectorAll("[data-sample-basis]")
                .forEach(item => {
                    item.classList.toggle(
                        "is-selected",
                        item === button
                    );
                });

            const shouldShowUpload = ["reference", "artwork"]
                .includes(basis.value);

            upload.hidden = !shouldShowUpload;

            if (!shouldShowUpload) {
                clearSampleFile();
            }
        });
    });

    file.addEventListener("change", () => {
        const selectedFile = file.files[0];

        if (!selectedFile) {
            clearSampleFile();
            return;
        }

        const maxBytes = 10 * 1024 * 1024;
        const allowedTypes = new Set([
            "image/jpeg",
            "image/png",
            "image/webp",
            "application/pdf"
        ]);

        const attachmentError =
            document.getElementById("sampleAttachmentError");

        attachmentError.textContent = "";

        if (!allowedTypes.has(selectedFile.type)) {
            attachmentError.textContent =
                "Please choose a JPG, PNG, WEBP or PDF file.";
            clearSampleFile(false);
            return;
        }

        if (selectedFile.size > maxBytes) {
            attachmentError.textContent =
                "Please choose a file smaller than 10MB.";
            clearSampleFile(false);
            return;
        }

        fileName.textContent = selectedFile.name;
        fileMeta.textContent =
            `${formatFileSize(selectedFile.size)} · ${
                selectedFile.type === "application/pdf"
                    ? "PDF"
                    : "Image"
            }`;

        filePreview.hidden = false;
        upload.classList.add("has-file");
    });

    removeFileButton?.addEventListener("click", () => {
        clearSampleFile();
        file.focus();
    });

    function clearSampleFile(clearError = true) {
        file.value = "";
        fileName.textContent = "";
        fileMeta.textContent = "";
        filePreview.hidden = true;
        upload.classList.remove("has-file");

        if (clearError) {
            document.getElementById(
                "sampleAttachmentError"
            ).textContent = "";
        }
    }

    function formatFileSize(bytes) {
        if (!Number.isFinite(bytes) || bytes <= 0) {
            return "0 KB";
        }

        if (bytes < 1024 * 1024) {
            return `${Math.max(1, Math.round(bytes / 1024))} KB`;
        }

        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    sForm.addEventListener("submit", event => {
        submit(
            event,
            sForm,
            "/sample-requests",
            "sample",
            "sampleSubmitButton",
            "sampleFormStatus",
            sSelector.selected,
            "sampleProductError"
        );
    });

    async function submit(
        event,
        form,
        path,
        type,
        buttonId,
        statusId,
        selected,
        errorId
    ) {
        event.preventDefault();

        const status = document.getElementById(statusId);
        status.textContent = "";
        status.className = "form-status";

        if (!selected.size) {
            document.getElementById(errorId).textContent =
                "Please choose at least one item.";
            return;
        }

        if (!form.reportValidity()) return;

        if (!API_BASE) {
            status.textContent =
                "The request service is temporarily unavailable.";
            status.classList.add("is-error");
            return;
        }

        const button = document.getElementById(buttonId);
        const text = button.querySelector(".button-text");
        const original = text.textContent;

        button.disabled = true;
        button.classList.add("loading");
        text.textContent = "Sending...";

        try {
            const response = await fetch(
                `${API_BASE}${path}`,
                {
                    method: "POST",
                    body: new FormData(form),
                    headers: {
                        Accept: "application/json"
                    }
                }
            );

            const data = await response.json()
                .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "Your request could not be sent."
                );
            }

            const formData = new FormData(form);

            sessionStorage.setItem(
                "luxsomeContactConfirmation",
                JSON.stringify({
                    reference: data.reference,
                    type,
                    brandName: formData.get("brandName"),
                    submittedAt: new Date().toISOString()
                })
            );

            location.assign(
                `/contact/success/?reference=${encodeURIComponent(
                    data.reference
                )}&type=${encodeURIComponent(type)}`
            );
        } catch (error) {
            status.textContent = error.message;
            status.classList.add("is-error");

            button.disabled = false;
            button.classList.remove("loading");
            text.textContent = original;
        }
    }

    function escapeHtml(value) {
        return String(value).replace(
            /[&<>'"]/g,
            character => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "'": "&#39;",
                '"': "&quot;"
            })[character]
        );
    }
});