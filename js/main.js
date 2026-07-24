document.addEventListener("DOMContentLoaded", () => {
    const mobileMenuButton =
        document.getElementById("mobileMenuButton");

    const siteNavigation =
        document.getElementById("siteNavigation");

    const currentYear =
        document.getElementById("currentYear");

    if (currentYear) {
        currentYear.textContent =
            new Date().getFullYear();
    }

    if (!mobileMenuButton || !siteNavigation) {
        return;
    }

    function closeMobileMenu() {
        mobileMenuButton.classList.remove("is-active");
        siteNavigation.classList.remove("is-open");

        mobileMenuButton.setAttribute(
            "aria-expanded",
            "false"
        );

        mobileMenuButton.setAttribute(
            "aria-label",
            "Open navigation menu"
        );

        document.body.classList.remove("menu-open");
    }

    function toggleMobileMenu() {
        const menuIsOpen =
            siteNavigation.classList.toggle("is-open");

        mobileMenuButton.classList.toggle(
            "is-active",
            menuIsOpen
        );

        mobileMenuButton.setAttribute(
            "aria-expanded",
            String(menuIsOpen)
        );

        mobileMenuButton.setAttribute(
            "aria-label",
            menuIsOpen
                ? "Close navigation menu"
                : "Open navigation menu"
        );

        document.body.classList.toggle(
            "menu-open",
            menuIsOpen
        );
    }

    mobileMenuButton.addEventListener(
        "click",
        toggleMobileMenu
    );

    siteNavigation
        .querySelectorAll("a")
        .forEach((link) => {
            link.addEventListener(
                "click",
                closeMobileMenu
            );
        });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 850) {
            closeMobileMenu();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeMobileMenu();
        }
    });
});

document.addEventListener("DOMContentLoaded", function () {
    const slides = document.querySelectorAll(".hero-slide");
    const dots = document.querySelectorAll(".hero-dot");
    const previousButton = document.querySelector(".hero-arrow-left");
    const nextButton = document.querySelector(".hero-arrow-right");
    const carousel = document.querySelector(".hero-carousel");

    let currentSlide = 0;
    let autoplayInterval;

    function showSlide(index) {
        if (index >= slides.length) {
            currentSlide = 0;
        } else if (index < 0) {
            currentSlide = slides.length - 1;
        } else {
            currentSlide = index;
        }

        slides.forEach(function (slide, slideIndex) {
            slide.classList.toggle(
                "active",
                slideIndex === currentSlide
            );
        });

        dots.forEach(function (dot, dotIndex) {
            const isActive = dotIndex === currentSlide;

            dot.classList.toggle("active", isActive);

            if (isActive) {
                dot.setAttribute("aria-current", "true");
            } else {
                dot.removeAttribute("aria-current");
            }
        });
    }

    function nextSlide() {
        showSlide(currentSlide + 1);
    }

    function previousSlide() {
        showSlide(currentSlide - 1);
    }

    function startAutoplay() {
        stopAutoplay();

        autoplayInterval = window.setInterval(function () {
            nextSlide();
        }, 6000);
    }

    function stopAutoplay() {
        if (autoplayInterval) {
            window.clearInterval(autoplayInterval);
        }
    }

    nextButton.addEventListener("click", function () {
        nextSlide();
        startAutoplay();
    });

    previousButton.addEventListener("click", function () {
        previousSlide();
        startAutoplay();
    });

    dots.forEach(function (dot, index) {
        dot.addEventListener("click", function () {
            showSlide(index);
            startAutoplay();
        });
    });

    carousel.addEventListener("mouseenter", stopAutoplay);
    carousel.addEventListener("mouseleave", startAutoplay);

    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            stopAutoplay();
        } else {
            startAutoplay();
        }
    });

    showSlide(0);
    startAutoplay();
});


