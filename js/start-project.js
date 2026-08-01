document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("projectForm");
    if (!form) return;

    const steps = Array.from(form.querySelectorAll(".project-step"));
    const progressItems = Array.from(document.querySelectorAll("[data-progress-step]"));
    const backButton = document.getElementById("backButton");
    const nextButton = document.getElementById("nextButton");
    const submitButton = document.getElementById("submitButton");
    const mobileStepText = document.getElementById("mobileStepText");
    const mobileProgressFill = document.getElementById("mobileProgressFill");
    const formStatus = document.getElementById("formStatus");
    const reviewCard = document.getElementById("reviewCard");
    const projectSummaryInput = document.getElementById("projectSummaryInput");
    const projectReferenceInput = document.getElementById("projectReferenceInput");
    const formSubject = document.getElementById("formSubject");
    const shopConfigurationInput = document.getElementById("shopConfigurationInput");
    const submittedPackagingSystem = document.getElementById("submittedPackagingSystem");
    const submittedComponents = document.getElementById("submittedComponents");
    const submittedDate = document.getElementById("submittedDate");
    const changeProductSelections = document.getElementById(
        "changeProductSelections"
    );

    const totalSteps = 2;
    let currentStep = 1;
    const shopConfiguration = readShopConfiguration();

    addConfigurationFields(shopConfiguration);
    configureProductSelectionReturnLink(shopConfiguration);
    updateStepUI(false);

    nextButton?.addEventListener("click", () => {
        clearStatus();

        if (!validateStep(1)) return;

        currentStep = 2;
        buildReview();
        updateStepUI();
    });

    backButton?.addEventListener("click", () => {
        clearStatus();

        if (currentStep > 1) {
            currentStep = 1;
            updateStepUI();
        }
    });

    form.addEventListener("change", event => {
        const target = event.target;

        if (
            target instanceof HTMLInputElement ||
            target instanceof HTMLSelectElement ||
            target instanceof HTMLTextAreaElement
        ) {
            target.removeAttribute("aria-invalid");
        }
    });

    form.addEventListener("submit", async event => {
        event.preventDefault();
        clearStatus();

        if (!validateStep(2)) return;

        buildReview();

        const projectReference = getOrCreateProjectReference();
        prepareSubmissionMetadata(projectReference);

        const originalButtonContent = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.setAttribute("aria-busy", "true");
        submitButton.innerHTML = `
            <span class="spinner" aria-hidden="true"></span>
            <span>Sending request...</span>
        `;

        try {
            const response = await fetch(form.action, {
                method: "POST",
                body: new FormData(form),
                headers: { Accept: "application/json" }
            });

            let responseData = {};

            try {
                responseData = await response.json();
            } catch (_) {
                // The endpoint may return an empty or non-JSON response.
            }

            if (!response.ok) {
                const message =
                    responseData.message ||
                    (Array.isArray(responseData.errors)
                        ? responseData.errors
                            .map(item => item.message)
                            .filter(Boolean)
                            .join(" ")
                        : "") ||
                    "Something went wrong. Please check your details and try again.";

                throw new Error(message);
            }

            const confirmedReference = responseData.reference || projectReference;

            localStorage.setItem(
                "luxsomeProjectConfirmation",
                JSON.stringify(createConfirmationData(confirmedReference))
            );

            window.location.href =
                `/start-project/project-submitted/?reference=${encodeURIComponent(
                    confirmedReference
                )}`;
        } catch (error) {
            showStatus(
                error.message ||
                    "Unable to send your order request. Please check your connection and try again.",
                "error"
            );

            submitButton.disabled = false;
            submitButton.removeAttribute("aria-busy");
            submitButton.innerHTML = originalButtonContent;
        }
    });

    function updateStepUI(shouldScroll = true) {
        const isFirstStep = currentStep === 1;
        const isReviewStep = currentStep === totalSteps;

        steps.forEach((step, index) => {
            const active = index + 1 === currentStep;
            step.hidden = !active;
            step.classList.toggle("is-active", active);
        });

        progressItems.forEach((item, index) => {
            const stepNumber = index + 1;
            item.classList.toggle("is-active", stepNumber === currentStep);
            item.classList.toggle("is-complete", stepNumber < currentStep);

            if (stepNumber === currentStep) {
                item.setAttribute("aria-current", "step");
            } else {
                item.removeAttribute("aria-current");
            }
        });

        backButton.hidden = isFirstStep;
        nextButton.hidden = isReviewStep;
        nextButton.disabled = isReviewStep;
        submitButton.hidden = !isReviewStep;

        if (mobileStepText) {
            mobileStepText.textContent = `Step ${currentStep} of ${totalSteps}`;
        }

        if (mobileProgressFill) {
            mobileProgressFill.style.width =
                `${(currentStep / totalSteps) * 100}%`;
        }

        if (shouldScroll) {
            document.querySelector(".project-form-shell")?.scrollIntoView({
                behavior: prefersReducedMotion() ? "auto" : "smooth",
                block: "start"
            });
        }

        const activeStep = steps[currentStep - 1];

        window.setTimeout(() => {
            activeStep
                ?.querySelector("input, select, textarea, button")
                ?.focus({ preventScroll: true });
        }, prefersReducedMotion() ? 0 : 250);
    }

    function validateStep(stepNumber) {
        const step = steps[stepNumber - 1];
        if (!step) return false;

        const requiredFields = Array.from(step.querySelectorAll("[required]"));

        for (const field of requiredFields) {
            if (!field.checkValidity()) {
                field.setAttribute("aria-invalid", "true");
                showStatus(
                    "Please complete the highlighted required field before continuing.",
                    "error"
                );
                field.reportValidity();
                field.focus();
                return false;
            }
        }

        if (stepNumber === 2 && !hasShopConfiguration(shopConfiguration)) {
            showStatus(
                "Your product selections could not be found. Please return to the shop and configure a packaging system first.",
                "error"
            );
            return false;
        }

        return true;
    }

    function readShopConfiguration() {
        const params = new URLSearchParams(window.location.search);
        let stored = {};

        try {
            stored = JSON.parse(
                localStorage.getItem("luxsomeShopConfiguration") || "{}"
            );
        } catch (error) {
            console.warn("The saved shop configuration could not be read.", error);
        }

        const urlValues = {};

        params.forEach((value, key) => {
            urlValues[key] = value;
        });

        return cleanObject({
            ...stored,
            ...urlValues
        });
    }

    function configureProductSelectionReturnLink(configuration) {
        if (!changeProductSelections) return;

        const productPath = getProductDetailPath(configuration);
        const params = new URLSearchParams();

        params.set("source", "shop");
        params.set(
            "product",
            String(configuration.product || "")
        );
        params.set(
            "system",
            String(configuration.system || "")
        );
        params.set("restore_configuration", "1");

        changeProductSelections.href =
            `${productPath}?${params.toString()}`;

        changeProductSelections.addEventListener("click", () => {
            localStorage.setItem(
                "luxsomeShopConfiguration",
                JSON.stringify({
                    ...configuration,
                    restore_configuration: "1"
                })
            );
        });
    }
    function getProductDetailPath(configuration) {
        const product = String(
            configuration.product ||
            configuration.source_product ||
            ""
        ).trim().toLowerCase();

        const system = String(
            configuration.system ||
            configuration.product_name ||
            ""
        ).trim().toLowerCase();

        if (
            product === "tier-1" ||
            system.includes("foundation")
        ) {
            return "/shop/tier-1/";
        }

        if (
            product === "tier-2" ||
            system.includes("signature")
        ) {
            return "/shop/tier-2/";
        }

        if (
            product === "tier-3" ||
            system.includes("prestige")
        ) {
            return "/shop/tier-3/";
        }

        if (
            product === "bespoke" ||
            system.includes("bespoke") ||
            system.includes("created for your brand") ||
            system.includes("made for your brand")
        ) {
            return "/shop/bespoke/";
        }

        return "/shop/";
    }
    function hasShopConfiguration(configuration) {
        return Boolean(
            configuration.product ||
            configuration.system ||
            configuration.box_style ||
            configuration.quantity ||
            configuration.box_quantity ||
            configuration.other_pieces_quantity ||
            configuration.additional_projects
        );
    }

    function buildReview() {
        const customerRows = [
            ["Brand", valueOf("brandName")],
            ["Contact person", valueOf("fullName")],
            ["Email", valueOf("email")],
            ["Phone or WhatsApp", valueOf("phone")],
            ["Instagram", valueOf("instagram")],
            ["Location", valueOf("location")],
            ["Preferred Contact", valueOf("preferredContactMethod")]
        ];

        const packagingRows = [
            ["Packaging system", labelValue("system")],
            ["Project type", labelValue("project_type")],
            ["Packaging pieces", labelValue("packaging_pieces")],
            ["Box style", labelValue("box_style")],
            ["Hang tag", labelValue("tag_style")],
            ["Thank-you card", labelValue("thank_you_card")],
            ["Sticker seal", labelValue("sticker_style")],
            ["Tissue", labelValue("tissue_style")],
            ["Envelope", labelValue("envelope_style")],
            ["Ribbon", labelValue("ribbon_style")],
            ["Ribbon colour", labelValue("ribbon_colour")]
        ];

        const boxQuantity = labelValue("box_quantity");
        const otherPiecesQuantity = labelValue(
            "other_pieces_quantity"
        );

        const specificationRows = [
            [
                "Box quantity",
                boxQuantity ? `${boxQuantity} pieces` : ""
            ],
            [
                "Other packaging quantity",
                otherPiecesQuantity
                    ? `${otherPiecesQuantity} pieces`
                    : ""
            ],
            [
                "Quantity",
                !boxQuantity && !otherPiecesQuantity
                    ? labelValue("quantity")
                    : ""
            ],
            ["Finished dimensions", dimensionsValue()],
            ["Volumetric weight", unitValue("volumetric_weight_kg", "kg")],
            ["Primary colour", colourValue()],
            ["Secondary colour", labelValue("secondary_colour")],
            ["Accent colour", labelValue("accent_colour")],
            ["Pantone reference", labelValue("pantone_reference")],
            ["Logo finish", labelValue("logo_finish")],
            ["Logo and artwork status", labelValue("artwork_status")],
            ["Accessories", labelValue("accessories")],
            ["Additional comments", labelValue("comments")]
        ];

        const additionalProjects = readAdditionalProjects();

        const additionalProjectSections = additionalProjects.map(
            (project, index) => {
                const projectName =
                    project.brand_name ||
                    `Additional project ${index + 1}`;

                const rows = [
                    [
                        "Packaging pieces",
                        formatProjectPieces(project.packaging_pieces)
                    ],
                    ["Box style", project.box_style || ""],
                    [
                        "Box quantity",
                        project.box_quantity
                            ? `${project.box_quantity} pieces`
                            : ""
                    ],
                    [
                        "Other packaging quantity",
                        project.other_pieces_quantity
                            ? `${project.other_pieces_quantity} pieces`
                            : ""
                    ],
                    ["Notes", project.notes || ""]
                ];

                return reviewSection(
                    `Additional project ${index + 1}: ${projectName}`,
                    rows
                );
            }
        );

        reviewCard.innerHTML = [
            reviewSection("Customer", customerRows),
            reviewSection("Main packaging project", packagingRows),
            reviewSection("Main order specifications", specificationRows),
            ...additionalProjectSections
        ].join("");

        const summaryLines = [
            `Brand: ${valueOf("brandName")}`,
            `Contact: ${valueOf("fullName")} (${valueOf("email")} · ${valueOf("phone")})`,
            "",
            "MAIN PACKAGING PROJECT",
            ...packagingRows
                .filter(([, value]) => value)
                .map(([label, value]) => `${label}: ${value}`),
            ...specificationRows
                .filter(([, value]) => value)
                .map(([label, value]) => `${label}: ${value}`)
        ];

        additionalProjects.forEach((project, index) => {
            summaryLines.push(
                "",
                `ADDITIONAL PROJECT ${index + 1}: ${
                    project.brand_name || "Unnamed project"
                }`,
                `Packaging pieces: ${
                    formatProjectPieces(project.packaging_pieces) ||
                    "Not supplied"
                }`
            );

            if (project.box_style) {
                summaryLines.push(
                    `Box style: ${project.box_style}`
                );
            }

            if (project.box_quantity) {
                summaryLines.push(
                    `Box quantity: ${project.box_quantity} pieces`
                );
            }

            if (project.other_pieces_quantity) {
                summaryLines.push(
                    `Other packaging quantity: ${
                        project.other_pieces_quantity
                    } pieces`
                );
            }

            if (project.notes) {
                summaryLines.push(`Notes: ${project.notes}`);
            }
        });

        if (projectSummaryInput) {
            projectSummaryInput.value = summaryLines.join("\n");
        }

        if (shopConfigurationInput) {
            shopConfigurationInput.value = JSON.stringify(
                shopConfiguration
            );
        }
    }

    function readAdditionalProjects() {
        const rawValue = labelValue("additional_projects");

        if (!rawValue) return [];

        try {
            const parsed = JSON.parse(rawValue);

            if (!Array.isArray(parsed)) return [];

            return parsed.filter(project => (
                project &&
                typeof project === "object" &&
                (
                    project.brand_name ||
                    project.box_style ||
                    project.box_quantity ||
                    project.other_pieces_quantity ||
                    project.notes ||
                    (
                        Array.isArray(project.packaging_pieces) &&
                        project.packaging_pieces.length
                    )
                )
            ));
        } catch (error) {
            console.warn(
                "Additional projects could not be displayed.",
                error
            );
            return [];
        }
    }

    function formatProjectPieces(pieces) {
        if (Array.isArray(pieces)) {
            return pieces
                .map(piece => String(piece).trim())
                .filter(Boolean)
                .join(", ");
        }

        return String(pieces || "").trim();
    }

    function reviewSection(title, rows) {
        const validRows = rows.filter(([, value]) => value);

        if (!validRows.length) {
            return `
                <section class="review-section">
                    <h3>${escapeHTML(title)}</h3>
                    <p class="review-empty">
                        No information was supplied for this section.
                    </p>
                </section>
            `;
        }

        return `
            <section class="review-section">
                <h3>${escapeHTML(title)}</h3>
                <dl class="review-list">
                    ${validRows.map(([label, value]) => `
                        <div class="review-row">
                            <dt>${escapeHTML(label)}</dt>
                            <dd>${escapeHTML(value)}</dd>
                        </div>
                    `).join("")}
                </dl>
            </section>
        `;
    }

    function addConfigurationFields(configuration) {
        Object.entries(configuration).forEach(([key, value]) => {
            if (!value || ["version", "saved_at"].includes(key)) return;

            const existing = form.querySelector(
                `[name="shop_${CSS.escape(key)}"]`
            );

            if (existing) {
                existing.value = String(value);
                return;
            }

            const input = document.createElement("input");
            input.type = "hidden";
            input.name = `shop_${key}`;
            input.value = String(value);
            input.dataset.shopField = "true";
            form.appendChild(input);
        });
    }

    function prepareSubmissionMetadata(projectReference) {
        const brandName = valueOf("brandName") || "Unnamed Brand";
        const system = labelValue("system") || "Shop configuration";

        if (projectReferenceInput) {
            projectReferenceInput.value = projectReference;
        }

        if (formSubject) {
            formSubject.value =
                `New Shop Order | ${projectReference} | ${brandName}`;
        }

        if (submittedPackagingSystem) {
            submittedPackagingSystem.value = system;
        }

        if (submittedComponents) {
            const additionalProjects = readAdditionalProjects();

            const additionalSummary = additionalProjects
                .map((project, index) => (
                    `Project ${index + 1}: ${
                        project.brand_name || "Unnamed project"
                    } — ${
                        formatProjectPieces(project.packaging_pieces) ||
                        "Pieces not supplied"
                    }`
                ))
                .join(" | ");

            submittedComponents.value = [
                labelValue("packaging_pieces") ||
                    "According to selected tier",
                additionalSummary
            ].filter(Boolean).join(" | ");
        }

        if (submittedDate) {
            submittedDate.value = new Intl.DateTimeFormat("en-NG", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            }).format(new Date());
        }

        if (shopConfigurationInput) {
            shopConfigurationInput.value = JSON.stringify(shopConfiguration);
        }

        appendReferenceToProjectSummary(projectReference);
    }

    function createConfirmationData(projectReference) {
        return {
            version: 2,
            reference: projectReference,
            submittedAt: new Date().toISOString(),
            customer: {
                fullName: valueOf("fullName"),
                brandName: valueOf("brandName"),
                email: valueOf("email"),
                phone: valueOf("phone"),
                instagram: valueOf("instagram"),
                location: valueOf("location"),
                preferredContactMethod: valueOf("preferredContactMethod")
            },
            project: {
                source: "Luxsome shop",
                packagingSystem: labelValue("system"),
                configuration: shopConfiguration
            }
        };
    }

    function dimensionsValue() {
        const length = labelValue("box_length_cm");
        const breadth = labelValue("box_breadth_cm");
        const height = labelValue("box_height_cm");

        if (!length && !breadth && !height) return "";

        return `${length || "—"} × ${breadth || "—"} × ${height || "—"} cm`;
    }

    function colourValue() {
        const primary = labelValue("primary_colour");
        const custom = labelValue("custom_colour");

        if (primary === "Other" && custom) return custom;
        return primary;
    }

    function unitValue(key, unit) {
        const value = labelValue(key);
        return value ? `${value} ${unit}` : "";
    }

    function labelValue(key) {
        return String(shopConfiguration[key] || "").trim();
    }

    function cleanObject(object) {
        return Object.fromEntries(
            Object.entries(object).filter(([, value]) => (
                value !== null &&
                value !== undefined &&
                String(value).trim() !== ""
            ))
        );
    }

    function generateProjectReference(date = new Date()) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        const randomCode = String(Math.floor(1000 + Math.random() * 9000));

        return `LX-${year}${month}${day}-${randomCode}`;
    }

    function getOrCreateProjectReference() {
        const existing = projectReferenceInput?.value.trim();
        if (existing) return existing;

        const reference = generateProjectReference();

        if (projectReferenceInput) {
            projectReferenceInput.value = reference;
        }

        return reference;
    }

    function appendReferenceToProjectSummary(projectReference) {
        if (!projectSummaryInput) return;

        const currentSummary = projectSummaryInput.value.trim();
        const referenceLine = `Project reference: ${projectReference}`;

        if (currentSummary.includes(referenceLine)) return;

        projectSummaryInput.value = [
            referenceLine,
            currentSummary
        ].filter(Boolean).join("\n");
    }

    function valueOf(id) {
        return document.getElementById(id)?.value.trim() || "";
    }

    function escapeHTML(value) {
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

    function showStatus(message, type = "") {
        if (!formStatus) return;

        formStatus.textContent = message;
        formStatus.className =
            `form-status${type ? ` is-${type}` : ""}`;
    }

    function clearStatus() {
        showStatus("");

        form
            .querySelectorAll('[aria-invalid="true"]')
            .forEach(element => element.removeAttribute("aria-invalid"));
    }

    function prefersReducedMotion() {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
});
