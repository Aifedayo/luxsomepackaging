document.addEventListener("DOMContentLoaded", () => {
    initialiseCurrentYear();
    initialiseMobileMenu();
    initialiseReveals();
    initialiseTagCarousels();
});

function initialiseCurrentYear() {
    const currentYear = document.getElementById("currentYear");

    if (currentYear) {
        currentYear.textContent = String(new Date().getFullYear());
    }
}

function initialiseMobileMenu() {
    const button = document.getElementById("mobileMenuButton");
    const navigation = document.getElementById("siteNavigation");

    if (!button || !navigation) {
        return;
    }

    function closeMenu() {
        button.classList.remove("is-active");
        navigation.classList.remove("is-open");
        button.setAttribute("aria-expanded", "false");
        document.body.classList.remove("menu-open");
    }

    button.addEventListener("click", () => {
        const shouldOpen = !navigation.classList.contains("is-open");

        button.classList.toggle("is-active", shouldOpen);
        navigation.classList.toggle("is-open", shouldOpen);
        button.setAttribute("aria-expanded", String(shouldOpen));
        document.body.classList.toggle("menu-open", shouldOpen);
    });

    navigation.addEventListener("click", (event) => {
        if (event.target.closest("a")) {
            closeMenu();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 900) {
            closeMenu();
        }
    });
}

function initialiseReveals() {
    const elements = Array.from(
        document.querySelectorAll(".tags-reveal")
    );

    if (elements.length === 0) {
        return;
    }

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    if (
        reducedMotion.matches ||
        !("IntersectionObserver" in window)
    ) {
        elements.forEach((element) => {
            element.classList.add("is-visible");
        });

        return;
    }

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    return;
                }

                entry.target.classList.add("is-visible");
                observer.unobserve(entry.target);
            });
        },
        {
            threshold: 0.14,
            rootMargin: "0px 0px -8% 0px"
        }
    );

    elements.forEach((element) => {
        observer.observe(element);
    });
}

function initialiseTagCarousels() {
    const carousels = Array.from(
        document.querySelectorAll("[data-tags-carousel]")
    );

    carousels.forEach((carousel) => {
        if (carousel.dataset.initialised === "true") {
            return;
        }

        carousel.dataset.initialised = "true";

        const viewport = carousel.querySelector(
            "[data-tags-viewport]"
        );

        const track = carousel.querySelector(
            ".tags-carousel__track"
        );

        const previousButton = carousel.querySelector(
            "[data-tags-previous]"
        );

        const nextButton = carousel.querySelector(
            "[data-tags-next]"
        );

        const progressBar = carousel.querySelector(
            "[data-tags-progress]"
        );

        if (!viewport || !track) {
            return;
        }

        let isDragging = false;
        let startX = 0;
        let startingScrollLeft = 0;
        let hasDragged = false;
        let frame = null;

        function getMaximumScroll() {
            return Math.max(
                0,
                viewport.scrollWidth - viewport.clientWidth
            );
        }

        function getCardDistance() {
            const card = track.querySelector(
                ".tags-carousel-card"
            );

            if (!card) {
                return viewport.clientWidth * 0.75;
            }

            const computedStyle = window.getComputedStyle(track);
            const gap = parseFloat(computedStyle.gap) || 0;

            return card.offsetWidth + gap;
        }

        function updateCarousel() {
            const maximumScroll = getMaximumScroll();
            const currentScroll = viewport.scrollLeft;

            const progress =
                maximumScroll > 0
                    ? currentScroll / maximumScroll
                    : 0;

            previousButton?.toggleAttribute(
                "disabled",
                currentScroll <= 2
            );

            nextButton?.toggleAttribute(
                "disabled",
                currentScroll >= maximumScroll - 2
            );

            if (progressBar) {
                const parent = progressBar.parentElement;

                const availableMovement = Math.max(
                    0,
                    (parent?.clientWidth || 0) -
                        progressBar.offsetWidth
                );

                progressBar.style.transform =
                    `translateX(${progress * availableMovement}px)`;
            }
        }

        function requestUpdate() {
            if (frame !== null) {
                cancelAnimationFrame(frame);
            }

            frame = requestAnimationFrame(updateCarousel);
        }

        function scrollByCard(direction) {
            viewport.scrollBy({
                left: getCardDistance() * direction,
                behavior: "smooth"
            });
        }

        previousButton?.addEventListener("click", () => {
            scrollByCard(-1);
        });

        nextButton?.addEventListener("click", () => {
            scrollByCard(1);
        });

        viewport.addEventListener(
            "scroll",
            requestUpdate,
            { passive: true }
        );

        viewport.addEventListener("pointerdown", (event) => {
            if (
                event.pointerType !== "mouse" ||
                event.button !== 0
            ) {
                return;
            }

            isDragging = true;
            hasDragged = false;
            startX = event.clientX;
            startingScrollLeft = viewport.scrollLeft;

            viewport.classList.add("is-dragging");
            viewport.setPointerCapture?.(event.pointerId);
        });

        viewport.addEventListener("pointermove", (event) => {
            if (!isDragging) {
                return;
            }

            const movement = event.clientX - startX;

            if (Math.abs(movement) > 5) {
                hasDragged = true;
            }

            viewport.scrollLeft =
                startingScrollLeft - movement;
        });

        function finishDragging(event) {
            if (!isDragging) {
                return;
            }

            isDragging = false;
            viewport.classList.remove("is-dragging");

            if (
                viewport.hasPointerCapture?.(event.pointerId)
            ) {
                viewport.releasePointerCapture(event.pointerId);
            }

            requestUpdate();
        }

        viewport.addEventListener(
            "pointerup",
            finishDragging
        );

        viewport.addEventListener(
            "pointercancel",
            finishDragging
        );

        viewport.addEventListener(
            "click",
            (event) => {
                if (!hasDragged) {
                    return;
                }

                event.preventDefault();
                event.stopPropagation();
                hasDragged = false;
            },
            true
        );

        viewport.addEventListener("keydown", (event) => {
            if (event.key === "ArrowLeft") {
                event.preventDefault();
                scrollByCard(-1);
            }

            if (event.key === "ArrowRight") {
                event.preventDefault();
                scrollByCard(1);
            }
        });

        window.addEventListener(
            "resize",
            requestUpdate,
            { passive: true }
        );

        updateCarousel();
    });
}