/* =========================================================
   PACKAGING SYSTEM SCROLL REVEAL
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    const revealSection = document.querySelector("#packagingSystem");

    if (!revealSection) {
        return;
    }

    const stickyElement = revealSection.querySelector(
        ".system-reveal__sticky"
    );

    const progressElement = revealSection.querySelector(
        "#systemRevealProgress"
    );

    const stepNumberElement = revealSection.querySelector(
        "#systemStepNumber"
    );

    const stepTitleElement = revealSection.querySelector(
        "#systemStepTitle"
    );

    const stepDescriptionElement = revealSection.querySelector(
        "#systemStepDescription"
    );

    const reducedMotionQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    const steps = [
        {
            start: 0.02,
            end: 0.17,
            number: "01",
            title: "The foundation",
            description:
                "A premium rigid box made to give your product presence."
        },
        {
            start: 0.17,
            end: 0.32,
            number: "02",
            title: "The first reveal",
            description:
                "Branded tissue adds anticipation before the product is seen."
        },
        {
            start: 0.32,
            end: 0.47,
            number: "03",
            title: "A thoughtful message",
            description:
                "A thank-you card turns every order into a personal interaction."
        },
        {
            start: 0.47,
            end: 0.61,
            number: "04",
            title: "Brand identity",
            description:
                "A refined hang tag carries your identity beyond the packaging."
        },
        {
            start: 0.61,
            end: 0.75,
            number: "05",
            title: "The finishing detail",
            description:
                "Branded ribbon brings structure, ceremony and elegance."
        },
        {
            start: 0.75,
            end: 0.88,
            number: "06",
            title: "The final seal",
            description:
                "A custom seal completes the system and makes it unmistakably yours."
        }
    ];

    let animationFrameId = null;
    let currentStepIndex = -1;

    /**
     * Keeps a number between 0 and 1.
     */
    const clamp = (value, minimum = 0, maximum = 1) => {
        return Math.min(Math.max(value, minimum), maximum);
    };

    /**
     * Returns the progress within a specific scroll interval.
     */
    const rangeProgress = (progress, start, end) => {
        return clamp((progress - start) / (end - start));
    };

    /**
     * Smoothstep produces a softer beginning and ending.
     */
    const smoothstep = (value) => {
        const progress = clamp(value);
        return progress * progress * (3 - 2 * progress);
    };

    /**
     * Converts one number range to another.
     */
    const interpolate = (from, to, progress) => {
        return from + (to - from) * progress;
    };

    const setProperty = (name, value) => {
        stickyElement.style.setProperty(name, value);
    };

    const updateStepText = (progress) => {
        let nextStepIndex = steps.findIndex((step) => {
            return progress >= step.start && progress < step.end;
        });

        if (nextStepIndex === -1) {
            nextStepIndex = progress >= steps[steps.length - 1].end
                ? steps.length - 1
                : 0;
        }

        if (nextStepIndex === currentStepIndex) {
            return;
        }

        currentStepIndex = nextStepIndex;

        const currentStep = steps[currentStepIndex];

        stepNumberElement.textContent = currentStep.number;
        stepTitleElement.textContent = currentStep.title;
        stepDescriptionElement.textContent = currentStep.description;

        const caption = revealSection.querySelector(
            ".system-reveal__caption"
        );

        caption.animate(
            [
                {
                    opacity: 0,
                    transform: "translateY(8px)"
                },
                {
                    opacity: 1,
                    transform: "translateY(0)"
                }
            ],
            {
                duration: 350,
                easing: "ease-out"
            }
        );
    };

    const renderReveal = (progress) => {
        revealSection.style.setProperty(
            "--reveal-progress",
            progress.toFixed(4)
        );

        /*
         * Box: 0.04 → 0.18
         */
        const boxProgress = smoothstep(
            rangeProgress(progress, 0.04, 0.18)
        );

        setProperty(
            "--box-opacity",
            boxProgress.toFixed(3)
        );

        setProperty(
            "--box-y",
            `${interpolate(70, 0, boxProgress)}px`
        );

        setProperty(
            "--box-scale",
            interpolate(0.88, 1, boxProgress).toFixed(3)
        );

        setProperty(
            "--box-blur",
            `${interpolate(8, 0, boxProgress)}px`
        );


        /*
         * Tissue: 0.18 → 0.34
         */
        const tissueProgress = smoothstep(
            rangeProgress(progress, 0.18, 0.34)
        );

        setProperty(
            "--tissue-opacity",
            tissueProgress.toFixed(3)
        );

        setProperty(
            "--tissue-y",
            `${interpolate(-45, 0, tissueProgress)}px`
        );

        setProperty(
            "--tissue-scale",
            interpolate(0.9, 1, tissueProgress).toFixed(3)
        );

        setProperty(
            "--tissue-blur",
            `${interpolate(5, 0, tissueProgress)}px`
        );


        /*
         * Thank-you card: 0.33 → 0.49
         */
        const cardProgress = smoothstep(
            rangeProgress(progress, 0.33, 0.49)
        );

        setProperty(
            "--card-opacity",
            cardProgress.toFixed(3)
        );

        setProperty(
            "--card-x",
            `${interpolate(90, 0, cardProgress)}px`
        );

        setProperty(
            "--card-y",
            `${interpolate(35, 0, cardProgress)}px`
        );

        setProperty(
            "--card-rotate",
            `${interpolate(7, 0, cardProgress)}deg`
        );

        setProperty(
            "--card-scale",
            interpolate(0.92, 1, cardProgress).toFixed(3)
        );


        /*
         * Hang tag: 0.47 → 0.63
         */
        const tagProgress = smoothstep(
            rangeProgress(progress, 0.47, 0.63)
        );

        setProperty(
            "--tag-opacity",
            tagProgress.toFixed(3)
        );

        setProperty(
            "--tag-x",
            `${interpolate(-90, 0, tagProgress)}px`
        );

        setProperty(
            "--tag-y",
            `${interpolate(25, 0, tagProgress)}px`
        );

        setProperty(
            "--tag-rotate",
            `${interpolate(-8, 0, tagProgress)}deg`
        );

        setProperty(
            "--tag-scale",
            interpolate(0.92, 1, tagProgress).toFixed(3)
        );


        /*
         * Ribbon: 0.61 → 0.77
         */
        const ribbonProgress = smoothstep(
            rangeProgress(progress, 0.61, 0.77)
        );

        setProperty(
            "--ribbon-opacity",
            ribbonProgress.toFixed(3)
        );

        setProperty(
            "--ribbon-scale-x",
            interpolate(0.65, 1, ribbonProgress).toFixed(3)
        );

        setProperty(
            "--ribbon-scale-y",
            interpolate(0.95, 1, ribbonProgress).toFixed(3)
        );


        /*
         * Sticker: 0.74 → 0.88
         */
        const stickerProgress = smoothstep(
            rangeProgress(progress, 0.74, 0.88)
        );

        setProperty(
            "--sticker-opacity",
            stickerProgress.toFixed(3)
        );

        setProperty(
            "--sticker-y",
            `${interpolate(-25, 0, stickerProgress)}px`
        );

        setProperty(
            "--sticker-rotate",
            `${interpolate(-12, 0, stickerProgress)}deg`
        );

        setProperty(
            "--sticker-scale",
            interpolate(0.4, 1, stickerProgress).toFixed(3)
        );


        /*
         * Caption fades before final message.
         */
        const captionExit = smoothstep(
            rangeProgress(progress, 0.84, 0.92)
        );

        setProperty(
            "--caption-opacity",
            (1 - captionExit).toFixed(3)
        );

        setProperty(
            "--caption-y",
            `${interpolate(0, 18, captionExit)}px`
        );


        /*
         * Final message: 0.88 → 1
         */
        const finalProgress = smoothstep(
            rangeProgress(progress, 0.88, 0.98)
        );

        setProperty(
            "--final-opacity",
            finalProgress.toFixed(3)
        );

        setProperty(
            "--final-y",
            `${interpolate(45, 0, finalProgress)}px`
        );

        setProperty(
            "--final-visibility",
            finalProgress > 0.01 ? "visible" : "hidden"
        );

        const finalSection = revealSection.querySelector(
            ".system-reveal__final"
        );

        finalSection.style.pointerEvents =
            finalProgress > 0.8 ? "auto" : "none";


        /*
         * Fade the packaging visual when final copy enters.
         */
        const visualFade = smoothstep(
            rangeProgress(progress, 0.87, 0.96)
        );

        const stage = revealSection.querySelector(
            ".system-reveal__stage"
        );

        stage.style.opacity = String(1 - visualFade);
        stage.style.transform = `
            translateY(${interpolate(0, -25, visualFade)}px)
            scale(${interpolate(1, 0.94, visualFade)})
        `;


        /*
         * Scroll instruction disappears early.
         */
        const hintOpacity = 1 - smoothstep(
            rangeProgress(progress, 0.02, 0.13)
        );

        setProperty(
            "--scroll-hint-opacity",
            hintOpacity.toFixed(3)
        );

        updateStepText(progress);
    };

    const calculateProgress = () => {
        if (reducedMotionQuery.matches) {
            return;
        }

        const sectionRectangle = revealSection.getBoundingClientRect();

        const scrollableDistance =
            revealSection.offsetHeight - window.innerHeight;

        if (scrollableDistance <= 0) {
            renderReveal(0);
            return;
        }

        const distanceScrolled = -sectionRectangle.top;

        const progress = clamp(
            distanceScrolled / scrollableDistance
        );

        renderReveal(progress);
    };

    const requestRevealUpdate = () => {
        if (animationFrameId !== null) {
            return;
        }

        animationFrameId = window.requestAnimationFrame(() => {
            calculateProgress();
            animationFrameId = null;
        });
    };

    window.addEventListener("scroll", requestRevealUpdate, {
        passive: true
    });

    window.addEventListener("resize", requestRevealUpdate);

    reducedMotionQuery.addEventListener?.(
        "change",
        requestRevealUpdate
    );

    calculateProgress();
});