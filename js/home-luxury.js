"use strict";

document.addEventListener("DOMContentLoaded", () => {
    initLuxuryReveals();
    initLuxuryParallax();
    initHomeRunway();
});

/* =========================================================
   REVEAL
========================================================= */

function initLuxuryReveals() {
    const elements = Array.from(
        document.querySelectorAll(".reveal-lux")
    );

    if (!elements.length) return;

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
        (entries, revealObserver) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) return;

                entry.target.classList.add("is-visible");
                revealObserver.unobserve(entry.target);
            });
        },
        {
            threshold: 0.15,
            rootMargin: "0px 0px -8% 0px"
        }
    );

    elements.forEach((element, index) => {
        element.style.transitionDelay =
            `${Math.min(index % 3, 2) * 90}ms`;

        observer.observe(element);
    });
}

/* =========================================================
   VERY SUBTLE PRODUCT PARALLAX
========================================================= */

function initLuxuryParallax() {
    const visuals = Array.from(
        document.querySelectorAll("[data-lux-parallax]")
    );

    if (!visuals.length) return;

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    if (reducedMotion.matches) return;

    let frame = null;

    function update() {
        frame = null;

        const viewportHeight = window.innerHeight;

        visuals.forEach((visual) => {
            const rectangle =
                visual.getBoundingClientRect();

            if (
                rectangle.bottom < 0 ||
                rectangle.top > viewportHeight
            ) {
                return;
            }

            const centre =
                rectangle.top +
                rectangle.height / 2;

            const distance =
                (centre - viewportHeight / 2) /
                viewportHeight;

            const movement =
                Math.max(-1, Math.min(1, distance)) *
                -12;

            visual.style.setProperty(
                "--lux-parallax-y",
                `${movement}px`
            );

            /*
             * Keep the main float animation and add only
             * a tiny image movement inside the visual.
             */
            const image = visual.querySelector("img");

            if (image) {
                image.style.transform =
                    `translate3d(0, ${movement}px, 0)`;
            }
        });
    }

    function requestUpdate() {
        if (frame !== null) return;

        frame = window.requestAnimationFrame(update);
    }

    window.addEventListener(
        "scroll",
        requestUpdate,
        { passive: true }
    );

    window.addEventListener(
        "resize",
        requestUpdate,
        { passive: true }
    );

    requestUpdate();
}

/* =========================================================
   ENDLESS HOME RUNWAY
========================================================= */

function initHomeRunway() {
    const viewport =
        document.getElementById("homeRunway");

    const track =
        viewport?.querySelector(".lux-runway__track");

    if (!viewport || !track) return;

    const originalItems = Array.from(
        track.children
    );

    if (originalItems.length < 2) return;

    originalItems.forEach((item) => {
        const clone = item.cloneNode(true);

        clone.setAttribute("aria-hidden", "true");
        clone.dataset.runwayClone = "true";

        track.appendChild(clone);
    });

    let loopWidth = 0;
    let animationFrame = null;
    let lastTime = 0;
    let position = 0;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartScrollLeft = 0;
    let pauseUntil = 0;

    const speed = 18;
    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    function calculateLoopWidth() {
        const firstOriginal = originalItems[0];

        const firstClone = track.querySelector(
            "[data-runway-clone='true']"
        );

        if (!firstOriginal || !firstClone) {
            loopWidth = 0;
            return;
        }

        loopWidth =
            firstClone.offsetLeft -
            firstOriginal.offsetLeft;
    }

    function normalise() {
        if (!loopWidth) return;

        while (viewport.scrollLeft >= loopWidth) {
            viewport.scrollLeft -= loopWidth;
        }

        while (viewport.scrollLeft < 0) {
            viewport.scrollLeft += loopWidth;
        }

        position = viewport.scrollLeft;
    }

    function pause(delay = 1400) {
        pauseUntil = performance.now() + delay;
        position = viewport.scrollLeft;
    }

    function animate(timestamp) {
        if (!lastTime) lastTime = timestamp;

        const elapsed = Math.min(
            timestamp - lastTime,
            50
        );

        lastTime = timestamp;

        if (
            !document.hidden &&
            !isDragging &&
            !reducedMotion.matches &&
            loopWidth > 0 &&
            timestamp >= pauseUntil
        ) {
            position +=
                speed *
                (elapsed / 1000);

            viewport.scrollLeft = position;
            normalise();
        }

        animationFrame =
            window.requestAnimationFrame(animate);
    }

    viewport.addEventListener(
        "scroll",
        () => {
            normalise();
        },
        { passive: true }
    );

    viewport.addEventListener(
        "wheel",
        () => {
            pause();
        },
        { passive: true }
    );

    viewport.addEventListener(
        "touchstart",
        () => {
            pause();
        },
        { passive: true }
    );

    viewport.addEventListener(
        "touchend",
        () => {
            position = viewport.scrollLeft;
            pause();
        },
        { passive: true }
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
            dragStartX = event.clientX;
            dragStartScrollLeft =
                viewport.scrollLeft;

            viewport.classList.add(
                "is-dragging"
            );

            viewport.setPointerCapture?.(
                event.pointerId
            );

            pause();
        }
    );

    viewport.addEventListener(
        "pointermove",
        (event) => {
            if (!isDragging) return;

            const movement =
                event.clientX -
                dragStartX;

            viewport.scrollLeft =
                dragStartScrollLeft -
                movement;

            position = viewport.scrollLeft;
            normalise();
        }
    );

    function finishDrag(event) {
        if (!isDragging) return;

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

        position = viewport.scrollLeft;
        pause();
    }

    viewport.addEventListener(
        "pointerup",
        finishDrag
    );

    viewport.addEventListener(
        "pointercancel",
        finishDrag
    );

    window.addEventListener(
        "resize",
        () => {
            calculateLoopWidth();
            normalise();
        },
        { passive: true }
    );

    window.addEventListener(
        "load",
        () => {
            calculateLoopWidth();
            position = viewport.scrollLeft;
        },
        { once: true }
    );

    calculateLoopWidth();
    position = viewport.scrollLeft;

    animationFrame =
        window.requestAnimationFrame(animate);
}
