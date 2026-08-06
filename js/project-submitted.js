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


    const referenceFromUrl =
        new URLSearchParams(
            window.location.search
        ).get("reference");

    /*
     * Recover the exact submitted brief using its project reference.
     */
    const confirmationData =
        readConfirmationData(referenceFromUrl);

    const reference =
        confirmationData?.reference ||
        referenceFromUrl ||
        "Reference unavailable";

    renderReference(reference);

    try {
        renderProjectSummary(confirmationData);
    } catch (error) {
        console.error(
            "Unable to render the submitted project summary.",
            error,
            confirmationData
        );

        showNotification(
            "Your project was received, but the summary could not be displayed."
        );
    }
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

    function readConfirmationData(referenceNumber) {
        const reference = String(
            referenceNumber || ""
        ).trim();

        const keys = [
            reference
                ? `luxsomeProjectConfirmation:${reference}`
                : "",
            "luxsomeProjectConfirmation"
        ].filter(Boolean);

        for (const store of [
            window.sessionStorage,
            window.localStorage
        ]) {
            for (const key of keys) {
                try {
                    const stored = store.getItem(key);
                    if (!stored) continue;

                    const parsed = JSON.parse(stored);

                    if (
                        !parsed ||
                        typeof parsed !== "object"
                    ) {
                        continue;
                    }

                    if (
                        reference &&
                        parsed.reference &&
                        String(parsed.reference) !== reference
                    ) {
                        continue;
                    }

                    return parsed;
                } catch (error) {
                    console.warn(
                        "Unable to read the submitted project.",
                        error
                    );
                }
            }
        }

        return null;
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

        const configuration = normaliseConfiguration(
            project.configuration ||
            data?.shopConfiguration ||
            {}
        );

        const systemValue = clean(
            project.packagingSystem ||
            configuration.system ||
            configuration.packaging_system ||
            configuration.product ||
            configuration.product_slug
        );

        const isBespoke = isBespokeSystem(
            systemValue,
            configuration
        );

        setText("summaryBrand", customer.brandName);
        setText("summaryName", customer.fullName);
        setText("summaryEmail", customer.email);
        setText("summaryPhone", customer.phone);

        setText(
            "summaryContact",
            contactMethodLabel(
                customer.preferredContact ||
                project.preferredContact ||
                configuration.preferred_contact_method
            )
        );

        setText("summaryLocation", customer.location);

        setOptionalText(
            "summaryInstagramRow",
            "summaryInstagram",
            customer.instagram
        );

        setText(
            "summarySystem",
            systemValue
        );

        /*
         * These rows belong only to the Bespoke configurator.
         * They are hidden explicitly for every preset tier, even when
         * stale values remain in localStorage from an earlier project.
         */
        const packagingPieces = splitList(
            configuration.packaging_pieces
        );

        setOptionalText(
            "summaryProjectTypeRow",
            "summaryProjectType",
            isBespoke
                ? configuration.project_type
                : ""
        );

        setOptionalText(
            "summaryPiecesRow",
            "summaryPieces",
            isBespoke
                ? packagingPieces.join(", ")
                : ""
        );

        setOptionalText(
            "summaryBoxQuantityRow",
            "summaryBoxQuantity",
            isBespoke
                ? formatQuantity(configuration.box_quantity)
                : ""
        );

        setOptionalText(
            "summaryOtherQuantityRow",
            "summaryOtherQuantity",
            isBespoke
                ? formatQuantity(
                    configuration.other_pieces_quantity
                )
                : ""
        );

        setOptionalText(
            "summaryBoxStyleRow",
            "summaryBoxStyle",
            configuration.box_style
        );

        /*
         * Preset tiers always use the standard quantity.
         * Bespoke projects may use separate box and other-piece quantities.
         */
        const standardQuantity = isBespoke
            ? (
                clean(configuration.box_quantity) ||
                clean(configuration.other_pieces_quantity)
                    ? ""
                    : formatQuantity(configuration.quantity)
            )
            : formatQuantity(configuration.quantity);

        setOptionalText(
            "summaryQuantityRow",
            "summaryQuantity",
            standardQuantity
        );

        setOptionalText(
            "summaryDimensionsRow",
            "summaryDimensions",
            dimensionsValue(configuration)
        );

        setOptionalText(
            "summaryWeightRow",
            "summaryWeight",
            unitValue(
                configuration.volumetric_weight_kg ||
                configuration.volumetric_weight,
                "kg"
            )
        );

        setOptionalText(
            "summaryColoursRow",
            "summaryColours",
            coloursValue(configuration)
        );

        setOptionalText(
            "summaryLogoFinishRow",
            "summaryLogoFinish",
            configuration.logo_finish
        );

        setOptionalText(
            "summaryArtworkRow",
            "summaryArtwork",
            configuration.artwork_status
        );

        setOptionalText(
            "summaryAccessoriesRow",
            "summaryAccessories",
            configuration.accessories
        );

        setOptionalText(
            "summaryCommentsRow",
            "summaryComments",
            configuration.comments
        );

        renderSelectedDetails(configuration);

        renderAdditionalProjects(
            parseAdditionalProjects(
                configuration.additional_projects
            )
        );
    }

    function isBespokeSystem(systemValue, configuration) {
        const candidates = [
            systemValue,
            configuration.system,
            configuration.packaging_system,
            configuration.project_type,
            configuration.product,
            configuration.product_slug,
            configuration.route,
            configuration.page
        ]
            .map(value => clean(value).toLowerCase())
            .filter(Boolean);

        return candidates.some(value => (
            value === "bespoke" ||
            value.includes("bespoke packaging") ||
            value.includes("/shop/bespoke") ||
            value.includes("shop/bespoke")
        ));
    }

    function normaliseConfiguration(value) {
        if (!value) return {};

        if (typeof value === "object") {
            return value;
        }

        try {
            const parsed = JSON.parse(value);

            return parsed && typeof parsed === "object"
                ? parsed
                : {};
        } catch (_) {
            return {};
        }
    }

    function clean(value) {
        return String(value ?? "").trim();
    }

    function contactMethodLabel(value) {
        const method = clean(value).toLowerCase();

        if (method === "whatsapp") return "WhatsApp";
        if (method === "email") return "Email";

        return clean(value);
    }

    function formatQuantity(value) {
        const quantity = clean(value);

        if (!quantity) return "";

        if (
            /pieces|boxes|other/i.test(quantity)
        ) {
            return quantity;
        }

        return `${quantity} pieces`;
    }

    function unitValue(value, unit) {
        const rawValue = clean(value);

        if (!rawValue) return "";

        return rawValue.toLowerCase().endsWith(
            unit.toLowerCase()
        )
            ? rawValue
            : `${rawValue} ${unit}`;
    }

    function dimensionsValue(configuration) {
        const length = firstValue(
            configuration.finished_length,
            configuration.box_length_cm,
            configuration.box_length,
            configuration.length
        );

        const breadth = firstValue(
            configuration.finished_breadth,
            configuration.finished_width,
            configuration.box_breadth_cm,
            configuration.box_breadth,
            configuration.width,
            configuration.breadth
        );

        const height = firstValue(
            configuration.finished_height,
            configuration.box_height_cm,
            configuration.box_height,
            configuration.height
        );

        if (!length || !breadth || !height) {
            return "";
        }

        const unit = firstValue(
            configuration.dimension_unit,
            configuration.dimensions_unit,
            "cm"
        );

        return [
            stripDimensionUnit(length),
            stripDimensionUnit(breadth),
            stripDimensionUnit(height)
        ].join(" × ") + ` ${unit}`;
    }

    function firstValue(...values) {
        return values
            .map(clean)
            .find(Boolean) || "";
    }

    function stripDimensionUnit(value) {
        return clean(value)
            .replace(
                /\s*(millimetres?|millimeters?|centimetres?|centimeters?|mm|cm)\s*$/i,
                ""
            )
            .trim();
    }

    function coloursValue(configuration) {
        const colours = [
            configuration.primary_colour,
            configuration.custom_colour,
            configuration.secondary_colour,
            configuration.accent_colour,
            configuration.pantone_reference
        ]
            .map(clean)
            .filter(Boolean);

        return [...new Set(colours)].join(", ");
    }

    function splitList(value) {
        if (Array.isArray(value)) {
            return value.map(clean).filter(Boolean);
        }

        return clean(value)
            .split(",")
            .map(clean)
            .filter(Boolean);
    }

    function setText(elementId, value) {
        const element =
            document.getElementById(elementId);

        if (!element) {
            return;
        }

        const displayValue = clean(value);

        element.textContent =
            displayValue || "—";
    }

    function setOptionalText(
        rowId,
        elementId,
        value
    ) {
        const row = document.getElementById(rowId);
        const element = document.getElementById(
            elementId
        );

        const displayValue = clean(value);

        if (!row || !element) return;

        const shouldShow = Boolean(displayValue);

        row.hidden = !shouldShow;
        row.setAttribute(
            "aria-hidden",
            String(!shouldShow)
        );

        /*
         * Some existing page CSS assigns display:grid directly to
         * .project-summary-row. Explicitly setting display prevents that
         * rule from overriding the HTML hidden attribute.
         */
        row.style.display = shouldShow
            ? ""
            : "none";

        if (shouldShow) {
            element.textContent = displayValue;
        } else {
            element.textContent = "—";
        }
    }

    function renderSelectedDetails(configuration) {
        if (
            !componentsSection ||
            !componentsList
        ) {
            return;
        }

        const rows = [
            ["Hang tag", configuration.tag_style],
            [
                "Thank-you card",
                configuration.thank_you_card
            ],
            [
                "Sticker seal",
                configuration.sticker_style
            ],
            ["Tissue", configuration.tissue_style],
            ["Envelope", configuration.envelope_style],
            ["Ribbon", configuration.ribbon_style],
            [
                "Ribbon colour",
                configuration.ribbon_colour
            ]
        ].filter(([, value]) => clean(value));

        componentsList.replaceChildren();

        if (!rows.length) {
            componentsSection.hidden = true;
            return;
        }

        componentsSection.hidden = false;

        rows.forEach(([label, value]) => {
            const item = document.createElement("li");
            item.textContent = `${label}: ${clean(value)}`;
            componentsList.appendChild(item);
        });
    }

    function parseAdditionalProjects(value) {
        if (Array.isArray(value)) return value;

        const rawValue = clean(value);

        if (!rawValue) return [];

        try {
            const parsed = JSON.parse(rawValue);
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return [];
        }
    }

    function renderAdditionalProjects(projects) {
        const section = document.getElementById(
            "additionalProjectsSection"
        );
        const list = document.getElementById(
            "additionalProjectsList"
        );

        if (!section || !list) return;

        list.replaceChildren();

        const validProjects = projects.filter(
            project =>
                project &&
                typeof project === "object"
        );

        if (!validProjects.length) {
            section.hidden = true;
            return;
        }

        section.hidden = false;

        validProjects.forEach((project, index) => {
            const card = document.createElement("article");
            card.className =
                "project-submitted-additional-project";

            const heading = document.createElement("strong");
            heading.textContent =
                project.brand_name ||
                `Additional project ${index + 1}`;

            const detailList = document.createElement("ul");

            const details = [
                [
                    "Packaging pieces",
                    Array.isArray(project.packaging_pieces)
                        ? project.packaging_pieces.join(", ")
                        : project.packaging_pieces
                ],
                ["Box style", project.box_style],
                [
                    "Box quantity",
                    formatQuantity(project.box_quantity)
                ],
                [
                    "Other packaging quantity",
                    formatQuantity(
                        project.other_pieces_quantity
                    )
                ],
                ["Notes", project.notes]
            ].filter(([, value]) => clean(value));

            details.forEach(([label, value]) => {
                const item = document.createElement("li");
                item.textContent =
                    `${label}: ${clean(value)}`;
                detailList.appendChild(item);
            });

            card.append(heading, detailList);
            list.appendChild(card);
        });
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