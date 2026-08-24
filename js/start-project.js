document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("projectForm");
    if (!form) return;
    const API_BASE = window.LUXSOME?.apiBase;

    if (!API_BASE) {
        console.error(
            "Luxsome environment configuration was not loaded."
        );

        return;
    }

    const steps = Array.from(form.querySelectorAll(".project-step"));
    const progressItems = Array.from(document.querySelectorAll("[data-progress-step]"));
    const backButton = document.getElementById("backButton");
    const nextButton = document.getElementById("nextButton");
    const submitButton = document.getElementById("submitButton");
    const mobileStepText = document.getElementById("mobileStepText");
    const mobileProgressFill = document.getElementById("mobileProgressFill");
    const formStatus = document.getElementById("formStatus");
    const emailField = document.getElementById("email");
    const phoneField = document.getElementById("phone");
    const reviewCard = document.getElementById("reviewCard");
    const projectSummaryInput = document.getElementById("projectSummaryInput");
    const projectReferenceInput = document.getElementById("projectReferenceInput");
    const formSubject = document.getElementById("formSubject");
    const projectIntentInput = document.getElementById("projectIntentInput");
    const requestTypeInput = document.getElementById("requestTypeInput");
    const projectIntentSummary = document.getElementById("projectIntentSummary");
    const projectIntentEyebrow = document.getElementById("projectIntentEyebrow");
    const projectIntentHeroText = document.getElementById("projectIntentHeroText");
    const projectConsentText = document.getElementById("projectConsentText");
    const projectSubmissionNote = document.getElementById("projectSubmissionNote");
    const shopConfigurationInput = document.getElementById("shopConfigurationInput");
    const submittedPackagingSystem = document.getElementById("submittedPackagingSystem");
    const submittedComponents = document.getElementById("submittedComponents");
    const submittedDate = document.getElementById("submittedDate");
    const changeProductSelections = document.getElementById(
        "changeProductSelections"
    );

    const totalSteps = 2;
    const START_PROJECT_DRAFT_KEY =
        "luxsomeStartProjectDraft";

    let currentStep = 1;

    const shopConfiguration =
        normaliseSampleRequestQuantities(
            readShopConfiguration()
        );

    addConfigurationFields(shopConfiguration);
    configureProjectIntent(shopConfiguration);
    restoreStartProjectDraft();
    configureProductSelectionReturnLink(shopConfiguration);
    updateStepUI(false);

    emailField?.addEventListener("input", () => {
        validateEmailField(false);
    });
    
    emailField?.addEventListener("blur", () => {
        validateEmailField(true);
    });
    
    phoneField?.addEventListener("input", () => {
        /*
         * Remove letters immediately while retaining characters
         * commonly used when writing telephone numbers.
         */
        phoneField.value = phoneField.value.replace(
            /[^0-9+\-()\s]/g,
            ""
        );
    
        validatePhoneField(false);
    });
    
    phoneField?.addEventListener("blur", () => {
        validatePhoneField(true);
    });

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
            if (target === emailField) {
                validateEmailField(false);
            } else if (target === phoneField) {
                validatePhoneField(false);
            } else if (target.checkValidity()) {
                target.removeAttribute("aria-invalid");
            }
            
            saveStartProjectDraft();
        }
    });

    form.addEventListener("input", event => {
        const target = event.target;

        if (
            target instanceof HTMLInputElement ||
            target instanceof HTMLSelectElement ||
            target instanceof HTMLTextAreaElement
        ) {
            saveStartProjectDraft();
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
            const response = await fetch(`${API_BASE}/project`, {
                method: "POST",
                body: new FormData(form),
                headers: {
                    Accept: "application/json"
                }
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

            localStorage.removeItem(
                START_PROJECT_DRAFT_KEY
            );

            window.location.href =
                `/start-project/project-submitted/?reference=${encodeURIComponent(
                    confirmedReference
                )}`;
        } catch (error) {
            showStatus(
                error.message ||
                    "Unable to send your project request. Please check your connection and try again.",
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
    
        if (!step) {
            return false;
        }
    
        /*
         * Run the custom contact validation before relying on
         * the browser's standard required-field validation.
         */
        if (stepNumber === 1) {
            const emailIsValid = validateEmailField(true);
            const phoneIsValid = validatePhoneField(true);
    
            if (!emailIsValid) {
                showStatus(
                    "Please enter a valid email address before continuing.",
                    "error"
                );
    
                emailField?.reportValidity();
                emailField?.focus();
    
                return false;
            }
    
            if (!phoneIsValid) {
                showStatus(
                    "Please enter a valid phone or WhatsApp number before continuing.",
                    "error"
                );
    
                phoneField?.reportValidity();
                phoneField?.focus();
    
                return false;
            }
        }
    
        const requiredFields = Array.from(
            step.querySelectorAll("[required]")
        );
    
        for (const field of requiredFields) {
            if (!field.checkValidity()) {
                field.setAttribute(
                    "aria-invalid",
                    "true"
                );
    
                showStatus(
                    getValidationMessage(field),
                    "error"
                );
    
                field.reportValidity();
                field.focus();
    
                return false;
            }
    
            field.removeAttribute("aria-invalid");
        }
    
        if (
            stepNumber === 2 &&
            !hasShopConfiguration(shopConfiguration)
        ) {
            showStatus(
                "Your product selections could not be found. Please return to the shop and configure a packaging system first.",
                "error"
            );
    
            return false;
        }
    
        return true;
    }

    function validateEmailField(showError = false) {
        if (!emailField) {
            return true;
        }
    
        const value = emailField.value.trim();
    
        emailField.value = value;
        emailField.setCustomValidity("");
    
        if (!value) {
            emailField.setCustomValidity(
                "Please enter your email address."
            );
        } else {
            /*
             * This requires:
             * - content before @
             * - a domain after @
             * - a visible domain extension
             * - no spaces
             */
            const validEmailPattern =
                /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    
            if (!validEmailPattern.test(value)) {
                emailField.setCustomValidity(
                    "Enter a complete email address, for example name@company.com."
                );
            }
        }
    
        const isValid = emailField.checkValidity();
    
        emailField.toggleAttribute(
            "aria-invalid",
            !isValid
        );
    
        if (!isValid && showError) {
            emailField.reportValidity();
        }
    
        return isValid;
    }
    
    function validatePhoneField(showError = false) {
        if (!phoneField) {
            return true;
        }
    
        const value = phoneField.value.trim();
    
        phoneField.value = value;
        phoneField.setCustomValidity("");
    
        if (!value) {
            phoneField.setCustomValidity(
                "Please enter your phone or WhatsApp number."
            );
        } else {
            const allowedCharacters =
                /^[0-9+\-()\s]+$/;
    
            const digitCount =
                value.replace(/\D/g, "").length;
    
            const plusCount =
                (value.match(/\+/g) || []).length;
    
            const plusIsValid =
                plusCount === 0 ||
                (
                    plusCount === 1 &&
                    value.startsWith("+")
                );
    
            if (!allowedCharacters.test(value)) {
                phoneField.setCustomValidity(
                    "The phone number may contain only digits, spaces, +, brackets and hyphens."
                );
            } else if (!plusIsValid) {
                phoneField.setCustomValidity(
                    "Place the + sign only once, at the beginning of the phone number."
                );
            } else if (
                digitCount < 10 ||
                digitCount > 15
            ) {
                phoneField.setCustomValidity(
                    "Enter a phone number containing between 10 and 15 digits."
                );
            }
        }
    
        const isValid = phoneField.checkValidity();
    
        phoneField.toggleAttribute(
            "aria-invalid",
            !isValid
        );
    
        if (!isValid && showError) {
            phoneField.reportValidity();
        }
    
        return isValid;
    }
    
    function getValidationMessage(field) {
        if (field.validity.valueMissing) {
            const label = document.querySelector(
                `label[for="${CSS.escape(field.id)}"]`
            );
    
            const fieldName =
                label?.textContent
                    .replace("*", "")
                    .trim()
                    .toLowerCase() ||
                "required field";
    
            return `Please complete the ${fieldName}.`;
        }
    
        if (field.validity.typeMismatch) {
            return "Please enter the information in the correct format.";
        }
    
        if (field.validationMessage) {
            return field.validationMessage;
        }
    
        return "Please complete the highlighted field before continuing.";
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

    function normaliseSampleRequestQuantities(configuration) {
        const source =
            configuration &&
            typeof configuration === "object"
                ? { ...configuration }
                : {};

        const intent = String(
            source.project_intent || ""
        )
            .trim()
            .toLowerCase();

        if (intent !== "sample_first") {
            return source;
        }

        /*
         * Preserve the quantities originally selected in the Shop.
         * These values remain available later when Luxsome prepares
         * the customer's bulk-production quotation after sample approval.
         */
        const preserveBulkQuantity = (
            target,
            sourceKey,
            bulkKey
        ) => {
            const currentValue =
                String(target[sourceKey] || "")
                    .trim();

            if (
                currentValue &&
                !String(target[bulkKey] || "").trim()
            ) {
                target[bulkKey] = currentValue;
            }

            if (currentValue) {
                target[sourceKey] = "1";
            }
        };

        preserveBulkQuantity(
            source,
            "quantity",
            "bulk_quantity"
        );

        preserveBulkQuantity(
            source,
            "box_quantity",
            "bulk_box_quantity"
        );

        preserveBulkQuantity(
            source,
            "other_pieces_quantity",
            "bulk_other_pieces_quantity"
        );

        /*
         * Additional Bespoke brand projects follow the same rule:
         * one physical sample of each selected packaging piece while
         * retaining the planned bulk quantities for later quotation.
         */
        const additionalProjects =
            parseAdditionalProjects(
                source.additional_projects
            );

        if (additionalProjects.length) {
            source.additional_projects =
                JSON.stringify(
                    additionalProjects.map(project => {
                        const normalised = {
                            ...project
                        };

                        preserveBulkQuantity(
                            normalised,
                            "box_quantity",
                            "bulk_box_quantity"
                        );

                        preserveBulkQuantity(
                            normalised,
                            "other_pieces_quantity",
                            "bulk_other_pieces_quantity"
                        );

                        preserveBulkQuantity(
                            normalised,
                            "quantity",
                            "bulk_quantity"
                        );

                        return normalised;
                    })
                );
        }

        source.sample_quantity = "1";

        return source;
    }


    function normaliseProjectIntent(value) {
        const intent = String(value || "").trim().toLowerCase();

        if (intent === "sample_first") return "sample_first";
        if (intent === "bulk_quotation") return "bulk_quotation";

        return "";
    }

    function projectIntentLabel(intent = normaliseProjectIntent(
        shopConfiguration.project_intent
    )) {
        if (intent === "sample_first") {
            return "Physical sample first";
        }

        if (intent === "bulk_quotation") {
            return "Bulk production quotation";
        }

        return "Project request";
    }

    function configureProjectIntent(configuration) {
        const intent = normaliseProjectIntent(
            configuration.project_intent
        );

        if (projectIntentInput) {
            projectIntentInput.value = intent;
        }

        if (requestTypeInput) {
            requestTypeInput.value =
                intent === "sample_first"
                    ? "Sample Request"
                    : intent === "bulk_quotation"
                        ? "Bulk Quotation Request"
                        : "Project Request";
        }

        if (intent === "sample_first") {
            if (projectIntentEyebrow) {
                projectIntentEyebrow.textContent =
                    "COMPLETE YOUR SAMPLE REQUEST";
            }

            if (projectIntentHeroText) {
                projectIntentHeroText.textContent =
                    "Add your contact details, review the packaging system you selected and send your physical sample request to our team.";
            }

            if (submitButton) {
                submitButton.innerHTML =
                    'Submit Sample Request <span aria-hidden="true">→</span>';
            }

            if (projectConsentText) {
                projectConsentText.textContent =
                    "I agree that Luxsome Packaging may contact me about this sample request. *";
            }

            if (projectSubmissionNote) {
                projectSubmissionNote.textContent =
                    "After submission, our team will review your configuration and artwork for sample feasibility. If approved, we will send a separate quotation for producing the physical sample before bulk production.";
            }
        } else if (intent === "bulk_quotation") {
            if (projectIntentEyebrow) {
                projectIntentEyebrow.textContent =
                    "COMPLETE YOUR BULK QUOTATION REQUEST";
            }

            if (projectIntentHeroText) {
                projectIntentHeroText.textContent =
                    "Add your contact details, review the packaging system you selected and send it to our team for a bulk production quotation.";
            }

            if (submitButton) {
                submitButton.innerHTML =
                    'Request Bulk Quotation <span aria-hidden="true">→</span>';
            }

            if (projectConsentText) {
                projectConsentText.textContent =
                    "I agree that Luxsome Packaging may contact me about this bulk quotation request. *";
            }

            if (projectSubmissionNote) {
                projectSubmissionNote.textContent =
                    "After submission, our team will review your configuration and prepare the next quotation step. You may still request a physical sample before bulk production is authorised.";
            }
        }

        if (projectIntentSummary && intent) {
            projectIntentSummary.classList.add("is-visible");
            projectIntentSummary.innerHTML = `
                <span class="project-intent-summary__label">Request type</span>
                <strong>${escapeHTML(projectIntentLabel(intent))}</strong>
                <p>${
                    intent === "sample_first"
                        ? "This project will enter Luxsome’s sample review workflow before bulk production."
                        : "This project is being submitted for bulk quotation. A physical sample can still be requested before production."
                }</p>
            `;
        }
    }

    function configureProductSelectionReturnLink(configuration) {
        if (!changeProductSelections) return;

        const productPath = getProductDetailPath(configuration);
        const params = new URLSearchParams();

        Object.entries(configuration).forEach(([key, value]) => {
            if (
                value === null ||
                value === undefined ||
                String(value).trim() === "" ||
                ["version", "saved_at"].includes(key)
            ) {
                return;
            }

            params.set(key, String(value));
        });

        params.set("restore_configuration", "1");

        changeProductSelections.href =
            `${productPath}?${params.toString()}`;

        changeProductSelections.addEventListener("click", () => {
            saveStartProjectDraft();

            localStorage.setItem(
                "luxsomeShopConfiguration",
                JSON.stringify({
                    ...configuration,
                    additional_projects:
                        preserveAdditionalProjects(
                            configuration.additional_projects
                        ),
                    restore_configuration: "1"
                })
            );
        });
    }

    function saveStartProjectDraft() {
        const draft = {
            version: 1,
            saved_at: new Date().toISOString(),
            customer: {
                fullName: valueOf("fullName"),
                brandName: valueOf("brandName"),
                email: valueOf("email"),
                phone: valueOf("phone"),
                preferredContactMethod:
                    valueOf("preferredContactMethod"),
                instagram: valueOf("instagram"),
                location: valueOf("location")
            }
        };

        try {
            localStorage.setItem(
                START_PROJECT_DRAFT_KEY,
                JSON.stringify(draft)
            );
        } catch (error) {
            console.warn(
                "The customer details could not be saved.",
                error
            );
        }
    }

    function restoreStartProjectDraft() {
        let draft = null;

        try {
            draft = JSON.parse(
                localStorage.getItem(
                    START_PROJECT_DRAFT_KEY
                ) || "null"
            );
        } catch (error) {
            console.warn(
                "The saved customer details could not be restored.",
                error
            );

            return;
        }

        if (
            !draft ||
            typeof draft !== "object" ||
            !draft.customer
        ) {
            return;
        }

        const savedFields = {
            fullName: draft.customer.fullName,
            brandName: draft.customer.brandName,
            email: draft.customer.email,
            phone: draft.customer.phone,
            preferredContactMethod:
                draft.customer.preferredContactMethod,
            instagram: draft.customer.instagram,
            location: draft.customer.location
        };

        Object.entries(savedFields).forEach(
            ([fieldId, savedValue]) => {
                const field =
                    document.getElementById(fieldId);

                if (
                    field &&
                    String(savedValue || "").trim()
                ) {
                    field.value = String(savedValue);
                }
            }
        );
    }

    function preserveAdditionalProjects(value) {
        if (Array.isArray(value)) {
            return JSON.stringify(value);
        }

        if (
            value &&
            typeof value === "object"
        ) {
            return JSON.stringify(value);
        }

        const rawValue = String(value || "").trim();

        if (!rawValue) {
            return "[]";
        }

        try {
            const projects = JSON.parse(rawValue);

            return JSON.stringify(
                Array.isArray(projects)
                    ? projects
                    : []
            );
        } catch (error) {
            console.warn(
                "The additional Bespoke projects could not be preserved.",
                error
            );

            return "[]";
        }
    }

    function getProductDetailPath(configuration) {
        const product = String(
            configuration.product ||
            configuration.source_product ||
            ""
        ).trim().toLowerCase();

        const system = String(
            configuration.system ||
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
            system.includes("Custom Order")
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
            configuration.quantity
        );
    }

    function buildReview() {
        const customerRows = [
            ["Brand", valueOf("brandName")],
            ["Contact person", valueOf("fullName")],
            ["Email", valueOf("email")],
            ["Phone or WhatsApp", valueOf("phone")],
            [
                "Preferred contact",
                contactMethodLabel(
                    valueOf("preferredContactMethod")
                )
            ],
            ["Instagram", valueOf("instagram")],
            ["Location", valueOf("location")]
        ];

        const customItems =
            parseCustomItems(
                shopConfiguration.custom_items ||
                shopConfiguration.other_custom_items
            );

        const packagingRows = [
            ["Request type", projectIntentLabel()],
            ["Packaging system", labelValue("system")],
            ["Project type", labelValue("project_type")],
            ["Packaging pieces", labelValue("packaging_pieces")],
            ["Box style", labelValue("box_style")],
            ["Hang tag type", labelValue("tag_style")],
            ["Thank-you card type", labelValue("thank_you_card")],
            ["Thank-you card colour", labelValue("thank_you_card_colour")],
            ["Envelope type", labelValue("envelope_style")],
            ["Envelope colour", labelValue("envelope_colour")],
            ["Tissue / paper wrap type", labelValue("tissue_style")],
            ["Sticker seal type", labelValue("sticker_style")],
            ["Ribbon", labelValue("ribbon_style")],
            ["Ribbon colour", labelValue("ribbon_colour")],
            ["Other custom items", customItems.join(", ")]
        ];

        const isSampleRequest =
            normaliseProjectIntent(
                shopConfiguration.project_intent
            ) === "sample_first";

        const specificationRows = [
            [
                isSampleRequest
                    ? "Sample quantity"
                    : "Quantity",
                unitValue(
                    "quantity",
                    isSampleRequest
                        ? "sample"
                        : "pieces"
                )
            ],
            [
                "Planned bulk quantity",
                isSampleRequest
                    ? unitValue(
                        "bulk_quantity",
                        "pieces"
                    )
                    : ""
            ],
            ["Finished dimensions", dimensionsValue()],
            ["Measurement unit", dimensionUnitLabel()],
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

        const additionalProjects =
            parseAdditionalProjects(
                shopConfiguration.additional_projects
            );

        reviewCard.innerHTML = [
            reviewSection("Customer", customerRows),
            reviewSection("Packaging system", packagingRows),
            reviewSection("Order specifications", specificationRows),
            renderAdditionalProjectsReview(additionalProjects)
        ].join("");

        const summaryLines = [
            `Brand: ${valueOf("brandName")}`,
            `Contact: ${valueOf("fullName")} (${valueOf("email")} · ${valueOf("phone")})`,
            `Preferred contact: ${contactMethodLabel(
                valueOf("preferredContactMethod")
            )}`,
            ...packagingRows
                .filter(([, value]) => value)
                .map(([label, value]) => `${label}: ${value}`),
            ...specificationRows
                .filter(([, value]) => value)
                .map(([label, value]) => `${label}: ${value}`),
            ...additionalProjectsSummaryLines(
                additionalProjects
            )
        ];

        if (projectSummaryInput) {
            projectSummaryInput.value = summaryLines.join("\n");
        }

        if (shopConfigurationInput) {
            shopConfigurationInput.value = JSON.stringify(shopConfiguration);
        }
    }

    function contactMethodLabel(value) {
        const method = String(value || "")
            .trim()
            .toLowerCase();

        if (method === "whatsapp") return "WhatsApp";
        if (method === "email") return "Email";

        return String(value || "").trim();
    }

    function parseCustomItems(value) {
        if (Array.isArray(value)) {
            return value
                .map(item => String(item || "").trim())
                .filter(Boolean);
        }

        const raw = String(value || "").trim();
        if (!raw || raw === "[]") return [];

        try {
            const parsed = JSON.parse(raw);

            if (Array.isArray(parsed)) {
                return parsed
                    .map(item => String(item || "").trim())
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

    function parseAdditionalProjects(value) {
        if (Array.isArray(value)) {
            return value.filter(
                project =>
                    project &&
                    typeof project === "object"
            );
        }

        const rawValue = String(value || "").trim();

        if (!rawValue) return [];

        try {
            const parsed = JSON.parse(rawValue);

            return Array.isArray(parsed)
                ? parsed.filter(
                    project =>
                        project &&
                        typeof project === "object"
                )
                : [];
        } catch (error) {
            console.warn(
                "Additional Bespoke projects could not be read.",
                error
            );

            return [];
        }
    }

    function formatProjectQuantity(value, unit) {
        const quantity = String(value || "").trim();

        if (!quantity) return "";

        if (
            /piece|box|unit/i.test(quantity)
        ) {
            return quantity;
        }

        return `${quantity} ${unit}`;
    }

    function renderAdditionalProjectsReview(projects) {
        if (!projects.length) return "";

        const cards = projects.map(
            (project, index) => {
                const pieces = Array.isArray(
                    project.packaging_pieces
                )
                    ? project.packaging_pieces
                        .map(item => String(item).trim())
                        .filter(Boolean)
                        .join(", ")
                    : String(
                        project.packaging_pieces || ""
                    ).trim();

                const hasBox = Array.isArray(
                    project.packaging_pieces
                )
                    ? project.packaging_pieces.includes(
                        "Rigid box"
                    )
                    : pieces
                        .split(",")
                        .map(item => item.trim())
                        .includes("Rigid box");

                const hasOtherPieces = Array.isArray(
                    project.packaging_pieces
                )
                    ? project.packaging_pieces.some(
                        piece => piece !== "Rigid box"
                    )
                    : pieces
                        .split(",")
                        .map(item => item.trim())
                        .filter(Boolean)
                        .some(
                            piece => piece !== "Rigid box"
                        );

                const rows = [
                    ["Brand", project.brand_name],
                    ["Packaging pieces", pieces],
                    [
                        "Box style",
                        hasBox
                            ? project.box_style
                            : ""
                    ],
                    [
                        "Box quantity",
                        hasBox
                            ? formatProjectQuantity(
                                project.box_quantity,
                                "boxes"
                            )
                            : ""
                    ],
                    [
                        "Other packaging quantity",
                        hasOtherPieces
                            ? formatProjectQuantity(
                                project.other_pieces_quantity,
                                "pieces"
                            )
                            : ""
                    ],
                    [
                        "Box colour",
                        hasBox ? project.primary_colour : ""
                    ],
                    [
                        "Logo finish",
                        hasBox ? project.logo_finish : ""
                    ],
                    [
                        "Box accessories",
                        hasBox
                            ? (
                                Array.isArray(project.accessories)
                                    ? project.accessories.join(", ")
                                    : project.accessories
                            )
                            : ""
                    ],
                    ["Hang tag type", project.tag_style],
                    ["Thank-you card type", project.thank_you_card],
                    ["Thank-you card colour", project.thank_you_card_colour],
                    ["Envelope type", project.envelope_style],
                    ["Envelope colour", project.envelope_colour],
                    ["Tissue / paper wrap type", project.tissue_style],
                    ["Sticker seal type", project.sticker_style],
                    ["Ribbon colour", project.ribbon_colour],
                    ["Notes", project.notes]
                ];

                return reviewSection(
                    `Additional project ${index + 1}`,
                    rows
                );
            }
        );

        return `
            <section class="review-additional-projects">
                <div class="review-additional-projects__heading">
                    <span>Multiple brands</span>
                    <h3>Additional Bespoke projects</h3>
                    <p>
                        Each project below will be reviewed and quoted
                        separately.
                    </p>
                </div>

                ${cards.join("")}
            </section>
        `;
    }

    function additionalProjectsSummaryLines(projects) {
        if (!projects.length) return [];

        return projects.flatMap(
            (project, index) => {
                const pieces = Array.isArray(
                    project.packaging_pieces
                )
                    ? project.packaging_pieces.join(", ")
                    : String(
                        project.packaging_pieces || ""
                    ).trim();

                const hasBox = Array.isArray(
                    project.packaging_pieces
                )
                    ? project.packaging_pieces.includes(
                        "Rigid box"
                    )
                    : pieces
                        .split(",")
                        .map(item => item.trim())
                        .includes("Rigid box");

                const hasOtherPieces = Array.isArray(
                    project.packaging_pieces
                )
                    ? project.packaging_pieces.some(
                        piece => piece !== "Rigid box"
                    )
                    : pieces
                        .split(",")
                        .map(item => item.trim())
                        .filter(Boolean)
                        .some(
                            piece => piece !== "Rigid box"
                        );

                return [
                    "",
                    `Additional project ${index + 1}`,
                    `Brand: ${
                        project.brand_name ||
                        "Not supplied"
                    }`,
                    `Packaging pieces: ${
                        pieces ||
                        "Not supplied"
                    }`,
                    hasBox
                        ? `Box style: ${
                            project.box_style ||
                            "Not supplied"
                        }`
                        : "",
                    hasBox
                        ? `Box quantity: ${
                            formatProjectQuantity(
                                project.box_quantity,
                                "boxes"
                            ) ||
                            "Not supplied"
                        }`
                        : "",
                    hasOtherPieces
                        ? `Other packaging quantity: ${
                            formatProjectQuantity(
                                project.other_pieces_quantity,
                                "pieces"
                            ) ||
                            "Not supplied"
                        }`
                        : "",
                    hasBox && project.primary_colour
                        ? `Box colour: ${project.primary_colour}`
                        : "",
                    hasBox && project.logo_finish
                        ? `Logo finish: ${project.logo_finish}`
                        : "",
                    hasBox && project.accessories
                        ? `Box accessories: ${
                            Array.isArray(project.accessories)
                                ? project.accessories.join(", ")
                                : project.accessories
                        }`
                        : "",
                    project.tag_style
                        ? `Hang tag type: ${project.tag_style}`
                        : "",
                    project.thank_you_card
                        ? `Thank-you card type: ${project.thank_you_card}`
                        : "",
                    project.thank_you_card_colour
                        ? `Thank-you card colour: ${project.thank_you_card_colour}`
                        : "",
                    project.envelope_style
                        ? `Envelope type: ${project.envelope_style}`
                        : "",
                    project.envelope_colour
                        ? `Envelope colour: ${project.envelope_colour}`
                        : "",
                    project.tissue_style
                        ? `Tissue / paper wrap type: ${project.tissue_style}`
                        : "",
                    project.sticker_style
                        ? `Sticker seal type: ${project.sticker_style}`
                        : "",
                    project.ribbon_colour
                        ? `Ribbon colour: ${project.ribbon_colour}`
                        : "",
                    project.notes
                        ? `Notes: ${project.notes}`
                        : ""
                ].filter(Boolean);
            }
        );
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
            const intent = normaliseProjectIntent(
                shopConfiguration.project_intent
            );
            const subjectPrefix =
                intent === "sample_first"
                    ? "New Sample Request"
                    : intent === "bulk_quotation"
                        ? "New Bulk Quotation Request"
                        : "New Shop Project";

            formSubject.value =
                `${subjectPrefix} | ${projectReference} | ${brandName}`;
        }

        if (projectIntentInput) {
            projectIntentInput.value = normaliseProjectIntent(
                shopConfiguration.project_intent
            );
        }

        if (requestTypeInput) {
            requestTypeInput.value = projectIntentLabel();
        }

        if (submittedPackagingSystem) {
            submittedPackagingSystem.value = system;
        }

        if (submittedComponents) {
            submittedComponents.value =
                labelValue("packaging_pieces") || "According to selected tier";
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

    function saveProjectConfirmation(data) {
        if (!data || typeof data !== "object") return;

        const serialized = JSON.stringify(data);
        const reference = String(data.reference || "").trim();

        /*
         * localStorage and sessionStorage are tied to the exact
         * hostname. We save there first for normal same-origin use.
         */
        for (const store of [localStorage, sessionStorage]) {
            try {
                store.setItem(
                    "luxsomeProjectConfirmation",
                    serialized
                );

                if (reference) {
                    store.setItem(
                        `luxsomeProjectConfirmation:${reference}`,
                        serialized
                    );
                }
            } catch (error) {
                console.warn(
                    "Unable to save project confirmation.",
                    error
                );
            }
        }

        /*
         * window.name survives a same-tab redirect even when the
         * site redirects between the apex and www hostnames.
         */
        try {
            window.name = JSON.stringify({
                type: "luxsomeProjectConfirmation",
                reference,
                payload: data
            });
        } catch (error) {
            console.warn(
                "Unable to save the redirect confirmation fallback.",
                error
            );
        }
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
                preferredContact:
                    valueOf("preferredContactMethod") ||
                    valueOf("preferred_contact_method"),
                instagram: valueOf("instagram"),
                location: valueOf("location")
            },
            project: {
                source: "Luxsome shop",
                intent: normaliseProjectIntent(
                    shopConfiguration.project_intent
                ),
                requestType: projectIntentLabel(),
                packagingSystem: labelValue("system"),
                additionalProjects:
                    parseAdditionalProjects(
                        shopConfiguration.additional_projects
                    ),
                configuration: shopConfiguration
            }
        };
    }

    function dimensionsValue() {
        /*
         * Prefer the exact values and unit selected by the customer on the
         * product page. The hidden centimetre values remain only as a
         * fallback for older saved configurations.
         */
        const selectedUnit = labelValue("dimension_unit")
            .toLowerCase();

        const unit =
            selectedUnit === "cm" || selectedUnit === "in"
                ? selectedUnit
                : "cm";

        const length =
            labelValue("box_length") ||
            labelValue("box_length_cm");

        const breadth =
            labelValue("box_breadth") ||
            labelValue("box_breadth_cm");

        const height =
            labelValue("box_height") ||
            labelValue("box_height_cm");

        if (!length && !breadth && !height) {
            return "";
        }

        const unitLabel = unit === "in"
            ? "inches"
            : "cm";

        return `${length || "—"} × ${breadth || "—"} × ${height || "—"} ${unitLabel}`;
    }

    function dimensionUnitLabel() {
        const unit = labelValue("dimension_unit").toLowerCase();

        if (unit === "in") {
            return "Inches";
        }

        if (unit === "cm") {
            return "Centimetres";
        }

        /*
         * Older saved configurations used only converted centimetre values
         * and did not include a dimension_unit field.
         */
        if (
            labelValue("box_length_cm") ||
            labelValue("box_breadth_cm") ||
            labelValue("box_height_cm")
        ) {
            return "Centimetres";
        }

        return "";
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