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
    const requiredDate = document.getElementById("requiredDate");
    const bespokePanel = document.getElementById("bespokePanel");
    const builderHandoff = document.getElementById("builderHandoff");
    const builderChoice = document.getElementById("builderChoice");
    const dismissBuilderHandoff = document.getElementById("dismissBuilderHandoff");
    const builderRecommendationInput = document.getElementById("builderRecommendationInput");
    const builderSource = document.getElementById("builderSource");

    let currentStep = 1;
    const totalSteps = steps.length;
    const builderData = readBuilderData();

    setMinimumDate();
    applyBuilderData(builderData);
    updateStepUI(false);

    nextButton?.addEventListener("click", () => {
        clearStatus();
        if (!validateStep(currentStep)) return;
        if (currentStep < totalSteps) {
            currentStep += 1;
            if (currentStep === totalSteps) buildReview();
            updateStepUI();
        }
    });

    backButton?.addEventListener("click", () => {
        clearStatus();
        if (currentStep > 1) {
            currentStep -= 1;
            updateStepUI();
        }
    });

    form.addEventListener("change", (event) => {
        const target = event.target;
        if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement)) return;
        target.removeAttribute("aria-invalid");
        if (target.matches('[name="package_type"]')) updateBespokePanel(target.value);
    });

    dismissBuilderHandoff?.addEventListener("click", () => {
        dismissBuilderHandoff.disabled = true;
        dismissBuilderHandoff.textContent =
            "Opening Packaging Builder…";
    
        window.location.href =
            "/packaging-builder/?adjust=true";
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearStatus();
        if (!validateStep(totalSteps)) return;

        buildReview();
        const original = submitButton.innerHTML;
        submitButton.disabled = true;
        submitButton.setAttribute("aria-busy", "true");
        submitButton.innerHTML = '<span class="spinner" aria-hidden="true"></span><span>Sending brief...</span>';

        try {
            const response = await fetch(form.action, {
                method: "POST",
                body: new FormData(form),
                headers: { Accept: "application/json" }
            });

            if (!response.ok) {
                let message = "Something went wrong. Please check your details and try again.";
                try {
                    const data = await response.json();
                    if (Array.isArray(data.errors) && data.errors.length) {
                        message = data.errors.map(item => item.message).filter(Boolean).join(" ");
                    }
                } catch (_) {}
                throw new Error(message);
            }

            try {
                localStorage.removeItem("luxsomePackagingBuilderResult");
                localStorage.removeItem("luxsomePackagingBuilderAnswers");
            } catch (_) {}

            window.location.href = "/start-project/project-submitted/";
        } catch (error) {
            showStatus(error.message || "Unable to send your project brief. Please check your connection and try again.", "error");
            submitButton.disabled = false;
            submitButton.removeAttribute("aria-busy");
            submitButton.innerHTML = original;
        }
    });

    function updateStepUI(shouldScroll = true) {
        const isFirstStep = currentStep === 1;
        const isReviewStep = currentStep === totalSteps;
    
        steps.forEach((step, index) => {
            const stepNumber = index + 1;
            const active = stepNumber === currentStep;
    
            step.hidden = !active;
            step.classList.toggle("is-active", active);
        });
    
        progressItems.forEach((item, index) => {
            const stepNumber = index + 1;
    
            item.classList.toggle(
                "is-active",
                stepNumber === currentStep
            );
    
            item.classList.toggle(
                "is-complete",
                stepNumber < currentStep
            );
    
            if (stepNumber === currentStep) {
                item.setAttribute("aria-current", "step");
            } else {
                item.removeAttribute("aria-current");
            }
        });
    
        /*
         * Step 1:
         * Hide the Back button.
         *
         * Steps 2–4:
         * Show the Back button.
         */
        backButton.hidden = isFirstStep;
    
        /*
         * Hide Continue completely on the Review step.
         */
        nextButton.hidden = isReviewStep;
        nextButton.disabled = isReviewStep;
        nextButton.setAttribute(
            "aria-hidden",
            String(isReviewStep)
        );
    
        /*
         * Only show the Submit button on the Review step.
         */
        submitButton.hidden = !isReviewStep;
    
        mobileStepText.textContent =
            `Step ${currentStep} of ${totalSteps}`;
    
        mobileProgressFill.style.width =
            `${(currentStep / totalSteps) * 100}%`;
    
        if (shouldScroll) {
            document
                .querySelector(".project-form-shell")
                ?.scrollIntoView({
                    behavior: prefersReducedMotion()
                        ? "auto"
                        : "smooth",
                    block: "start"
                });
        }
    
        const activeStep = steps[currentStep - 1];
    
        window.setTimeout(() => {
            const firstFocusableElement =
                activeStep?.querySelector(
                    "input, select, textarea, button"
                );
    
            firstFocusableElement?.focus({
                preventScroll: true
            });
        }, prefersReducedMotion() ? 0 : 350);
    }

    function validateStep(stepNumber) {
        const step = steps[stepNumber - 1];
        if (!step) return false;

        const requiredFields = Array.from(step.querySelectorAll("[required]"));
        for (const field of requiredFields) {
            if (!field.checkValidity()) {
                field.setAttribute("aria-invalid", "true");
                showStatus("Please complete the highlighted required field before continuing.", "error");
                field.reportValidity();
                field.focus();
                return false;
            }
        }

        if (stepNumber === 2) {
            const selectedPackage = form.querySelector('[name="package_type"]:checked');
            if (!selectedPackage) {
                showStatus("Please choose a packaging system or select ‘Guide me’.", "error");
                form.querySelector('[name="package_type"]')?.focus();
                return false;
            }
            if (selectedPackage.value === "Bespoke Packaging System") {
                const hasBox = form.querySelector('[name="box_style"]:checked');
                const hasComponent = form.querySelector('[name="components[]"]:checked');
                if (!hasBox && !hasComponent) {
                    showStatus("For a bespoke system, choose at least one box style or supporting piece.", "error");
                    bespokePanel.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "center" });
                    return false;
                }
            }
        }

        if (stepNumber === 3 && !form.querySelector('[name="desired_experience[]"]:checked')) {
            showStatus("Please choose at least one feeling you want the packaging to create.", "error");
            form.querySelector('[name="desired_experience[]"]')?.focus();
            return false;
        }

        return true;
    }

    function updateBespokePanel(value) {
        const show = value === "Bespoke Packaging System";
        bespokePanel.hidden = !show;
        bespokePanel.querySelectorAll("input, select, textarea").forEach(input => {
            input.disabled = !show;
            if (!show && input instanceof HTMLInputElement) input.checked = false;
        });
    }

    function buildReview() {
        const values = {
            brand: valueOf("brandName"),
            name: valueOf("fullName"),
            contact: [valueOf("email"), valueOf("phone")].filter(Boolean).join(" · "),
            location: valueOf("location"),
            category: selectedText("productCategory"),
            stage: selectedText("brandStage"),
            system: checkedValue("package_type"),
            box: checkedValue("box_style"),
            components: checkedValues("components[]"),
            quantity: selectedText("quantity"),
            date: formatDate(valueOf("requiredDate")),
            product: valueOf("productType"),
            dimensions: valueOf("dimensions"),
            investment: selectedText("budget"),
            artwork: selectedText("artworkStatus"),
            experience: checkedValues("desired_experience[]"),
            contactMethod: selectedText("preferredContact"),
            notes: valueOf("projectNotes")
        };

        reviewCard.innerHTML = [
            reviewSection("Brand", [
                ["Brand", values.brand], ["Contact person", values.name], ["Contact", values.contact], ["Location", values.location], ["Category", values.category], ["Brand stage", values.stage]
            ]),
            reviewSection("Packaging", [
                ["Starting system", values.system], ["Box style", values.box || "To be confirmed"], ["Supporting pieces", values.components || "Included according to selected tier"]
            ]),
            reviewSection("Project", [
                ["Quantity", values.quantity], ["Required date", values.date], ["Product", values.product], ["Dimensions", values.dimensions || "To be confirmed"], ["Investment level", values.investment], ["Artwork", values.artwork], ["Desired experience", values.experience], ["Preferred contact", values.contactMethod], ["Notes", values.notes || "None supplied"]
            ])
        ].join("");

        projectSummaryInput.value = [
            `Brand: ${values.brand}`,
            `Contact: ${values.name} (${values.contact})`,
            `System: ${values.system}`,
            `Box: ${values.box || "To be confirmed"}`,
            `Components: ${values.components || "According to selected tier"}`,
            `Quantity: ${values.quantity}`,
            `Product: ${values.product}`,
            `Required date: ${values.date}`,
            `Experience: ${values.experience}`
        ].join("\n");
    }

    function reviewSection(title, rows) {
        const validRows = rows.filter(([, value]) => value);
        return `<section class="review-section"><h3>${escapeHTML(title)}</h3><dl class="review-list">${validRows.map(([label, value]) => `<div class="review-row"><dt>${escapeHTML(label)}</dt><dd>${escapeHTML(value)}</dd></div>`).join("")}</dl></section>`;
    }

    function readBuilderData() {
        const params = new URLSearchParams(window.location.search);
        const source = params.get("source");
        const tierFromUrl = params.get("tier") || params.get("recommendation");
        let stored = null;

        try {
            stored = JSON.parse(
                localStorage.getItem("luxsomePackagingBuilderResult") || "null"
            );
        } catch (error) {
            console.warn("The saved Packaging Builder result could not be read.", error);
        }

        const isBuilderVisit = source === "builder" || Boolean(tierFromUrl) || Boolean(stored);
        if (!isBuilderVisit) return null;

        // Ignore an expired saved recommendation. Builder results remain valid for 7 days.
        if (stored?.savedAt) {
            const age = Date.now() - new Date(stored.savedAt).getTime();
            const sevenDays = 7 * 24 * 60 * 60 * 1000;

            if (Number.isFinite(age) && age > sevenDays) {
                localStorage.removeItem("luxsomePackagingBuilderResult");
                stored = null;
            }
        }

        const recommendation = stored?.recommendationDetails || stored?.recommendation || {};
        const answers = stored?.answers || {};

        const title =
            tierFromUrl ||
            recommendation.title ||
            stored?.title ||
            stored?.tier ||
            (typeof stored?.recommendation === "string" ? stored.recommendation : "") ||
            "Your recommended packaging system";

        const description =
            recommendation.description ||
            recommendation.reason ||
            stored?.description ||
            stored?.summary ||
            "Continue with the recommendation created from your Packaging Builder answers. You can still adjust any detail in this brief.";

        const rawComponents =
            recommendation.components ||
            recommendation.pieces ||
            stored?.components ||
            stored?.pieces ||
            [];

        const components = Array.isArray(rawComponents)
            ? rawComponents
                .map(item => typeof item === "string" ? item : item?.name || item?.label)
                .filter(Boolean)
            : [];

        return {
            title,
            description,
            components,
            answers,
            builderId: stored?.builderId || "",
            savedAt: stored?.savedAt || ""
        };
    }

    function applyBuilderData(data) {
        if (!data) return;
        builderHandoff.hidden = false;
        builderChoice.hidden = false;
        builderSource.value = "Packaging Builder";
        builderRecommendationInput.value = [data.title, ...data.components].filter(Boolean).join(" — ");
        document.getElementById("builderRecommendationTitle").textContent = data.title;
        document.getElementById("builderRecommendationText").textContent = data.description;
        document.getElementById("builderChoiceTitle").textContent = `Use ${data.title}`;
        document.getElementById("builderChoiceDescription").textContent = data.components.length ? `Recommended pieces: ${data.components.join(", ")}.` : data.description;
        const builderRadio = builderChoice.querySelector('input[type="radio"]');
        builderRadio.checked = true;

        prefillFromBuilderAnswers(data.answers);
    }

    function prefillFromBuilderAnswers(answers = {}) {
        if (!answers || typeof answers !== "object") return;

        const fieldMap = {
            quantity: "quantity",
            orderQuantity: "quantity",
            timeline: "requiredDate",
            requiredDate: "requiredDate",
            productType: "productType",
            product: "productType",
            investment: "investmentLevel",
            investmentLevel: "investmentLevel",
            experience: "desiredExperience",
            desiredExperience: "desiredExperience"
        };

        Object.entries(fieldMap).forEach(([answerKey, fieldId]) => {
            const value = answers[answerKey];
            const field = document.getElementById(fieldId);

            if (!value || !field || field.value) return;

            if (field instanceof HTMLSelectElement) {
                const matchingOption = Array.from(field.options).find(option =>
                    option.value.toLowerCase() === String(value).toLowerCase() ||
                    option.textContent.trim().toLowerCase() === String(value).toLowerCase()
                );

                if (matchingOption) field.value = matchingOption.value;
            } else {
                field.value = String(value);
            }
        });
    }

    function setMinimumDate() {
        if (!requiredDate) return;
        const today = new Date();
        const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split("T")[0];
        requiredDate.min = local;
    }

    function valueOf(id) { return document.getElementById(id)?.value.trim() || ""; }
    function selectedText(id) { const select = document.getElementById(id); return select?.selectedOptions?.[0]?.value ? select.selectedOptions[0].textContent.trim() : ""; }
    function checkedValue(name) { return form.querySelector(`[name="${CSS.escape(name)}"]:checked`)?.value || ""; }
    function checkedValues(name) { return Array.from(form.querySelectorAll(`[name="${CSS.escape(name)}"]:checked`)).map(input => input.value).join(", "); }
    function formatDate(value) { if (!value) return ""; const date = new Date(`${value}T00:00:00`); return new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "long", year: "numeric" }).format(date); }
    function escapeHTML(value) { return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]); }
    function showStatus(message, type = "") { formStatus.textContent = message; formStatus.className = `form-status${type ? ` is-${type}` : ""}`; }
    function clearStatus() { showStatus(""); form.querySelectorAll('[aria-invalid="true"]').forEach(el => el.removeAttribute("aria-invalid")); }
    function prefersReducedMotion() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
});
