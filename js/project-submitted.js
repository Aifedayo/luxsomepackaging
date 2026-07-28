document.addEventListener("DOMContentLoaded", () => {
    const STORAGE_KEY =
        "luxsomeProjectConfirmation";

    const whatsappNumber = "2349068804133";

    const projectReference =
        document.getElementById("projectReference");

    const copyReferenceButton =
        document.getElementById("copyReferenceButton");

    const copyReferenceText =
        document.getElementById("copyReferenceText");

    const whatsappButton =
        document.getElementById("whatsappButton");

    const componentsSection =
        document.getElementById(
            "recommendedComponents"
        );

    const componentsList =
        document.getElementById("componentsList");

    const downloadSummaryButton =
        document.getElementById(
            "downloadSummaryButton"
        );

    const notification =
        document.getElementById(
            "confirmationNotification"
        );

    const confirmationParticles =
        document.getElementById(
            "confirmationParticles"
        );

    const currentYear =
        document.getElementById("currentYear");


    /*
     * Read the project that was saved by start-project.js.
     */
    const confirmationData =
        readConfirmationData();


    /*
     * Use saved data when available.
     *
     * A fallback reference is generated when someone opens
     * the confirmation URL directly.
     */
    const referenceFromUrl =
        new URLSearchParams(
            window.location.search
        ).get("reference");

    const reference =
        confirmationData?.reference ||
        referenceFromUrl ||
        "Reference unavailable";

    renderReference(reference);
    renderProjectSummary(confirmationData);
    configureWhatsApp(reference, confirmationData);
    configureCopyButton(reference);
    configureDownloadButton();

    if (currentYear) {
        currentYear.textContent =
            String(new Date().getFullYear());
    }

    if (!prefersReducedMotion()) {
        createGoldParticles();
    }


    /* =====================================================
       STORAGE
    ====================================================== */

    function readConfirmationData() {
        try {
            const stored = localStorage.getItem(
                STORAGE_KEY
            );

            if (!stored) {
                return null;
            }

            const parsed = JSON.parse(stored);

            if (
                !parsed ||
                typeof parsed !== "object"
            ) {
                return null;
            }

            return parsed;
        } catch (error) {
            console.warn(
                "Unable to read the submitted project.",
                error
            );

            return null;
        }
    }


    /* =====================================================
       REFERENCE
    ====================================================== */

    function renderReference(referenceNumber) {
        if (!projectReference) {
            return;
        }

        projectReference.textContent =
            referenceNumber;
    }

    function generateProjectReference() {
        const date = new Date();

        const year = date.getFullYear();

        const month = String(
            date.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            date.getDate()
        ).padStart(2, "0");

        const randomCode = String(
            Math.floor(1000 + Math.random() * 9000)
        );

        return `LX-${year}${month}${day}-${randomCode}`;
    }


    /* =====================================================
       SUMMARY
    ====================================================== */

    function renderProjectSummary(data) {
        const customer = data?.customer || {};
        const project = data?.project || {};

        setText(
            "summaryBrand",
            customer.brandName
        );

        setText(
            "summaryName",
            customer.fullName
        );

        setText(
            "summarySystem",
            project.packagingSystem
        );

        setText(
            "summaryQuantity",
            project.quantity
        );

        setText(
            "summaryDate",
            project.requiredDate
        );

        setText(
            "summaryProduct",
            project.productType
        );

        setText(
            "summaryInvestment",
            project.investmentLevel
        );

        setText(
            "summaryContact",
            project.preferredContact
        );

        const components =
            Array.isArray(project.components)
                ? project.components.filter(Boolean)
                : [];

        renderComponents(components);
    }

    function renderComponents(components) {
        if (
            !componentsSection ||
            !componentsList
        ) {
            return;
        }

        componentsList.replaceChildren();

        if (components.length === 0) {
            componentsSection.hidden = true;
            return;
        }

        componentsSection.hidden = false;

        components.forEach((component) => {
            const listItem =
                document.createElement("li");

            listItem.textContent = component;

            componentsList.appendChild(listItem);
        });
    }

    function setText(elementId, value) {
        const element =
            document.getElementById(elementId);

        if (!element) {
            return;
        }

        element.textContent =
            value && String(value).trim()
                ? String(value).trim()
                : "To be confirmed";
    }


    /* =====================================================
       COPY PROJECT REFERENCE
    ====================================================== */

    function configureCopyButton(referenceNumber) {
        copyReferenceButton?.addEventListener(
            "click",
            async () => {
                try {
                    await navigator.clipboard.writeText(
                        referenceNumber
                    );

                    copyReferenceText.textContent =
                        "Reference copied";

                    showNotification(
                        "Your project reference has been copied."
                    );

                    window.setTimeout(() => {
                        copyReferenceText.textContent =
                            "Copy reference";
                    }, 2500);
                } catch (error) {
                    fallbackCopy(referenceNumber);
                }
            }
        );
    }

    function fallbackCopy(value) {
        const temporaryInput =
            document.createElement("textarea");

        temporaryInput.value = value;
        temporaryInput.setAttribute(
            "readonly",
            ""
        );

        temporaryInput.style.position =
            "fixed";

        temporaryInput.style.opacity =
            "0";

        document.body.appendChild(
            temporaryInput
        );

        temporaryInput.select();

        try {
            document.execCommand("copy");

            copyReferenceText.textContent =
                "Reference copied";

            showNotification(
                "Your project reference has been copied."
            );
        } catch (error) {
            showNotification(
                `Project reference: ${value}`
            );
        }

        temporaryInput.remove();

        window.setTimeout(() => {
            copyReferenceText.textContent =
                "Copy reference";
        }, 2500);
    }


    /* =====================================================
       WHATSAPP
    ====================================================== */

    function configureWhatsApp(
        referenceNumber,
        data
    ) {
        if (!whatsappButton) {
            return;
        }

        const brandName =
            data?.customer?.brandName || "";

        const message = [
            "Hello Luxsome Packaging,",
            "",
            "I recently submitted a packaging project.",
            "",
            `Project reference: ${referenceNumber}`,
            brandName
                ? `Brand: ${brandName}`
                : "",
            "",
            "I would like to discuss the next steps."
        ]
            .filter(Boolean)
            .join("\n");

        whatsappButton.href =
            `https://wa.me/${whatsappNumber}` +
            `?text=${encodeURIComponent(message)}`;
    }


    /* =====================================================
       DOWNLOAD PLACEHOLDER
    ====================================================== */

    function configureDownloadButton() {
        downloadSummaryButton?.addEventListener(
            "click",
            () => {
                showNotification(
                    "Your downloadable project summary will be added in the next phase."
                );
            }
        );
    }


    /* =====================================================
       PARTICLES
    ====================================================== */

    function createGoldParticles() {
        if (!confirmationParticles) {
            return;
        }

        const particleCount = 34;

        for (
            let index = 0;
            index < particleCount;
            index += 1
        ) {
            const particle =
                document.createElement("span");

            particle.className =
                "confirmation-particle";

            particle.style.left =
                `${Math.random() * 100}%`;

            particle.style.animationDelay =
                `${Math.random() * 0.55}s`;

            particle.style.animationDuration =
                `${1.35 + Math.random() * 0.8}s`;

            particle.style.setProperty(
                "--particle-drift",
                `${-60 + Math.random() * 120}px`
            );

            const size =
                2 + Math.random() * 3;

            particle.style.width =
                `${size}px`;

            particle.style.height =
                `${size * 2.2}px`;

            confirmationParticles.appendChild(
                particle
            );
        }

        window.setTimeout(() => {
            confirmationParticles.replaceChildren();
        }, 3000);
    }


    /* =====================================================
       NOTIFICATION
    ====================================================== */

    let notificationTimeout;

    function showNotification(message) {
        if (!notification) {
            return;
        }

        window.clearTimeout(
            notificationTimeout
        );

        notification.textContent = message;

        notification.classList.add(
            "is-visible"
        );

        notificationTimeout =
            window.setTimeout(() => {
                notification.classList.remove(
                    "is-visible"
                );
            }, 3500);
    }


    /* =====================================================
       ACCESSIBILITY
    ====================================================== */

    function prefersReducedMotion() {
        return window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;
    }
});