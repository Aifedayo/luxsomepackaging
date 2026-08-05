/* =========================================================
   LUXSOME WEBSITE — MAIN JAVASCRIPT
========================================================= */

"use strict";

document.addEventListener("DOMContentLoaded", function () {
    initCurrentYear();
    initMobileMenu();
    initHeroCarousel();
    initPackagingSystemCarousel();
    initScrollReveal();
    initWhatsAppContact();
    initTagTierCarousel();
});


/* =========================================================
   CURRENT YEAR
========================================================= */

function initCurrentYear() {
    const currentYear = document.getElementById("currentYear");

    if (!currentYear) {
        return;
    }

    currentYear.textContent = new Date().getFullYear();
}


/* =========================================================
   MOBILE MENU
========================================================= */

function initMobileMenu() {
    const menuButton = document.getElementById("mobileMenuButton");
    const navigation = document.getElementById("siteNavigation");

    if (!menuButton || !navigation) {
        return;
    }

    function openMenu() {
        menuButton.classList.add("is-active");
        navigation.classList.add("is-open");

        menuButton.setAttribute("aria-expanded", "true");
        menuButton.setAttribute(
            "aria-label",
            "Close navigation menu"
        );

        document.body.classList.add("menu-open");
    }

    function closeMenu() {
        menuButton.classList.remove("is-active");
        navigation.classList.remove("is-open");

        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute(
            "aria-label",
            "Open navigation menu"
        );

        document.body.classList.remove("menu-open");
    }

    function toggleMenu() {
        const menuIsOpen =
            navigation.classList.contains("is-open");

        if (menuIsOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    menuButton.addEventListener("click", toggleMenu);

    navigation.querySelectorAll("a").forEach(function (link) {
        link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
            closeMenu();
        }
    });

    window.addEventListener("resize", function () {
        if (window.innerWidth > 850) {
            closeMenu();
        }
    });
}


/* =========================================================
   HERO CAROUSEL
========================================================= */

function initHeroCarousel() {
    const carousel = document.querySelector(".hero-carousel");

    if (!carousel) {
        return;
    }

    const slides = Array.from(
        carousel.querySelectorAll(".hero-slide")
    );

    const dots = Array.from(
        carousel.querySelectorAll(".hero-dot")
    );

    const previousButton = carousel.querySelector(
        ".hero-arrow-left"
    );

    const nextButton = carousel.querySelector(
        ".hero-arrow-right"
    );

    if (slides.length === 0) {
        return;
    }

    const reducedMotionQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    let currentSlide = 0;
    let autoplayTimer = null;

    function normaliseSlideIndex(index) {
        if (index < 0) {
            return slides.length - 1;
        }

        if (index >= slides.length) {
            return 0;
        }

        return index;
    }

    function showSlide(index) {
        currentSlide = normaliseSlideIndex(index);

        slides.forEach(function (slide, slideIndex) {
            const isActive = slideIndex === currentSlide;

            slide.classList.toggle("active", isActive);

            slide.setAttribute(
                "aria-hidden",
                isActive ? "false" : "true"
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

    function stopAutoplay() {
        if (autoplayTimer === null) {
            return;
        }

        window.clearInterval(autoplayTimer);
        autoplayTimer = null;
    }

    function startAutoplay() {
        stopAutoplay();

        if (
            reducedMotionQuery.matches ||
            slides.length < 2
        ) {
            return;
        }

        autoplayTimer = window.setInterval(function () {
            showSlide(currentSlide + 1);
        }, 6000);
    }

    if (previousButton) {
        previousButton.addEventListener("click", function () {
            showSlide(currentSlide - 1);
            startAutoplay();
        });
    }

    if (nextButton) {
        nextButton.addEventListener("click", function () {
            showSlide(currentSlide + 1);
            startAutoplay();
        });
    }

    dots.forEach(function (dot, dotIndex) {
        dot.addEventListener("click", function () {
            showSlide(dotIndex);
            startAutoplay();
        });
    });

    carousel.addEventListener("mouseenter", stopAutoplay);
    carousel.addEventListener("mouseleave", startAutoplay);
    carousel.addEventListener("focusin", stopAutoplay);

    carousel.addEventListener("focusout", function (event) {
        if (!carousel.contains(event.relatedTarget)) {
            startAutoplay();
        }
    });

    document.addEventListener(
        "visibilitychange",
        function () {
            if (document.hidden) {
                stopAutoplay();
            } else {
                startAutoplay();
            }
        }
    );

    function handleReducedMotionChange() {
        if (reducedMotionQuery.matches) {
            stopAutoplay();
        } else {
            startAutoplay();
        }
    }

    if (
        typeof reducedMotionQuery.addEventListener ===
        "function"
    ) {
        reducedMotionQuery.addEventListener(
            "change",
            handleReducedMotionChange
        );
    } else if (
        typeof reducedMotionQuery.addListener ===
        "function"
    ) {
        reducedMotionQuery.addListener(
            handleReducedMotionChange
        );
    }

    showSlide(0);
    startAutoplay();
}


/* =========================================================
   PACKAGING SYSTEM CAROUSEL
========================================================= */

function initPackagingSystemCarousel() {
    const section = document.getElementById(
        "luxsomeSystem"
    );

    if (!section) {
        return;
    }

    const slider = section.querySelector(
        "#systemSlider"
    );

    if (!slider) {
        return;
    }

    const cards = Array.from(
        slider.querySelectorAll(".system-card")
    );

    const progressSteps = Array.from(
        section.querySelectorAll(
            ".system-progress-step"
        )
    );

    const progressText = section.querySelector(
        "#systemProgressText"
    );

    const progressFill = section.querySelector(
        "#systemProgressFill"
    );

    const previousButton = section.querySelector(
        "#systemPreviousButton"
    );

    const nextButton = section.querySelector(
        "#systemNextButton"
    );

    if (cards.length === 0) {
        return;
    }

    const reducedMotionQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    let currentIndex = 0;
    let scrollAnimationFrame = null;
    let resizeTimer = null;
    let scrollEndTimer = null;

    let isDragging = false;
    let dragStartX = 0;
    let dragStartScrollLeft = 0;
    let hasDragged = false;

    /*
     * Returns the horizontal scroll position required
     * to align a card with the left side of the carousel.
     */
    function getCardScrollPosition(card) {
        const sliderRectangle =
            slider.getBoundingClientRect();

        const cardRectangle =
            card.getBoundingClientRect();

        return (
            slider.scrollLeft +
            cardRectangle.left -
            sliderRectangle.left
        );
    }

    /*
     * Keeps the requested index within the available cards.
     */
    function clampIndex(index) {
        return Math.max(
            0,
            Math.min(index, cards.length - 1)
        );
    }

    /*
     * Finds the card currently closest to the left
     * edge of the carousel.
     */
    function findClosestCardIndex() {
        let closestIndex = 0;
        let closestDistance = Infinity;

        cards.forEach(function (card, cardIndex) {
            const cardPosition =
                getCardScrollPosition(card);

            const distance = Math.abs(
                slider.scrollLeft - cardPosition
            );

            if (distance < closestDistance) {
                closestDistance = distance;
                closestIndex = cardIndex;
            }
        });

        return closestIndex;
    }

    /*
     * Updates the section background and active card.
     */
    function updateSectionAppearance(index) {
        const activeCard = cards[index];

        if (!activeCard) {
            return;
        }

        const background =
            activeCard.dataset.background ||
            "#f8f4ef";

        const theme =
            activeCard.dataset.theme ||
            "light";

        section.style.setProperty(
            "--active-system-background",
            background
        );

        section.setAttribute(
            "data-theme",
            theme
        );

        cards.forEach(function (card, cardIndex) {
            const isCurrent =
                cardIndex === index;

            card.classList.toggle(
                "is-current",
                isCurrent
            );

            if (isCurrent) {
                card.setAttribute(
                    "aria-current",
                    "true"
                );
            } else {
                card.removeAttribute(
                    "aria-current"
                );
            }
        });
    }

    /*
     * Updates the text, dots, progress line
     * and previous/next buttons.
     */
    function updateProgress(index) {
        currentIndex = clampIndex(index);

        const activeCard = cards[currentIndex];

        const title =
            activeCard.dataset.stepTitle ||
            `Step ${currentIndex + 1}`;

        updateSectionAppearance(currentIndex);

        if (progressText) {
            progressText.textContent =
                `Step ${currentIndex + 1} of ` +
                `${cards.length} · ${title}`;
        }

        progressSteps.forEach(
            function (step, stepIndex) {
                const isActive =
                    stepIndex === currentIndex;

                const isComplete =
                    stepIndex < currentIndex;

                step.classList.toggle(
                    "is-active",
                    isActive
                );

                step.classList.toggle(
                    "is-complete",
                    isComplete
                );

                if (isActive) {
                    step.setAttribute(
                        "aria-current",
                        "step"
                    );
                } else {
                    step.removeAttribute(
                        "aria-current"
                    );
                }
            }
        );

        if (progressFill) {
            const progressPercentage =
                cards.length > 1
                    ? (
                        currentIndex /
                        (cards.length - 1)
                    ) * 100
                    : 0;

            progressFill.style.width =
                `${progressPercentage}%`;
        }

        if (previousButton) {
            previousButton.disabled =
                currentIndex === 0;
        }

        if (nextButton) {
            nextButton.disabled =
                currentIndex ===
                cards.length - 1;
        }
    }

    /*
     * Scrolls the carousel to a card.
     */
    function goToSlide(
        index,
        scrollBehaviour = "smooth"
    ) {
        const safeIndex =
            clampIndex(index);

        const selectedCard =
            cards[safeIndex];

        const behaviour =
            reducedMotionQuery.matches
                ? "auto"
                : scrollBehaviour;

        updateProgress(safeIndex);

        slider.scrollTo({
            left: getCardScrollPosition(
                selectedCard
            ),
            behavior: behaviour
        });
    }

    /*
     * Keep the progress indicator synchronised
     * while swiping or scrolling.
     */
    slider.addEventListener(
        "scroll",
        function () {
            if (scrollAnimationFrame !== null) {
                window.cancelAnimationFrame(
                    scrollAnimationFrame
                );
            }

            scrollAnimationFrame =
                window.requestAnimationFrame(
                    function () {
                        const closestIndex =
                            findClosestCardIndex();

                        if (
                            closestIndex !==
                            currentIndex
                        ) {
                            updateProgress(
                                closestIndex
                            );
                        }
                    }
                );

            /*
             * After scrolling stops, snap precisely
             * to the nearest card.
             */
            window.clearTimeout(scrollEndTimer);

            scrollEndTimer =
                window.setTimeout(
                    function () {
                        if (!isDragging) {
                            const closestIndex =
                                findClosestCardIndex();

                            updateProgress(
                                closestIndex
                            );
                        }
                    },
                    120
                );
        },
        {
            passive: true
        }
    );

    /*
     * Previous button.
     */
    if (previousButton) {
        previousButton.addEventListener(
            "click",
            function () {
                goToSlide(
                    currentIndex - 1
                );
            }
        );
    }

    /*
     * Next button.
     */
    if (nextButton) {
        nextButton.addEventListener(
            "click",
            function () {
                goToSlide(
                    currentIndex + 1
                );
            }
        );
    }

    /*
     * Clickable progress dots.
     */
    progressSteps.forEach(
        function (step, stepIndex) {
            step.addEventListener(
                "click",
                function () {
                    const requestedIndex =
                        Number(
                            step.dataset.slide
                        );

                    if (
                        Number.isInteger(
                            requestedIndex
                        )
                    ) {
                        goToSlide(
                            requestedIndex
                        );
                    } else {
                        goToSlide(
                            stepIndex
                        );
                    }
                }
            );
        }
    );

    /*
     * Keyboard navigation.
     */
    slider.addEventListener(
        "keydown",
        function (event) {
            switch (event.key) {
                case "ArrowLeft":
                    event.preventDefault();
                    goToSlide(
                        currentIndex - 1
                    );
                    break;

                case "ArrowRight":
                    event.preventDefault();
                    goToSlide(
                        currentIndex + 1
                    );
                    break;

                case "Home":
                    event.preventDefault();
                    goToSlide(0);
                    break;

                case "End":
                    event.preventDefault();
                    goToSlide(
                        cards.length - 1
                    );
                    break;

                default:
                    break;
            }
        }
    );

    /*
     * Desktop mouse dragging.
     * Touchscreen swiping uses native scrolling.
     */
    slider.addEventListener(
        "pointerdown",
        function (event) {
            if (
                event.pointerType !== "mouse"
            ) {
                return;
            }

            isDragging = true;
            hasDragged = false;

            dragStartX = event.clientX;
            dragStartScrollLeft =
                slider.scrollLeft;

            slider.classList.add(
                "is-dragging"
            );

            if (
                typeof slider.setPointerCapture ===
                "function"
            ) {
                slider.setPointerCapture(
                    event.pointerId
                );
            }
        }
    );

    slider.addEventListener(
        "pointermove",
        function (event) {
            if (!isDragging) {
                return;
            }

            const distanceMoved =
                event.clientX -
                dragStartX;

            if (
                Math.abs(distanceMoved) > 5
            ) {
                hasDragged = true;
            }

            slider.scrollLeft =
                dragStartScrollLeft -
                distanceMoved;
        }
    );

    function finishDragging(event) {
        if (!isDragging) {
            return;
        }

        isDragging = false;

        slider.classList.remove(
            "is-dragging"
        );

        if (
            typeof slider.hasPointerCapture ===
                "function" &&
            slider.hasPointerCapture(
                event.pointerId
            )
        ) {
            slider.releasePointerCapture(
                event.pointerId
            );
        }

        const closestIndex =
            findClosestCardIndex();

        goToSlide(closestIndex);
    }

    slider.addEventListener(
        "pointerup",
        finishDragging
    );

    slider.addEventListener(
        "pointercancel",
        finishDragging
    );

    /*
     * Prevent links from opening when the visitor
     * was dragging instead of clicking.
     */
    slider.addEventListener(
        "click",
        function (event) {
            if (!hasDragged) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            hasDragged = false;
        },
        true
    );

    /*
     * Recalculate the active card position
     * after the window changes size.
     */
    window.addEventListener(
        "resize",
        function () {
            window.clearTimeout(
                resizeTimer
            );

            resizeTimer =
                window.setTimeout(
                    function () {
                        goToSlide(
                            currentIndex,
                            "auto"
                        );
                    },
                    150
                );
        }
    );

    /*
     * Initial state.
     */
    updateProgress(0);

    window.requestAnimationFrame(
        function () {
            slider.scrollLeft = 0;
        }
    );
}


/* =========================================================
   GENERAL SCROLL REVEAL
========================================================= */

function initScrollReveal() {
    const revealElements = Array.from(
        document.querySelectorAll(".reveal")
    );

    if (revealElements.length === 0) {
        return;
    }

    const reducedMotionQuery = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    document.documentElement.classList.add(
        "reveal-ready"
    );

    const revealGroups = document.querySelectorAll(
        ".reveal-group"
    );

    revealGroups.forEach(function (group) {
        const groupedElements =
            group.querySelectorAll(".reveal");

        groupedElements.forEach(
            function (element, index) {
                element.style.setProperty(
                    "--reveal-index",
                    index
                );
            }
        );
    });

    if (
        reducedMotionQuery.matches ||
        !("IntersectionObserver" in window)
    ) {
        revealElements.forEach(
            function (element) {
                element.classList.add(
                    "is-revealed"
                );
            }
        );

        return;
    }

    const observer =
        new IntersectionObserver(
            function (
                entries,
                revealObserver
            ) {
                entries.forEach(
                    function (entry) {
                        if (
                            !entry.isIntersecting
                        ) {
                            return;
                        }

                        entry.target.classList.add(
                            "is-revealed"
                        );

                        revealObserver.unobserve(
                            entry.target
                        );
                    }
                );
            },
            {
                threshold: 0.15,
                rootMargin:
                    "0px 0px -60px 0px"
            }
        );

    revealElements.forEach(
        function (element) {
            observer.observe(element);
        }
    );
}

/* =========================================================
   WHATSAPP CONTACT BUTTON
========================================================= */

function initWhatsAppContact() {
    const contact = document.getElementById(
        "whatsappContact"
    );

    const button = document.getElementById(
        "whatsappButton"
    );

    const messageBox = document.getElementById(
        "whatsappMessage"
    );

    const closeButton = document.getElementById(
        "whatsappMessageClose"
    );

    if (!contact || !button) {
        return;
    }

    const phoneNumber = contact.dataset.phone;

    if (!phoneNumber) {
        console.warn(
            "WhatsApp phone number has not been provided."
        );

        return;
    }

    const currentPath = window.location.pathname
        .toLowerCase()
        .replace(/\/+$/, "");

    const pageName = getWhatsAppPageName(currentPath);

    const message = getWhatsAppMessage(pageName);

    const encodedMessage = encodeURIComponent(message);

    button.href =
        `https://wa.me/${phoneNumber}?text=${encodedMessage}`;

    let promptHasBeenShown = false;
    let promptHasBeenDismissed = false;
    let pulseTimer = null;

    function showContact() {
        contact.classList.add("is-visible");

        window.setTimeout(function () {
            showPrompt();
        }, 2500);
    }

    function showPrompt() {
        if (
            !messageBox ||
            promptHasBeenShown ||
            promptHasBeenDismissed
        ) {
            return;
        }

        promptHasBeenShown = true;

        messageBox.classList.add("is-visible");
        messageBox.setAttribute(
            "aria-hidden",
            "false"
        );

        window.setTimeout(function () {
            hidePrompt();
        }, 8000);
    }

    function hidePrompt() {
        if (!messageBox) {
            return;
        }

        messageBox.classList.remove("is-visible");
        messageBox.setAttribute(
            "aria-hidden",
            "true"
        );
    }

    function dismissPrompt() {
        promptHasBeenDismissed = true;
        hidePrompt();

        try {
            window.sessionStorage.setItem(
                "luxsomeWhatsAppPromptDismissed",
                "true"
            );
        } catch (error) {
            /*
             * The button will continue working if
             * sessionStorage is unavailable.
             */
        }
    }

    function startSoftPulse() {
        if (
            window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches
        ) {
            return;
        }

        pulseTimer = window.setInterval(function () {
            button.classList.add("is-pulsing");

            window.setTimeout(function () {
                button.classList.remove(
                    "is-pulsing"
                );
            }, 1600);
        }, 18000);
    }

    function showAfterScroll() {
        const documentHeight =
            document.documentElement.scrollHeight -
            window.innerHeight;

        if (documentHeight <= 0) {
            showContact();

            window.removeEventListener(
                "scroll",
                showAfterScroll
            );

            return;
        }

        const scrollPercentage =
            window.scrollY / documentHeight;

        if (scrollPercentage >= 0.3) {
            showContact();

            window.removeEventListener(
                "scroll",
                showAfterScroll
            );
        }
    }

    try {
        promptHasBeenDismissed =
            window.sessionStorage.getItem(
                "luxsomeWhatsAppPromptDismissed"
            ) === "true";
    } catch (error) {
        promptHasBeenDismissed = false;
    }

    if (closeButton) {
        closeButton.addEventListener(
            "click",
            dismissPrompt
        );
    }

    button.addEventListener("click", function () {
        hidePrompt();
    });

    /*
     * Homepage:
     * Show after the visitor scrolls 30%.
     *
     * Other selected pages:
     * Show immediately.
     */
    if (pageName === "home") {
        window.addEventListener(
            "scroll",
            showAfterScroll,
            {
                passive: true
            }
        );

        showAfterScroll();
    } else {
        window.setTimeout(
            showContact,
            500
        );
    }

    startSoftPulse();

    window.addEventListener(
        "beforeunload",
        function () {
            if (pulseTimer !== null) {
                window.clearInterval(
                    pulseTimer
                );
            }
        }
    );
}


/* =========================================================
   WHATSAPP PAGE DETECTION
========================================================= */

function getWhatsAppPageName(path) {
    if (
        path === "" ||
        path === "/" ||
        path.endsWith("/index.html")
    ) {
        return "home";
    }

    if (path.includes("/pricing")) {
        return "pricing";
    }

    if (path.includes("/gallery")) {
        return "gallery";
    }

    if (
        path.includes("/product") ||
        path.includes("/packaging")
    ) {
        return "products";
    }

    if (
        path.includes("/about") ||
        path.includes("/our-story")
    ) {
        return "story";
    }

    if (path.includes("/contact")) {
        return "contact";
    }

    return "general";
}


/* =========================================================
   WHATSAPP PAGE MESSAGES
========================================================= */

function getWhatsAppMessage(pageName) {
    const messages = {
        home:
            "Hi Luxsome, I would like to learn more about creating a complete packaging system for my brand.",

        pricing:
            "Hi Luxsome, I have reviewed your pricing and would like a quotation for a complete packaging system.",

        gallery:
            "Hi Luxsome, I saw a packaging style in your gallery that I like and would like to discuss a similar project.",

        products:
            "Hi Luxsome, I am interested in creating custom packaging for my brand and would like to discuss the available options.",

        story:
            "Hi Luxsome, I would like to learn more about working with you on my brand's packaging.",

        contact:
            "Hi Luxsome, I would like to make an enquiry about custom packaging for my brand.",

        general:
            "Hi Luxsome, I would like to discuss creating a complete packaging system for my brand."
    };

    return messages[pageName] || messages.general;
}

document.querySelectorAll('.system-image img').forEach((image) => {
    const wrapper = image.closest('.system-image');

    if (!wrapper) {
        return;
    }

    const revealImage = () => {
        wrapper.classList.remove('is-loading');
    };

    if (image.complete && image.naturalWidth > 0) {
        revealImage();
        return;
    }

    image.addEventListener('load', revealImage, { once: true });

    image.addEventListener(
        'error',
        () => {
            wrapper.classList.remove('is-loading');
            wrapper.classList.add('has-error');
        },
        { once: true }
    );
});

/* =========================================================
   TAG TIER CAROUSEL
========================================================= */

function initTagTierCarousel() {
    const carousels = Array.from(
        document.querySelectorAll(
            "[data-tag-carousel]"
        )
    );

    carousels.forEach((carousel) => {
        if (carousel.dataset.initialised === "true") {
            return;
        }

        carousel.dataset.initialised = "true";

        const viewport =
            carousel.querySelector(
                "[data-tag-viewport]"
            );

        const track =
            carousel.querySelector(
                ".tag-tier-carousel__track"
            );

        const previousButton =
            carousel.querySelector(
                "[data-tag-previous]"
            );

        const nextButton =
            carousel.querySelector(
                "[data-tag-next]"
            );

        const progressBar =
            carousel.querySelector(
                "[data-tag-progress]"
            );

        if (!viewport || !track) {
            return;
        }

        let isDragging = false;
        let startX = 0;
        let startingScrollLeft = 0;
        let frame = null;

        function maximumScroll() {
            return Math.max(
                0,
                viewport.scrollWidth -
                    viewport.clientWidth
            );
        }

        function cardDistance() {
            const card =
                track.querySelector(
                    ".tag-tier-card"
                );

            if (!card) {
                return viewport.clientWidth * 0.75;
            }

            const trackStyle =
                window.getComputedStyle(track);

            const gap =
                parseFloat(trackStyle.gap) || 0;

            return card.offsetWidth + gap;
        }

        function updateCarousel() {
            const maxScroll = maximumScroll();

            const currentScroll =
                viewport.scrollLeft;

            const progress =
                maxScroll > 0
                    ? currentScroll / maxScroll
                    : 0;

            previousButton?.toggleAttribute(
                "disabled",
                currentScroll <= 2
            );

            nextButton?.toggleAttribute(
                "disabled",
                currentScroll >=
                    maxScroll - 2
            );

            if (progressBar) {
                const barWidth =
                    progressBar.offsetWidth;

                const parentWidth =
                    progressBar.parentElement
                        ?.clientWidth || 0;

                const availableMovement =
                    Math.max(
                        0,
                        parentWidth - barWidth
                    );

                progressBar.style.transform =
                    `translateX(${
                        progress *
                        availableMovement
                    }px)`;
            }
        }

        function requestUpdate() {
            if (frame !== null) {
                cancelAnimationFrame(frame);
            }

            frame =
                requestAnimationFrame(
                    updateCarousel
                );
        }

        function scrollByCard(direction) {
            viewport.scrollBy({
                left:
                    cardDistance() *
                    direction,

                behavior: "smooth"
            });
        }

        previousButton?.addEventListener(
            "click",
            () => {
                scrollByCard(-1);
            }
        );

        nextButton?.addEventListener(
            "click",
            () => {
                scrollByCard(1);
            }
        );

        viewport.addEventListener(
            "scroll",
            requestUpdate,
            {
                passive: true
            }
        );

        viewport.addEventListener(
            "pointerdown",
            (event) => {
                if (
                    event.pointerType !== "mouse" ||
                    event.button !== 0
                ) {
                    return;
                }

                isDragging = true;

                startX = event.clientX;

                startingScrollLeft =
                    viewport.scrollLeft;

                viewport.classList.add(
                    "is-dragging"
                );

                viewport.setPointerCapture?.(
                    event.pointerId
                );
            }
        );

        viewport.addEventListener(
            "pointermove",
            (event) => {
                if (!isDragging) {
                    return;
                }

                viewport.scrollLeft =
                    startingScrollLeft -
                    (
                        event.clientX -
                        startX
                    );
            }
        );

        function endDragging(event) {
            if (!isDragging) {
                return;
            }

            isDragging = false;

            viewport.classList.remove(
                "is-dragging"
            );

            if (
                viewport.hasPointerCapture?.(
                    event.pointerId
                )
            ) {
                viewport.releasePointerCapture(
                    event.pointerId
                );
            }

            requestUpdate();
        }

        viewport.addEventListener(
            "pointerup",
            endDragging
        );

        viewport.addEventListener(
            "pointercancel",
            endDragging
        );

        viewport.addEventListener(
            "keydown",
            (event) => {
                if (event.key === "ArrowLeft") {
                    event.preventDefault();

                    scrollByCard(-1);
                }

                if (event.key === "ArrowRight") {
                    event.preventDefault();

                    scrollByCard(1);
                }
            }
        );

        window.addEventListener(
            "resize",
            requestUpdate,
            {
                passive: true
            }
        );

        updateCarousel();
    });
}

document.documentElement.classList.add("js-reveal-ready");