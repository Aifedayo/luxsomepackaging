"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("packaging-form");
    const steps = [...document.querySelectorAll(".builder-step")];

    if (!form || !steps.length) return;

    const progressContainer = document.getElementById("builder-progress");
    const navigation = document.getElementById("builder-navigation");
    const progressTrack = document.querySelector(".builder-progress__track");
    const progressLabel = document.getElementById("progress-label");
    const progressPercentage = document.getElementById("progress-percentage");
    const progressValue = document.getElementById("progress-value");
    const nextButton = document.querySelector('[data-action="next"]');
    const backButton = document.querySelector('[data-action="back"]');
    const startButton = document.querySelector('[data-action="start"]');
    const restartButton = document.querySelector('[data-action="restart"]');
    const startProjectButton = document.getElementById("start-project-button");
    const whatsappButton = document.getElementById("whatsapp-button");
    const experienceInputs = [
        ...document.querySelectorAll('input[name="experience"]')
    ];
    const experienceCount = document.getElementById("experience-count");

    const totalQuestionSteps = 4;
    const resultStep = 5;
    const whatsappNumber = "2349068804133";

    let currentStep = 0;
    let latestRecommendation = null;

    const errorIds = {
        1: "product-error",
        2: "stage-error",
        3: "quantity-error",
        4: "experience-error"
    };

    const productProfiles = {
        Womenswear: {
            direction: "A polished fashion system",
            box: "Magnetic flap or collapsible rigid box",
            base: [
                "Rigid presentation box",
                "Branded tissue",
                "One-piece hang tag",
                "Thank-you card",
                "Sticker seal"
            ],
            boosts: {
                "Branded ribbon": 2,
                "Thank-you card and envelope": 1,
                "Shopping bag": 1
            }
        },
        Menswear: {
            direction: "A structured menswear system",
            box: "Shoulder box or magnetic flap box",
            base: [
                "Structured rigid presentation box",
                "Branded tissue",
                "One-piece hang tag",
                "Thank-you card",
                "Sticker seal"
            ],
            boosts: {
                "Product description or care card": 2,
                "Branded ribbon": 1,
                "Shopping bag": 1
            }
        },
        "Modest fashion and hijabs": {
            direction: "A layered modest-fashion system",
            box: "Magnetic flap or tray-in-bed presentation box",
            base: [
                "Rigid presentation box",
                "Branded tissue",
                "One-piece hang tag",
                "Thank-you card and envelope",
                "Sticker seal"
            ],
            boosts: {
                "Branded ribbon": 2,
                "Product care card": 1,
                "Shopping bag": 1
            }
        },
        Shoes: {
            direction: "A protective footwear system",
            box: "Reinforced shoulder box or rigid shoe box",
            base: [
                "Reinforced rigid box",
                "Branded tissue",
                "Product care card",
                "Sticker seal"
            ],
            boosts: {
                "Branded ribbon": 1,
                "Shopping bag": 2,
                "Thank-you card": 1
            }
        },
        Bags: {
            direction: "A protective accessories system",
            box: "Magnetic flap or shoulder presentation box",
            base: [
                "Rigid presentation box",
                "Branded tissue",
                "One-piece hang tag",
                "Product care card",
                "Sticker seal"
            ],
            boosts: {
                "Branded ribbon": 2,
                "Shopping bag": 2,
                "Thank-you card and envelope": 1
            }
        },
        "Gift items": {
            direction: "A gift-ready presentation system",
            box: "Magnetic flap, shoulder or tray-in-bed gift box",
            base: [
                "Rigid gift presentation box",
                "Branded tissue",
                "Thank-you card and envelope",
                "Sticker seal",
                "Protective product insert"
            ],
            boosts: {
                "Branded ribbon": 3,
                "Shopping bag": 2,
                "Product description card": 1
            }
        }
    };

    const stageRules = {
        "Just starting": {
            targetCount: 4,
            score: 0,
            note: "keeps the system focused on the strongest essentials"
        },
        Growing: {
            targetCount: 5,
            score: 1,
            note: "adds consistency across the main unboxing touchpoints"
        },
        Established: {
            targetCount: 6,
            score: 2,
            note: "supports a more complete and recognisable brand presentation"
        },
        Luxury: {
            targetCount: 7,
            score: 3,
            note: "creates a fuller, more layered premium experience"
        }
    };

    const quantityRules = {
        "25–50 units": { score: 0, targetAdjustment: 0 },
        "51–100 units": { score: 1, targetAdjustment: 0 },
        "101–250 units": { score: 2, targetAdjustment: 1 },
        "More than 250 units": { score: 3, targetAdjustment: 1 }
    };

    const experiencePieceScores = {
        Premium: {
            "Branded ribbon": 2,
            "Thank-you card and envelope": 1,
            "Product description card": 1
        },
        Elegant: {
            "Branded ribbon": 2,
            "Thank-you card and envelope": 2,
            "Branded tissue": 1
        },
        Memorable: {
            "Shopping bag": 2,
            "Product description card": 2,
            "Branded ribbon": 1
        },
        "Gift-worthy": {
            "Thank-you card and envelope": 3,
            "Branded ribbon": 2,
            "Shopping bag": 1
        },
        Luxurious: {
            "Branded ribbon": 3,
            "Protective product insert": 2,
            "Thank-you card and envelope": 2,
            "Shopping bag": 1
        },
        Minimal: {
            "One-piece hang tag": 2,
            "Thank-you card": 2,
            "Sticker seal": 1
        }
    };

    const systemRoutes = {
        Foundation: "/shop/tier-1/",
        Signature: "/shop/tier-2/",
        Prestige: "/shop/tier-3/"
    };

    function getSelectedValue(name) {
        return form.querySelector(`input[name="${name}"]:checked`)?.value || "";
    }

    function getSelectedValues(name) {
        return [
            ...form.querySelectorAll(`input[name="${name}"]:checked`)
        ].map(input => input.value);
    }

    function clearError(stepNumber) {
        const errorElement = document.getElementById(errorIds[stepNumber]);
        if (errorElement) errorElement.textContent = "";
    }

    function showError(stepNumber, message) {
        const errorElement = document.getElementById(errorIds[stepNumber]);
        if (errorElement) errorElement.textContent = message;
    }

    function validateStep(stepNumber) {
        clearError(stepNumber);

        if (stepNumber === 1) {
            const product = getSelectedValue("product");

            if (!product) {
                showError(1, "Please select a supported fashion category.");
                return false;
            }

            if (!productProfiles[product]) {
                console.error(
                    `Unsupported product value: "${product}".`,
                    Object.keys(productProfiles)
                );
                showError(
                    1,
                    "This category is not currently supported. Please choose another option."
                );
                return false;
            }

            return true;
        }

        if (stepNumber === 2) {
            const stage = getSelectedValue("stage");

            if (!stage || !stageRules[stage]) {
                showError(2, "Please select your current brand stage.");
                return false;
            }

            return true;
        }

        if (stepNumber === 3) {
            const quantity = getSelectedValue("quantity");

            if (!quantity || !quantityRules[quantity]) {
                showError(3, "Please select an estimated quantity.");
                return false;
            }

            return true;
        }

        if (stepNumber === 4) {
            const selected = getSelectedValues("experience");

            if (!selected.length) {
                showError(
                    4,
                    "Please select at least one quality for your customer experience."
                );
                return false;
            }

            if (selected.length > 3) {
                showError(4, "You can select up to three experience qualities.");
                return false;
            }

            return true;
        }

        return true;
    }

    function updateProgress() {
        if (
            !progressContainer ||
            !progressTrack ||
            !progressLabel ||
            !progressPercentage ||
            !progressValue
        ) {
            return;
        }

        if (currentStep < 1 || currentStep > totalQuestionSteps) {
            progressContainer.hidden = true;
            return;
        }

        const percentage = Math.round(
            (currentStep / totalQuestionSteps) * 100
        );

        progressContainer.hidden = false;
        progressLabel.textContent =
            `Step ${currentStep} of ${totalQuestionSteps}`;
        progressPercentage.textContent = `${percentage}%`;
        progressValue.style.width = `${percentage}%`;
        progressTrack.setAttribute("aria-valuenow", String(currentStep));
        progressTrack.setAttribute("aria-valuemax", String(totalQuestionSteps));
    }

    function showStep(stepNumber) {
        const activeStep = steps.find(
            step => Number(step.dataset.step) === stepNumber
        );

        if (!activeStep) {
            console.error(`Builder step ${stepNumber} was not found.`);
            return;
        }

        currentStep = stepNumber;

        steps.forEach(step => {
            const active = Number(step.dataset.step) === stepNumber;
            step.classList.toggle("is-active", active);
            step.hidden = !active;
        });

        const isWelcome = stepNumber === 0;
        const isResult = stepNumber === resultStep;

        if (navigation) {
            navigation.hidden = isWelcome || isResult;
        }

        if (!isWelcome && !isResult && nextButton) {
            nextButton.innerHTML =
                stepNumber === totalQuestionSteps
                    ? 'See my recommendation <span aria-hidden="true">→</span>'
                    : 'Continue <span aria-hidden="true">→</span>';
        }

        updateProgress();

        const heading = activeStep.querySelector("legend, h1, h2");

        requestAnimationFrame(() => {
            activeStep.scrollIntoView({
                behavior: prefersReducedMotion() ? "auto" : "smooth",
                block: "start"
            });

            if (heading) {
                heading.setAttribute("tabindex", "-1");
                heading.focus({ preventScroll: true });
            }
        });
    }

    function addScore(scoreMap, piece, score) {
        scoreMap.set(piece, (scoreMap.get(piece) || 0) + score);
    }

    function calculateRecommendation(data) {
        const profile = productProfiles[data.product];
        const stage = stageRules[data.stage];
        const quantity = quantityRules[data.quantity];

        if (!profile) {
            throw new Error(
                `No product profile was found for "${data.product}".`
            );
        }

        if (!stage) {
            throw new Error(
                `No stage rule was found for "${data.stage}".`
            );
        }

        if (!quantity) {
            throw new Error(
                `No quantity rule was found for "${data.quantity}".`
            );
        }

        const scores = new Map();

        profile.base.forEach((piece, index) => {
            addScore(scores, piece, 12 - index);
        });

        Object.entries(profile.boosts).forEach(([piece, score]) => {
            addScore(scores, piece, score);
        });

        data.experience.forEach(quality => {
            Object.entries(experiencePieceScores[quality] || {})
                .forEach(([piece, score]) => addScore(scores, piece, score));
        });

        if (["Established", "Luxury"].includes(data.stage)) {
            addScore(scores, "Thank-you card and envelope", 2);
            addScore(scores, "Branded ribbon", 2);
        }

        if (data.stage === "Luxury") {
            addScore(scores, "Shopping bag", 2);
            addScore(scores, "Product description card", 1);
        }

        if (data.quantity === "More than 250 units") {
            addScore(scores, "Sticker seal", 2);
            addScore(scores, "One-piece hang tag", 1);
        }

        const targetCount = Math.min(
            7,
            Math.max(4, stage.targetCount + quantity.targetAdjustment)
        );

        const pieces = [...scores.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, targetCount)
            .map(([piece]) => piece);

        const boxIndex = pieces.findIndex(
            piece => piece.toLowerCase().includes("box")
        );

        if (boxIndex === -1) {
            pieces.unshift(profile.box);
        } else {
            pieces[boxIndex] = profile.box;
        }

        const maturityScore =
            stage.score +
            quantity.score +
            data.experience.reduce((total, quality) => {
                if (["Luxurious", "Gift-worthy"].includes(quality)) {
                    return total + 2;
                }

                if (["Premium", "Memorable", "Elegant"].includes(quality)) {
                    return total + 1;
                }

                return total;
            }, 0);

        const internalSystem =
            maturityScore >= 7
                ? "Prestige"
                : maturityScore >= 3
                    ? "Signature"
                    : "Foundation";

        const confidence = Math.min(
            96,
            74 + (data.experience.length * 5) + stage.score
        );

        return {
            direction: profile.direction,
            boxRecommendation: profile.box,
            pieces: [...new Set(pieces)].slice(0, targetCount),
            internalSystem,
            shopUrl: systemRoutes[internalSystem],
            confidence,
            explanation:
                `Your ${data.product.toLowerCase()} category calls for ` +
                `${profile.box.toLowerCase()}. Because your brand is ` +
                `${data.stage.toLowerCase()} and you want the experience to feel ` +
                `${formatList(data.experience).toLowerCase()}, this combination ` +
                `${stage.note}. The recommendation prioritises pieces that work ` +
                `together as one system rather than adding items simply to increase ` +
                `the package size.`
        };
    }

    function collectFormData() {
        return {
            product: getSelectedValue("product"),
            stage: getSelectedValue("stage"),
            quantity: getSelectedValue("quantity"),
            experience: getSelectedValues("experience")
        };
    }

    function formatList(items) {
        if (!items.length) return "";
        if (items.length === 1) return items[0];
        if (items.length === 2) return `${items[0]} and ${items[1]}`;
        return `${items.slice(0, -1).join(", ")}, and ${items.at(-1)}`;
    }

    function createWhatsAppMessage(data, recommendation) {
        return [
            "Hello Luxsome,",
            "",
            "I completed the Packaging Recommendation Builder.",
            "",
            `Product: ${data.product}`,
            `Brand stage: ${data.stage}`,
            `Quantity: ${data.quantity}`,
            `Desired experience: ${data.experience.join(", ")}`,
            "",
            `Match score: ${recommendation.confidence}%`,
            `Recommended direction: ${recommendation.direction}`,
            `Suggested box: ${recommendation.boxRecommendation}`,
            "",
            "Recommended packaging pieces:",
            ...recommendation.pieces.map(piece => `• ${piece}`),
            "",
            "I would like to refine this recommendation with Luxsome."
        ].join("\n");
    }

    function setText(id, value) {
        const element = document.getElementById(id);

        if (!element) {
            console.warn(`Missing result element: #${id}`);
            return;
        }

        element.textContent = value;
    }

    function renderResult() {
        const data = collectFormData();

        try {
            const recommendation = calculateRecommendation(data);

            if (!recommendation || !recommendation.direction) {
                throw new Error(
                    "The recommendation engine returned an invalid result."
                );
            }

            latestRecommendation = { data, ...recommendation };

            setText("result-tier", recommendation.direction);
            setText("result-match-score", `${recommendation.confidence}%`);
            setText("result-product", data.product);
            setText("result-stage", data.stage);
            setText("result-quantity", data.quantity);
            setText(
                "result-introduction",
                `${recommendation.confidence}% match based on your answers.`
            );
            setText("result-explanation", recommendation.explanation);

            const piecesList = document.getElementById("result-pieces");

            if (piecesList) {
                piecesList.replaceChildren();

                recommendation.pieces.forEach(piece => {
                    const item = document.createElement("li");
                    item.textContent = piece;
                    piecesList.appendChild(item);
                });
            }

            if (whatsappButton) {
                whatsappButton.href =
                    `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                        createWhatsAppMessage(data, recommendation)
                    )}`;
            }

            return true;
        } catch (error) {
            console.error("Unable to generate recommendation:", error);

            showError(
                4,
                "We could not generate your recommendation. Please review your answers and try again."
            );

            return false;
        }
    }

    function moveNext() {
        if (!validateStep(currentStep)) {
            document.getElementById(errorIds[currentStep])?.scrollIntoView({
                behavior: prefersReducedMotion() ? "auto" : "smooth",
                block: "center"
            });
            return;
        }

        if (currentStep === totalQuestionSteps) {
            if (renderResult()) {
                showStep(resultStep);
            }
            return;
        }

        showStep(currentStep + 1);
    }

    function moveBack() {
        showStep(currentStep > 1 ? currentStep - 1 : 0);
    }

    function restartBuilder() {
        form.reset();

        if (experienceCount) {
            experienceCount.textContent = "0";
        }

        latestRecommendation = null;

        Object.values(errorIds).forEach(errorId => {
            const element = document.getElementById(errorId);
            if (element) element.textContent = "";
        });

        showStep(0);
    }

    experienceInputs.forEach(input => {
        input.addEventListener("change", event => {
            const selected = getSelectedValues("experience");

            if (selected.length > 3) {
                event.currentTarget.checked = false;
                showError(4, "You can select up to three experience qualities.");
            } else {
                clearError(4);
            }

            if (experienceCount) {
                experienceCount.textContent =
                    String(getSelectedValues("experience").length);
            }
        });
    });

    form.addEventListener("change", event => {
        const step = event.target.closest("[data-step]");
        if (step) clearError(Number(step.dataset.step));
    });

    document.querySelectorAll(".option-card--coming-soon").forEach(card => {
        card.addEventListener("click", event => {
            event.preventDefault();
        });
    });

    startButton?.addEventListener("click", () => showStep(1));
    nextButton?.addEventListener("click", moveNext);
    backButton?.addEventListener("click", moveBack);
    restartButton?.addEventListener("click", restartBuilder);

    startProjectButton?.addEventListener("click", () => {
        if (!latestRecommendation && !renderResult()) {
            return;
        }

        const recommendation = {
            version: 3,
            source: "Packaging Recommendation Builder",
            savedAt: new Date().toISOString(),
            recommendationDetails: {
                title: latestRecommendation.direction,
                tier: latestRecommendation.internalSystem,
                description: latestRecommendation.explanation,
                components: latestRecommendation.pieces,
                boxRecommendation: latestRecommendation.boxRecommendation,
                confidence: latestRecommendation.confidence,
                shopUrl: latestRecommendation.shopUrl
            },
            answers: latestRecommendation.data
        };

        try {
            localStorage.setItem(
                "luxsomePackagingBuilderResult",
                JSON.stringify(recommendation)
            );
        } catch (error) {
            console.warn("Recommendation could not be saved locally:", error);
        }

        window.location.assign(
            `${latestRecommendation.shopUrl}?source=builder`
        );
    });

    const currentYearElement =
        document.getElementById("currentYear") ||
        document.getElementById("current-year");

    if (currentYearElement) {
        currentYearElement.textContent = String(new Date().getFullYear());
    }

    showStep(0);

    function prefersReducedMotion() {
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
});
