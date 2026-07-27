document.addEventListener("DOMContentLoaded", () => {
    const viewport = document.getElementById("collectionViewport");
    const track = document.getElementById("collectionTrack");

    if (!viewport || !track) {
        console.warn(
            "Luxsome gallery: #collectionViewport or #collectionTrack was not found."
        );
        return;
    }

    const filterButtons = Array.from(
        document.querySelectorAll(".collection-filter")
    );

    const currentLabel = document.getElementById("collectionCurrent");
    const totalLabel = document.getElementById("collectionTotal");
    const emptyState = document.getElementById("collectionEmpty");

    /*
     * Only collect the real slides once.
     * Cloned slides will be marked with data-gallery-clone.
     */
    const originalSlides = Array.from(
        track.querySelectorAll(
            ".collection-slide:not([data-gallery-clone='true'])"
        )
    );

    /*
     * Gallery settings
     */
    const AUTOPLAY_SPEED = 60; // Pixels per second
    const RESUME_DELAY = 1600; // Delay after user interaction
    const DRAG_THRESHOLD = 4;

    let visibleSlides = [];
    let cloneSlides = [];

    let loopWidth = 0;
    let autoplayPosition = 0;

    let animationFrameId = null;
    let lastFrameTime = 0;
    let pauseUntil = 0;

    let isDragging = false;
    let dragMoved = false;

    let dragStartX = 0;
    let dragStartScrollLeft = 0;

    let resizeFrame = null;

    /*
     * Helpers
     */

    function formatNumber(number) {
        return String(number).padStart(2, "0");
    }

    function getVisibleOriginalSlides() {
        return originalSlides.filter((slide) => !slide.hidden);
    }

    function removeClones() {
        track
            .querySelectorAll("[data-gallery-clone='true']")
            .forEach((clone) => clone.remove());

        cloneSlides = [];
    }

    /*
     * We create two additional copies:
     *
     * Set 1: clone
     * Set 2: original
     * Set 3: clone
     *
     * The gallery begins inside the middle set.
     * This permits seamless movement in either direction.
     */
    function createCloneSets() {
        removeClones();

        if (!visibleSlides.length) {
            return;
        }

        const firstCloneFragment = document.createDocumentFragment();
        const secondCloneFragment = document.createDocumentFragment();

        visibleSlides.forEach((slide) => {
            const firstClone = slide.cloneNode(true);

            firstClone.dataset.galleryClone = "true";
            firstClone.dataset.cloneSet = "before";
            firstClone.setAttribute("aria-hidden", "true");

            firstCloneFragment.appendChild(firstClone);
        });

        visibleSlides.forEach((slide) => {
            const secondClone = slide.cloneNode(true);

            secondClone.dataset.galleryClone = "true";
            secondClone.dataset.cloneSet = "after";
            secondClone.setAttribute("aria-hidden", "true");

            secondCloneFragment.appendChild(secondClone);
        });

        /*
         * Put one clone set before the originals.
         */
        track.insertBefore(
            firstCloneFragment,
            track.firstChild
        );

        /*
         * Put one clone set after the originals.
         */
        track.appendChild(secondCloneFragment);

        cloneSlides = Array.from(
            track.querySelectorAll("[data-gallery-clone='true']")
        );
    }

    function calculateLoopWidth() {
        if (!visibleSlides.length) {
            loopWidth = 0;
            return;
        }

        const firstOriginal = visibleSlides[0];

        const firstAfterClone = track.querySelector(
            "[data-gallery-clone='true'][data-clone-set='after']"
        );

        if (!firstOriginal || !firstAfterClone) {
            loopWidth = 0;
            return;
        }

        loopWidth =
            firstAfterClone.offsetLeft -
            firstOriginal.offsetLeft;
    }

    /*
     * Keep the scroll position inside the middle repeated set.
     *
     * The reset is invisible because each set is identical.
     */
    function normaliseScrollPosition() {
        if (!loopWidth) {
            return;
        }

        const minimumPosition = loopWidth * 0.5;
        const maximumPosition = loopWidth * 2.5;

        if (viewport.scrollLeft >= maximumPosition) {
            viewport.scrollLeft -= loopWidth;
        } else if (viewport.scrollLeft <= minimumPosition) {
            viewport.scrollLeft += loopWidth;
        }

        autoplayPosition = viewport.scrollLeft;
    }

    function pauseAutoplayTemporarily(delay = RESUME_DELAY) {
        pauseUntil = performance.now() + delay;
        lastFrameTime = performance.now();
        autoplayPosition = viewport.scrollLeft;
    }

    function getCurrentSlideIndex() {
        if (!visibleSlides.length || !loopWidth) {
            return 0;
        }

        const viewportCentre =
            viewport.scrollLeft +
            viewport.clientWidth / 2;

        let nearestIndex = 0;
        let nearestDistance = Infinity;

        /*
         * Compare each real slide in the previous,
         * current and next repeated sets.
         */
        visibleSlides.forEach((slide, index) => {
            const originalCentre =
                slide.offsetLeft +
                slide.offsetWidth / 2;

            const possibleCentres = [
                originalCentre - loopWidth,
                originalCentre,
                originalCentre + loopWidth
            ];

            possibleCentres.forEach((centre) => {
                const distance = Math.abs(
                    centre - viewportCentre
                );

                if (distance < nearestDistance) {
                    nearestDistance = distance;
                    nearestIndex = index;
                }
            });
        });

        return nearestIndex;
    }

    function updateCurrentSlide() {
        if (!visibleSlides.length) {
            if (currentLabel) {
                currentLabel.textContent = "00";
            }

            return;
        }

        const currentIndex = getCurrentSlideIndex();

        track
            .querySelectorAll(".collection-slide")
            .forEach((slide) => {
                slide.classList.remove("is-current");
            });

        /*
         * Highlight every repeated copy of the current slide.
         */
        const allRenderedSlides = Array.from(
            track.querySelectorAll(".collection-slide")
        );

        allRenderedSlides.forEach((slide) => {
            const slideIndex = Number(
                slide.dataset.galleryIndex
            );

            if (slideIndex === currentIndex) {
                slide.classList.add("is-current");
            }
        });

        if (currentLabel) {
            currentLabel.textContent =
                formatNumber(currentIndex + 1);
        }
    }

    function assignSlideIndexes() {
        visibleSlides.forEach((slide, index) => {
            slide.dataset.galleryIndex = String(index);
        });

        track
            .querySelectorAll(
                "[data-gallery-clone='true'][data-clone-set='before']"
            )
            .forEach((slide, index) => {
                slide.dataset.galleryIndex = String(index);
            });

        track
            .querySelectorAll(
                "[data-gallery-clone='true'][data-clone-set='after']"
            )
            .forEach((slide, index) => {
                slide.dataset.galleryIndex = String(index);
            });
    }

    /*
     * Autoplay
     */

    function autoplay(timestamp) {
        if (!lastFrameTime) {
            lastFrameTime = timestamp;
        }

        /*
         * Prevent a large jump after switching browser tabs.
         */
        const elapsedMilliseconds = Math.min(
            timestamp - lastFrameTime,
            50
        );

        lastFrameTime = timestamp;

        const canAutoplay =
            !document.hidden &&
            !isDragging &&
            loopWidth > 0 &&
            timestamp >= pauseUntil;

        if (canAutoplay) {
            const distance =
                AUTOPLAY_SPEED *
                (elapsedMilliseconds / 1000);

            /*
             * Keep our own floating-point position.
             * This prevents very small movements from being
             * rounded away by some browsers.
             */
            autoplayPosition += distance;

            viewport.scrollLeft = autoplayPosition;

            normaliseScrollPosition();
            updateCurrentSlide();
        }

        animationFrameId =
            requestAnimationFrame(autoplay);
    }

    function startAutoplay() {
        if (animationFrameId !== null) {
            cancelAnimationFrame(animationFrameId);
        }

        autoplayPosition = viewport.scrollLeft;
        lastFrameTime = performance.now();

        animationFrameId =
            requestAnimationFrame(autoplay);
    }

    /*
     * Native scroll handling
     */

    function handleViewportScroll() {
        normaliseScrollPosition();
        updateCurrentSlide();
    }

    /*
     * Mouse drag handling
     *
     * Touch devices continue using their native scrolling.
     */

    function handlePointerDown(event) {
        pauseAutoplayTemporarily();

        if (
            event.pointerType === "mouse" &&
            event.button !== 0
        ) {
            return;
        }

        /*
         * Allow phones and tablets to use native touch scrolling.
         */
        if (event.pointerType !== "mouse") {
            return;
        }

        isDragging = true;
        dragMoved = false;

        dragStartX = event.clientX;
        dragStartScrollLeft = viewport.scrollLeft;

        viewport.classList.add("is-dragging");

        if (viewport.setPointerCapture) {
            viewport.setPointerCapture(event.pointerId);
        }
    }

    function handlePointerMove(event) {
        if (!isDragging || event.pointerType !== "mouse") {
            return;
        }

        const movement =
            event.clientX -
            dragStartX;

        if (Math.abs(movement) > DRAG_THRESHOLD) {
            dragMoved = true;
        }

        viewport.scrollLeft =
            dragStartScrollLeft -
            movement;

        autoplayPosition = viewport.scrollLeft;

        normaliseScrollPosition();
        updateCurrentSlide();
    }

    function endPointerDrag(event) {
        if (!isDragging) {
            return;
        }

        isDragging = false;

        viewport.classList.remove("is-dragging");

        if (
            viewport.hasPointerCapture &&
            viewport.hasPointerCapture(event.pointerId)
        ) {
            viewport.releasePointerCapture(
                event.pointerId
            );
        }

        autoplayPosition = viewport.scrollLeft;

        pauseAutoplayTemporarily();
    }

    function preventAccidentalClick(event) {
        if (!dragMoved) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        dragMoved = false;
    }

    /*
     * Gallery rebuilding
     */

    function rebuildGallery() {
        removeClones();

        visibleSlides = getVisibleOriginalSlides();

        const hasSlides = visibleSlides.length > 0;

        track.hidden = !hasSlides;

        if (emptyState) {
            emptyState.hidden = hasSlides;
        }

        if (!hasSlides) {
            loopWidth = 0;
            autoplayPosition = 0;
            viewport.scrollLeft = 0;

            if (currentLabel) {
                currentLabel.textContent = "00";
            }

            if (totalLabel) {
                totalLabel.textContent = "00";
            }

            return;
        }

        /*
         * Temporarily put the real slides in their normal order.
         */
        visibleSlides.forEach((slide) => {
            track.appendChild(slide);
        });

        createCloneSets();
        assignSlideIndexes();

        if (totalLabel) {
            totalLabel.textContent =
                formatNumber(visibleSlides.length);
        }

        /*
         * Wait for browser layout before measuring widths.
         */
        requestAnimationFrame(() => {
            calculateLoopWidth();

            if (!loopWidth) {
                console.warn(
                    "Luxsome gallery: loop width could not be calculated."
                );
                return;
            }

            /*
             * Begin at the first slide of the middle set.
             */
            viewport.scrollLeft = loopWidth;
            autoplayPosition = loopWidth;

            updateCurrentSlide();

            /*
             * Start shortly after rebuilding.
             */
            pauseUntil = performance.now() + 300;
            lastFrameTime = performance.now();
        });
    }

    function applyFilter(category) {
        originalSlides.forEach((slide) => {
            const shouldShow =
                category === "all" ||
                slide.dataset.category === category;

            slide.hidden = !shouldShow;
        });

        filterButtons.forEach((button) => {
            const selected =
                (button.dataset.filter || "all") ===
                category;

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

    /*
     * Filter listeners
     */

    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            applyFilter(
                button.dataset.filter || "all"
            );
        });
    });

    /*
     * Gallery interaction listeners
     */

    viewport.addEventListener(
        "scroll",
        handleViewportScroll,
        { passive: true }
    );

    viewport.addEventListener(
        "pointerdown",
        handlePointerDown
    );

    viewport.addEventListener(
        "pointermove",
        handlePointerMove
    );

    viewport.addEventListener(
        "pointerup",
        endPointerDrag
    );

    viewport.addEventListener(
        "pointercancel",
        endPointerDrag
    );

    viewport.addEventListener(
        "lostpointercapture",
        () => {
            if (!isDragging) {
                return;
            }

            isDragging = false;
            viewport.classList.remove("is-dragging");

            autoplayPosition = viewport.scrollLeft;

            pauseAutoplayTemporarily();
        }
    );

    viewport.addEventListener(
        "click",
        preventAccidentalClick,
        true
    );

    /*
     * Pause briefly when a touch gesture begins.
     * Native finger scrolling remains enabled.
     */
    viewport.addEventListener(
        "touchstart",
        () => {
            pauseAutoplayTemporarily();
        },
        { passive: true }
    );

    viewport.addEventListener(
        "touchend",
        () => {
            autoplayPosition = viewport.scrollLeft;
            pauseAutoplayTemporarily();
        },
        { passive: true }
    );

    /*
     * Horizontal trackpad scrolling is handled natively.
     * Vertical mouse-wheel scrolling is never intercepted.
     */
    viewport.addEventListener(
        "wheel",
        () => {
            autoplayPosition = viewport.scrollLeft;
            pauseAutoplayTemporarily();
        },
        { passive: true }
    );

    /*
     * Browser visibility
     */

    document.addEventListener(
        "visibilitychange",
        () => {
            lastFrameTime = performance.now();
            autoplayPosition = viewport.scrollLeft;

            if (!document.hidden) {
                pauseUntil = performance.now() + 250;
            }
        }
    );

    /*
     * Resize handling
     */

    function handleResize() {
        if (resizeFrame !== null) {
            cancelAnimationFrame(resizeFrame);
        }

        resizeFrame = requestAnimationFrame(() => {
            resizeFrame = null;

            calculateLoopWidth();

            if (loopWidth) {
                normaliseScrollPosition();
                autoplayPosition = viewport.scrollLeft;
                updateCurrentSlide();
            }
        });
    }

    window.addEventListener(
        "resize",
        handleResize,
        { passive: true }
    );

    /*
     * ResizeObserver catches changes caused by fonts,
     * image dimensions and responsive layout.
     */
    if ("ResizeObserver" in window) {
        const resizeObserver =
            new ResizeObserver(handleResize);

        resizeObserver.observe(viewport);
        resizeObserver.observe(track);
    }

    /*
     * Initialisation
     */

    applyFilter("all");
    startAutoplay();

    /*
     * Recalculate once all page resources are loaded.
     */
    window.addEventListener("load", () => {
        calculateLoopWidth();

        if (loopWidth) {
            viewport.scrollLeft = loopWidth;
            autoplayPosition = loopWidth;
            updateCurrentSlide();
        }

        lastFrameTime = performance.now();
        pauseUntil = performance.now() + 300;
    });

    /*
     * Recalculate after web fonts finish loading.
     */
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
            handleResize();
        });
    }
});