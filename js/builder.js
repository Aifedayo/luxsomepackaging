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

    const totalQuestionSteps = 5;
    const resultStep = 6;
    const whatsappNumber = "2349068804133";
    let currentStep = 0;
    let latestRecommendation = null;

    const errorIds = {
        1: "product-error",
        2: "stage-error",
        3: "quantity-error",
        4: "experience-error",
        5: "timeline-error"
    };

    /*
     * The engine scores individual packaging pieces, rather than asking
     * customers to choose a tier. Product fit has the strongest weight.
     * Brand maturity and desired experience then add or remove layers.
     */
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
        "Jewellery and accessories": {
            direction: "A compact premium presentation system",
            box: "Compact shoulder box or tray-in-bed box",
            base: [
                "Compact rigid presentation box",
                "Protective product insert",
                "Thank-you card",
                "Sticker seal"
            ],
            boosts: {
                "Branded ribbon": 2,
                "Shopping bag": 2,
                "Product description card": 2,
                "Branded tissue": 1
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

        const rules = {
            1: ["product", "Please select a supported fashion category."],
            2: ["stage", "Please select your current brand stage."],
            3: ["quantity", "Please select an estimated quantity."],
            5: ["timeline", "Please select your preferred timeline."]
        };

        if (stepNumber === 4) {
            if (!getSelectedValues("experience").length) {
                showError(
                    4,
                    "Please select at least one quality for your customer experience."
                );
                return false;
            }

            return true;
        }

        const rule = rules[stepNumber];

        if (rule && !getSelectedValue(rule[0])) {
            showError(stepNumber, rule[1]);
            return false;
        }

        return true;
    }

    function updateProgress() {
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
        currentStep = stepNumber;

        steps.forEach(step => {
            const active = Number(step.dataset.step) === stepNumber;
            step.classList.toggle("is-active", active);
            step.hidden = !active;
        });

        const isWelcome = stepNumber === 0;
        const isResult = stepNumber === resultStep;

        navigation.hidden = isWelcome || isResult;

        if (!isWelcome && !isResult) {
            backButton.hidden = false;
            nextButton.innerHTML =
                stepNumber === totalQuestionSteps
                    ? 'See my recommendation <span aria-hidden="true">→</span>'
                    : 'Continue <span aria-hidden="true">→</span>';
        }

        updateProgress();

        const activeStep = steps.find(
            step => Number(step.dataset.step) === stepNumber
        );
        const heading = activeStep?.querySelector("legend, h1, h2");

        requestAnimationFrame(() => {
            activeStep?.scrollIntoView({
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

        if (data.timeline === "As soon as possible") {
            addScore(scores, "Custom structural development", -5);
            addScore(scores, "Shopping bag", -1);
        }

        const targetCount = Math.min(
            7,
            Math.max(
                4,
                stage.targetCount + quantity.targetAdjustment
            )
        );

        const pieces = [...scores.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, targetCount)
            .map(([piece]) => piece);

        if (!pieces.some(piece => piece.toLowerCase().includes("box"))) {
            pieces.unshift(profile.box);
        } else {
            const boxIndex = pieces.findIndex(
                piece => piece.toLowerCase().includes("box")
            );
            pieces[boxIndex] = profile.box;
        }

        const maturityScore =
            stage.score +
            quantity.score +
            data.experience.reduce((total, quality) => (
                total + (
                    ["Luxurious", "Gift-worthy"].includes(quality) ? 2 :
                    ["Premium", "Memorable", "Elegant"].includes(quality) ? 1 :
                    0
                )
            ), 0);

        const internalSystem =
            maturityScore >= 7 ? "Prestige" :
            maturityScore >= 3 ? "Signature" :
            "Foundation";

        return {
            direction: profile.direction,
            boxRecommendation: profile.box,
            pieces: [...new Set(pieces)].slice(0, targetCount),
            internalSystem,
            shopUrl: systemRoutes[internalSystem],
            confidence: Math.min(96, 74 + (data.experience.length * 5) + stage.score),
            explanation:
                `Your ${data.product.toLowerCase()} category calls for ${profile.box.toLowerCase()}. ` +
                `Because your brand is ${data.stage.toLowerCase()} and you want the experience to feel ` +
                `${formatList(data.experience).toLowerCase()}, this combination ${stage.note}. ` +
                `The recommendation prioritises pieces that work together as one system rather than adding items simply to increase the package size.`
        };
    }

    function collectFormData() {
        return {
            product: getSelectedValue("product"),
            stage: getSelectedValue("stage"),
            quantity: getSelectedValue("quantity"),
            experience: getSelectedValues("experience"),
            timeline: getSelectedValue("timeline")
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
            `Timeline: ${data.timeline}`,
            "",
            `Recommended direction: ${recommendation.direction}`,
            `Suggested box: ${recommendation.boxRecommendation}`,
            "",
            "Recommended packaging pieces:",
            ...recommendation.pieces.map(piece => `• ${piece}`),
            "",
            "I would like to refine this recommendation with Luxsome."
        ].join("\n");
    }

    function renderResult() {
        const data = collectFormData();
        const recommendation = calculateRecommendation(data);
        latestRecommendation = { data, ...recommendation };

        document.getElementById("result-tier").textContent =
            recommendation.direction;
        document.getElementById("result-product").textContent = data.product;
        document.getElementById("result-stage").textContent = data.stage;
        document.getElementById("result-quantity").textContent = data.quantity;
        document.getElementById("result-timeline").textContent = data.timeline;
        document.getElementById("result-introduction").textContent =
            `${recommendation.confidence}% match based on your answers.`;
        document.getElementById("result-explanation").textContent =
            recommendation.explanation;

        const piecesList = document.getElementById("result-pieces");
        piecesList.replaceChildren();

        recommendation.pieces.forEach(piece => {
            const item = document.createElement("li");
            item.textContent = piece;
            piecesList.appendChild(item);
        });

        whatsappButton.href =
            `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                createWhatsAppMessage(data, recommendation)
            )}`;
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
            renderResult();
            showStep(resultStep);
            return;
        }

        showStep(currentStep + 1);
    }

    function moveBack() {
        showStep(currentStep > 1 ? currentStep - 1 : 0);
    }

    function restartBuilder() {
        form.reset();
        experienceCount.textContent = "0";
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

            experienceCount.textContent =
                String(getSelectedValues("experience").length);
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
        if (!latestRecommendation) renderResult();

        const recommendation = {
            version: 2,
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

        localStorage.setItem(
            "luxsomePackagingBuilderResult",
            JSON.stringify(recommendation)
        );

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
