document.addEventListener("DOMContentLoaded", () => {
    const scene = document.getElementById("collectionScene");
    const viewport = document.getElementById("collectionViewport");
    const track = document.getElementById("collectionTrack");

    if (!scene || !viewport || !track) {
        return;
    }

    const filters = Array.from(
        document.querySelectorAll(".collection-filter")
    );

    const originalSlides = Array.from(
        track.querySelectorAll(".collection-slide")
    );

    const currentLabel = document.getElementById(
        "collectionCurrent"
    );

    const totalLabel = document.getElementById(
        "collectionTotal"
    );

    const emptyState = document.getElementById(
        "collectionEmpty"
    );

    const reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    );

    let visibleSlides = [];
    let loopWidth = 0;
    let animationFrame = null;

    function formatNumber(number) {
        return String(number).padStart(2, "0");
    }

    function removeClones() {
        track
            .querySelectorAll("[data-gallery-clone='true']")
            .forEach((clone) => {
                clone.remove();
            });
    }

    function getVisibleOriginalSlides() {
        return originalSlides.filter((slide) => {
            return !slide.hidden;
        });
    }

    function cloneVisibleSlides() {
        removeClones();

        visibleSlides.forEach((slide) => {
            const clone = slide.cloneNode(true);

            clone.dataset.galleryClone = "true";
            clone.setAttribute("aria-hidden", "true");

            track.appendChild(clone);
        });
    }

    function calculateLoopWidth() {
        if (!visibleSlides.length) {
            loopWidth = 0;
            return;
        }

        const firstOriginal = visibleSlides[0];

        const firstClone = track.querySelector(
            "[data-gallery-clone='true']"
        );

        if (!firstClone) {
            loopWidth = track.scrollWidth;
            return;
        }

        loopWidth =
            firstClone.offsetLeft -
            firstOriginal.offsetLeft;
    }

    function getSceneProgress() {
        const sceneRect = scene.getBoundingClientRect();

        const scrollableDistance =
            scene.offsetHeight -
            window.innerHeight;

        if (scrollableDistance <= 0) {
            return 0;
        }

        const progress =
            -sceneRect.top /
            scrollableDistance;

        return Math.min(
            1,
            Math.max(0, progress)
        );
    }

    function getNormalisedSlideCentre(
        slide,
        offset
    ) {
        let centre =
            slide.offsetLeft +
            slide.offsetWidth / 2 -
            offset;

        while (
            centre <
            -slide.offsetWidth
        ) {
            centre += loopWidth;
        }

        while (
            centre >
            viewport.clientWidth +
                slide.offsetWidth
        ) {
            centre -= loopWidth;
        }

        return centre;
    }

    function updateCurrentSlide(offset) {
        if (
            !visibleSlides.length ||
            !loopWidth
        ) {
            return;
        }

        const viewportCentre =
            viewport.clientWidth / 2;

        let nearestIndex = 0;
        let nearestDistance = Infinity;

        visibleSlides.forEach(
            (slide, index) => {
                const slideCentre =
                    getNormalisedSlideCentre(
                        slide,
                        offset
                    );

                const distance = Math.abs(
                    slideCentre -
                    viewportCentre
                );

                if (
                    distance <
                    nearestDistance
                ) {
                    nearestDistance = distance;
                    nearestIndex = index;
                }
            }
        );

        track
            .querySelectorAll(
                ".collection-slide"
            )
            .forEach((slide) => {
                slide.classList.remove(
                    "is-current"
                );
            });

        const currentOriginal =
            visibleSlides[nearestIndex];

        const clonedSlides = Array.from(
            track.querySelectorAll(
                "[data-gallery-clone='true']"
            )
        );

        const currentClone =
            clonedSlides[nearestIndex];

        currentOriginal?.classList.add(
            "is-current"
        );

        currentClone?.classList.add(
            "is-current"
        );

        if (currentLabel) {
            currentLabel.textContent =
                formatNumber(
                    nearestIndex + 1
                );
        }
    }

    function renderGallery() {
        animationFrame = null;

        if (
            !visibleSlides.length ||
            !loopWidth
        ) {
            track.style.transform =
                "translate3d(0, 0, 0)";

            return;
        }

        const progress =
            getSceneProgress();

        const numberOfLoops =
            reducedMotion.matches
                ? 1
                : 4;

        const totalTravel =
            loopWidth *
            numberOfLoops;

        const offset =
            (progress *
                totalTravel) %
            loopWidth;

        track.style.transform =
            `translate3d(${-offset}px, 0, 0)`;

        updateCurrentSlide(offset);
    }

    function requestRender() {
        if (
            animationFrame !== null
        ) {
            return;
        }

        animationFrame =
            requestAnimationFrame(
                renderGallery
            );
    }

    function rebuildGallery() {
        visibleSlides =
            getVisibleOriginalSlides();

        const hasSlides =
            visibleSlides.length > 0;

        if (emptyState) {
            emptyState.hidden =
                hasSlides;
        }

        track.hidden = !hasSlides;

        if (!hasSlides) {
            removeClones();

            loopWidth = 0;

            if (currentLabel) {
                currentLabel.textContent =
                    "00";
            }

            if (totalLabel) {
                totalLabel.textContent =
                    "00";
            }

            requestRender();

            return;
        }

        cloneVisibleSlides();

        requestAnimationFrame(() => {
            calculateLoopWidth();

            if (totalLabel) {
                totalLabel.textContent =
                    formatNumber(
                        visibleSlides.length
                    );
            }

            requestRender();
        });
    }

    function applyFilter(category) {
        originalSlides.forEach(
            (slide) => {
                const matches =
                    category === "all" ||
                    slide.dataset.category ===
                        category;

                slide.hidden = !matches;
            }
        );

        filters.forEach((button) => {
            const selected =
                (
                    button.dataset.filter ||
                    "all"
                ) === category;

            button.classList.toggle(
                "is-active",
                selected
            );

            button.setAttribute(
                "aria-pressed",
                String(selected)
            );
        });

        rebuildGallery();
    }

    filters.forEach((button) => {
        button.addEventListener(
            "click",
            () => {
                applyFilter(
                    button.dataset.filter ||
                        "all"
                );
            }
        );
    });

    window.addEventListener(
        "scroll",
        requestRender,
        {
            passive: true
        }
    );

    window.addEventListener(
        "resize",
        () => {
            calculateLoopWidth();
            requestRender();
        }
    );

    window.addEventListener(
        "load",
        () => {
            calculateLoopWidth();
            requestRender();
        }
    );

    reducedMotion.addEventListener(
        "change",
        requestRender
    );

    applyFilter("all");
});