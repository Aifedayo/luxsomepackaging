"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("packaging-form");
    const steps = [...document.querySelectorAll(".builder-step")];

    const progressContainer = document.getElementById("builder-progress");
    const navigation = document.getElementById("builder-navigation");

    const progressTrack = document.querySelector(
        ".builder-progress__track"
    );

    const progressLabel = document.getElementById("progress-label");
    const progressPercentage = document.getElementById(
        "progress-percentage"
    );
    const progressValue = document.getElementById("progress-value");

    const nextButton = document.querySelector('[data-action="next"]');
    const backButton = document.querySelector('[data-action="back"]');
    const startButton = document.querySelector('[data-action="start"]');
    const restartButton = document.querySelector('[data-action="restart"]');

    const approachInputs = document.querySelectorAll(
        'input[name="approach"]'
    );

    const pieceSelector = document.getElementById("piece-selector");

    const experienceInputs = [
        ...document.querySelectorAll('input[name="experience"]')
    ];

    const experienceCount = document.getElementById("experience-count");

    const whatsappButton = document.getElementById("whatsapp-button");

    const totalQuestionSteps = 7;
    let currentStep = 0;

    /*
     * Replace this number with the Luxsome WhatsApp number.
     * Use the international format without +, spaces or dashes.
     *
     * Nigeria example:
     * 2348012345678
     */
    const whatsappNumber = "2349068804133";

    const errorIds = {
        1: "product-error",
        2: "stage-error",
        3: "quantity-error",
        4: "experience-error",
        5: "approach-error",
        6: "investment-error",
        7: "timeline-error"
    };

    const tierPieces = {
        Essential: [
            "Branded hang tags",
            "Thank-you card",
            "Sticker seal"
        ],

        Signature: [
            "Rigid presentation box",
            "Branded hang tags",
            "Thank-you card",
            "Branded tissue",
            "Sticker seal"
        ],

        Complete: [
            "Rigid presentation box",
            "Branded hang tags",
            "Thank-you card and envelope",
            "Branded tissue",
            "Sticker seal",
            "Ribbon or shopping bag"
        ],

        Bespoke: [
            "Custom box structure",
            "Coordinated branded stationery",
            "Custom wrapping elements",
            "Specialised finishing",
            "Additional pieces based on the project"
        ]
    };

    const productBoxRecommendations = {
        Womenswear: "Magnetic flap or collapsible rigid box",
        Menswear: "Shoulder box or magnetic flap box",
        "Modest fashion and hijabs":
            "Magnetic flap or tray-in-bed presentation box",
        Shoes: "Shoulder box or reinforced rigid box",
        Bags: "Magnetic flap or shoulder presentation box",
        "Jewellery and accessories":
            "Compact shoulder box or tray-in-bed box",
        "Beauty and cosmetics":
            "Tray-in-bed or compartmented rigid box",
        "Gift items": "Magnetic flap or door-style presentation box",
        Other: "Custom rigid box selected after consultation"
    };

    function getSelectedValue(name) {
        const input = form.querySelector(
            `input[name="${name}"]:checked`
        );

        return input ? input.value : "";
    }

    function getSelectedValues(name) {
        return [
            ...form.querySelectorAll(
                `input[name="${name}"]:checked`
            )
        ].map((input) => input.value);
    }

    function clearError(stepNumber) {
        const errorId = errorIds[stepNumber];

        if (!errorId) {
            return;
        }

        const errorElement = document.getElementById(errorId);

        if (errorElement) {
            errorElement.textContent = "";
        }
    }

    function showError(stepNumber, message) {
        const errorId = errorIds[stepNumber];

        if (!errorId) {
            return;
        }

        const errorElement = document.getElementById(errorId);

        if (errorElement) {
            errorElement.textContent = message;
        }
    }

    function validateStep(stepNumber) {
        clearError(stepNumber);

        switch (stepNumber) {
            case 1:
                if (!getSelectedValue("product")) {
                    showError(
                        stepNumber,
                        "Please select the product category closest to your brand."
                    );
                    return false;
                }
                break;

            case 2:
                if (!getSelectedValue("stage")) {
                    showError(
                        stepNumber,
                        "Please select your current brand stage."
                    );
                    return false;
                }
                break;

            case 3:
                if (!getSelectedValue("quantity")) {
                    showError(
                        stepNumber,
                        "Please select an estimated quantity."
                    );
                    return false;
                }
                break;

            case 4:
                if (getSelectedValues("experience").length === 0) {
                    showError(
                        stepNumber,
                        "Please select at least one quality for your customer experience."
                    );
                    return false;
                }
                break;

            case 5: {
                const approach = getSelectedValue("approach");

                if (!approach) {
                    showError(
                        stepNumber,
                        "Please choose how you would like to build your system."
                    );
                    return false;
                }

                if (
                    approach === "choose" &&
                    getSelectedValues("pieces").length === 0
                ) {
                    showError(
                        stepNumber,
                        "Please select at least one packaging piece."
                    );
                    return false;
                }

                break;
            }

            case 6:
                if (!getSelectedValue("investment")) {
                    showError(
                        stepNumber,
                        "Please choose the packaging level that feels right."
                    );
                    return false;
                }
                break;

            case 7:
                if (!getSelectedValue("timeline")) {
                    showError(
                        stepNumber,
                        "Please select your preferred timeline."
                    );
                    return false;
                }
                break;

            default:
                break;
        }

        return true;
    }

    function updateProgress() {
        if (currentStep < 1 || currentStep > totalQuestionSteps) {
            progressContainer.hidden = true;
            return;
        }

        progressContainer.hidden = false;

        const percentage = Math.round(
            (currentStep / totalQuestionSteps) * 100
        );

        progressLabel.textContent =
            `Step ${currentStep} of ${totalQuestionSteps}`;

        progressPercentage.textContent = `${percentage}%`;
        progressValue.style.width = `${percentage}%`;

        progressTrack.setAttribute(
            "aria-valuenow",
            String(currentStep)
        );
    }

    function showStep(stepNumber) {
        currentStep = stepNumber;

        steps.forEach((step) => {
            const isCurrent =
                Number(step.dataset.step) === stepNumber;

            step.classList.toggle("is-active", isCurrent);
            step.hidden = !isCurrent;
        });

        const isWelcome = stepNumber === 0;
        const isResult = stepNumber === 8;

        navigation.hidden = isWelcome || isResult;

        if (!isWelcome && !isResult) {
            backButton.hidden = false;

            nextButton.innerHTML =
                stepNumber === totalQuestionSteps
                    ? 'View recommendation <span aria-hidden="true">→</span>'
                    : 'Continue <span aria-hidden="true">→</span>';
        }

        updateProgress();

        const activeStep = steps.find(
            (step) => Number(step.dataset.step) === stepNumber
        );

        const heading = activeStep?.querySelector(
            "legend, h1, h2"
        );

        window.requestAnimationFrame(() => {
            activeStep?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });

            if (heading) {
                heading.setAttribute("tabindex", "-1");
                heading.focus({ preventScroll: true });
            }
        });
    }

    function calculateRecommendedTier(data) {
        let score = 0;

        const stageScores = {
            "Just starting": 0,
            Growing: 1,
            Established: 2,
            Luxury: 3
        };

        const quantityScores = {
            "25–50 units": 0,
            "51–100 units": 1,
            "101–250 units": 2,
            "More than 250 units": 3
        };

        score += stageScores[data.stage] ?? 0;
        score += quantityScores[data.quantity] ?? 0;

        if (
            data.experience.includes("Luxurious") ||
            data.experience.includes("Gift-worthy")
        ) {
            score += 2;
        }

        if (
            data.experience.includes("Premium") ||
            data.experience.includes("Memorable")
        ) {
            score += 1;
        }

        if (data.investment === "Bespoke") {
            return "Bespoke";
        }

        if (data.investment === "Complete") {
            return "Complete";
        }

        if (data.investment === "Signature") {
            return score >= 7 ? "Complete" : "Signature";
        }

        if (score >= 8) {
            return "Complete";
        }

        if (score >= 3) {
            return "Signature";
        }

        return "Essential";
    }

    function buildRecommendedPieces(data, tier) {
        if (data.approach === "choose") {
            return data.pieces;
        }

        const pieces = [...tierPieces[tier]];

        if (
            ["Signature", "Complete", "Bespoke"].includes(tier)
        ) {
            pieces[0] =
                productBoxRecommendations[data.product] ||
                pieces[0];
        }

        if (
            data.product === "Jewellery and accessories" &&
            !pieces.some((piece) =>
                piece.toLowerCase().includes("insert")
            )
        ) {
            pieces.push("Protective product insert");
        }

        if (
            data.product === "Beauty and cosmetics" &&
            !pieces.some((piece) =>
                piece.toLowerCase().includes("insert")
            )
        ) {
            pieces.push("Structured product insert");
        }

        return [...new Set(pieces)];
    }

    function buildExplanation(data, tier, pieces) {
        const experienceText =
            data.experience.length === 1
                ? data.experience[0].toLowerCase()
                : `${data.experience
                    .slice(0, -1)
                    .join(", ")
                    .toLowerCase()} and ${data.experience
                    .at(-1)
                    .toLowerCase()}`;

        const pieceText =
            pieces.length > 1
                ? `${pieces[0]} supported by coordinated branded details`
                : pieces[0];

        return (
            `Based on your ${data.product.toLowerCase()} brand, ` +
            `your ${data.quantity.toLowerCase()} requirement and the ` +
            `${experienceText} experience you want to create, the ` +
            `${tier} level offers a suitable starting point. ` +
            `${pieceText} can help present your products as one cohesive ` +
            `brand experience rather than a collection of unrelated pieces.`
        );
    }

    function collectFormData() {
        return {
            product: getSelectedValue("product"),
            stage: getSelectedValue("stage"),
            quantity: getSelectedValue("quantity"),
            experience: getSelectedValues("experience"),
            approach: getSelectedValue("approach"),
            pieces: getSelectedValues("pieces"),
            investment: getSelectedValue("investment"),
            timeline: getSelectedValue("timeline")
        };
    }

    function createWhatsAppMessage(data, tier, pieces) {
        return [
            "Hello Luxsome,",
            "",
            "I completed the Packaging System Builder.",
            "",
            `Product: ${data.product}`,
            `Brand stage: ${data.stage}`,
            `Quantity: ${data.quantity}`,
            `Desired experience: ${data.experience.join(", ")}`,
            `Preferred level: ${data.investment}`,
            `Recommended level: ${tier}`,
            `Timeline: ${data.timeline}`,
            "",
            "Packaging pieces:",
            ...pieces.map((piece) => `• ${piece}`),
            "",
            "I would like to discuss this packaging system and the next steps."
        ].join("\n");
    }

    function renderResult() {
        const data = collectFormData();
        const recommendedTier = calculateRecommendedTier(data);
        const recommendedPieces = buildRecommendedPieces(
            data,
            recommendedTier
        );

        document.getElementById("result-tier").textContent =
            recommendedTier;

        document.getElementById("result-product").textContent =
            data.product;

        document.getElementById("result-stage").textContent =
            data.stage;

        document.getElementById("result-quantity").textContent =
            data.quantity;

        document.getElementById("result-timeline").textContent =
            data.timeline;

        document.getElementById(
            "result-introduction"
        ).textContent =
            `A considered starting point for your ${data.product.toLowerCase()} brand.`;

        document.getElementById(
            "result-explanation"
        ).textContent = buildExplanation(
            data,
            recommendedTier,
            recommendedPieces
        );

        const piecesList = document.getElementById("result-pieces");
        piecesList.replaceChildren();

        recommendedPieces.forEach((piece) => {
            const listItem = document.createElement("li");
            listItem.textContent = piece;
            piecesList.appendChild(listItem);
        });

        const message = createWhatsAppMessage(
            data,
            recommendedTier,
            recommendedPieces
        );

        whatsappButton.href =
            `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
    }

    function moveNext() {
        if (!validateStep(currentStep)) {
            const errorId = errorIds[currentStep];

            document.getElementById(errorId)?.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

            return;
        }

        if (currentStep === totalQuestionSteps) {
            renderResult();
            showStep(8);
            return;
        }

        showStep(currentStep + 1);
    }

    function moveBack() {
        if (currentStep > 1) {
            showStep(currentStep - 1);
        } else {
            showStep(0);
        }
    }

    function restartBuilder() {
        form.reset();
        pieceSelector.hidden = true;
        experienceCount.textContent = "0";

        Object.values(errorIds).forEach((errorId) => {
            const errorElement = document.getElementById(errorId);

            if (errorElement) {
                errorElement.textContent = "";
            }
        });

        showStep(0);
    }

    experienceInputs.forEach((input) => {
        input.addEventListener("change", (event) => {
            const selected = getSelectedValues("experience");

            if (selected.length > 3) {
                event.currentTarget.checked = false;

                showError(
                    4,
                    "You can select up to three experience qualities."
                );
            } else {
                clearError(4);
            }

            experienceCount.textContent = String(
                getSelectedValues("experience").length
            );
        });
    });

    approachInputs.forEach((input) => {
        input.addEventListener("change", () => {
            const shouldChoosePieces =
                getSelectedValue("approach") === "choose";

            pieceSelector.hidden = !shouldChoosePieces;
            clearError(5);
        });
    });

    form.addEventListener("change", (event) => {
        const fieldset = event.target.closest("[data-step]");

        if (!fieldset) {
            return;
        }

        clearError(Number(fieldset.dataset.step));
    });

    startButton.addEventListener("click", () => {
        showStep(1);
    });

    nextButton.addEventListener("click", moveNext);
    backButton.addEventListener("click", moveBack);
    restartButton.addEventListener("click", restartBuilder);

    const currentYearElement =
        document.getElementById("currentYear") ||
        document.getElementById("current-year");

    if (currentYearElement) {
        currentYearElement.textContent = String(new Date().getFullYear());
    }

    showStep(0);

    const startProjectButton = document.getElementById(
        "start-project-button"
    );

    if (startProjectButton) {
        startProjectButton.addEventListener("click", () => {
            const data = collectFormData();
            const recommendedTier = calculateRecommendedTier(data);
            const recommendedPieces = buildRecommendedPieces(
                data,
                recommendedTier
            );
            const explanation = buildExplanation(
                data,
                recommendedTier,
                recommendedPieces
            );

            const recommendation = {
                version: 1,
                source: "Packaging Builder",
                savedAt: new Date().toISOString(),

                recommendationDetails: {
                    title: `${recommendedTier} Packaging System`,
                    tier: recommendedTier,
                    description: explanation,
                    components: recommendedPieces
                },

                answers: {
                    productType: data.product,
                    brandStage: data.stage,
                    quantity: data.quantity,
                    desiredExperience: data.experience,
                    approach: data.approach,
                    selectedPieces: data.pieces,
                    investmentLevel: data.investment,
                    timeline: data.timeline
                }
            };

            try {
                localStorage.setItem(
                    "luxsomePackagingBuilderResult",
                    JSON.stringify(recommendation)
                );

                window.location.assign(
                    "/start-project/?source=builder"
                );
            } catch (error) {
                console.error(
                    "Unable to save the packaging recommendation:",
                    error
                );

                const fallbackTier = encodeURIComponent(
                    recommendation.recommendationDetails.title
                );

                window.location.assign(
                    `/start-project/?source=builder&tier=${fallbackTier}`
                );
            }
        });
    } else {
        console.warn(
            'The button with id="start-project-button" was not found.'
        );
    }

});

