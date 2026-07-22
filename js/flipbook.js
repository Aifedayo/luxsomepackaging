document.addEventListener("DOMContentLoaded", () => {
    initialisePricingFlipbook();
    initialiseProductFlipbook();
});

function initialisePricingFlipbook() {
    /*
     * Add or remove catalogue images here.
     * The order of this array determines the page order.
     */
    const cataloguePages = [
        "assets/images/flipbook/25.jpg",
        "assets/images/flipbook/26.jpg",
        "assets/images/flipbook/27.jpg",
        "assets/images/flipbook/28.jpg",
        "assets/images/flipbook/29.jpg",
        "assets/images/flipbook/30.jpg",
        "assets/images/flipbook/31.jpg",
        "assets/images/flipbook/32.jpg",
        "assets/images/flipbook/33.jpg",
        "assets/images/flipbook/34.jpg",
        "assets/images/flipbook/35.jpg",
        "assets/images/flipbook/36.jpg",
        "assets/images/flipbook/37.jpg",
        "assets/images/flipbook/38.jpg",
        "assets/images/flipbook/39.jpg"
    ];

    const modal = document.getElementById("flipbookModal");
    const flipbookElement = document.getElementById("flipbook");
    const loadingElement = document.getElementById("flipbookLoading");

    const previousButton = document.getElementById("previousPage");
    const nextButton = document.getElementById("nextPage");
    const fullscreenButton = document.getElementById("fullscreenButton");

    const currentPageElement = document.getElementById("currentPage");
    const totalPagesElement = document.getElementById("totalPages");

    const openButtons = document.querySelectorAll(
        "[data-open-flipbook]"
    );

    const closeButtons = document.querySelectorAll(
        "[data-close-flipbook]"
    );

    /*
     * Stop if essential flipbook elements do not exist.
     */
    if (
        !modal ||
        !flipbookElement ||
        !previousButton ||
        !nextButton ||
        !currentPageElement ||
        !totalPagesElement
    ) {
        console.warn(
            "The flipbook could not initialise because required HTML elements are missing."
        );

        return;
    }

    let pageFlip = null;
    let modalIsOpen = false;
    let flipbookIsReady = false;
    let flipbookIsAnimating = false;
    let lastFocusedElement = null;

    let previousTapTime = 0;
    let previousTapImage = null;

    let resizeTimer = null;


    /*
     * Preload catalogue pages before creating the flipbook.
     */
    function preloadImages(imagePaths) {
        const promises = imagePaths.map((imagePath) => {
            return new Promise((resolve) => {
                const image = new Image();

                image.onload = () => {
                    resolve({
                        path: imagePath,
                        loaded: true
                    });
                };

                image.onerror = () => {
                    console.error(
                        `Catalogue image could not load: ${imagePath}`
                    );

                    resolve({
                        path: imagePath,
                        loaded: false
                    });
                };

                image.src = imagePath;
            });
        });

        return Promise.all(promises);
    }


    /*
     * Calculate the appropriate page dimensions.
     *
     * Original catalogue image dimensions:
     * 1591 × 2250 pixels.
     */
    function getPageDimensions() {
        const sourceWidth = 1591;
        const sourceHeight = 2250;

        const pageRatio = sourceHeight / sourceWidth;

        const isMobile = window.innerWidth <= 950;

        const availableWidth = Math.max(
            window.innerWidth - (isMobile ? 30 : 220),
            280
        );

        const availableHeight = Math.max(
            window.innerHeight - (isMobile ? 170 : 230),
            340
        );

        /*
         * Mobile displays one portrait page.
         */
        if (isMobile) {
            const pageWidth = Math.min(
                availableWidth,
                availableHeight / pageRatio,
                480
            );

            return {
                width: Math.floor(pageWidth),
                height: Math.floor(pageWidth * pageRatio),
                usePortrait: true
            };
        }

        /*
         * Desktop displays a two-page spread.
         */
        const pageWidth = Math.min(
            availableWidth / 2,
            availableHeight / pageRatio,
            520
        );

        return {
            width: Math.floor(pageWidth),
            height: Math.floor(pageWidth * pageRatio),
            usePortrait: false
        };
    }


    /*
     * Generate the HTML pages used by StPageFlip.
     */
    function generateFlipbookPages() {
        flipbookElement.innerHTML = "";

        cataloguePages.forEach((imagePath, index) => {
            const page = document.createElement("div");

            page.className = "flipbook-page";
            page.dataset.pageIndex = String(index);

            page.style.width = "100%";
            page.style.height = "100%";
            page.style.display = "flex";
            page.style.alignItems = "center";
            page.style.justifyContent = "center";
            page.style.overflow = "hidden";

            const image = document.createElement("img");

            image.src = imagePath;
            image.alt = `Luxsome pricing catalogue page ${index + 1}`;

            image.width = 1591;
            image.height = 2250;

            image.draggable = false;
            image.dataset.pageIndex = String(index);

            image.title = "Double-click to enlarge";

            image.style.width = "100%";
            image.style.height = "100%";
            image.style.display = "block";
            image.style.objectFit = "contain";

            image.style.userSelect = "none";
            image.style.webkitUserSelect = "none";
            image.style.webkitUserDrag = "none";

            page.appendChild(image);
            flipbookElement.appendChild(page);
        });

        return flipbookElement.querySelectorAll(".flipbook-page");
    }


    /*
     * Create the StPageFlip instance.
     */
    function createFlipbook() {
        if (pageFlip || flipbookIsReady) {
            return;
        }

        if (
            typeof St === "undefined" ||
            typeof St.PageFlip !== "function"
        ) {
            showLoadingError(
                "The catalogue viewer could not be loaded."
            );

            console.error(
                "StPageFlip was not found. Confirm that page-flip.browser.js is loaded before this file."
            );

            return;
        }

        const dimensions = getPageDimensions();
        const pages = generateFlipbookPages();

        pageFlip = new St.PageFlip(flipbookElement, {
            width: dimensions.width,
            height: dimensions.height,

            size: "fixed",
            autoSize: false,

            usePortrait: dimensions.usePortrait,
            showCover: true,

            drawShadow: true,
            maxShadowOpacity: 0.15,

            flippingTime: 700,

            mobileScrollSupport: true,
            swipeDistance: 30,

            showPageCorners: false,
            disableFlipByClick: true,

            startPage: 0,
            startZIndex: 10
        });

        /*
         * Load real HTML elements instead of canvas-rendered images.
         */
        pageFlip.loadFromHTML(pages);

        pageFlip.on("flip", () => {
            flipbookIsAnimating = false;
            updatePageInformation();
        });

        pageFlip.on("changeState", (event) => {
            flipbookIsAnimating =
                event.data === "flipping";
        
            if (event.data === "read") {
                flipbookIsAnimating = false;
            }
        });

        pageFlip.on("changeOrientation", () => {
            updatePageInformation();
        });

        pageFlip.on("init", () => {
            updatePageInformation();
        });

        totalPagesElement.textContent = String(pages.length);

        flipbookElement.classList.add("is-ready");

        if (loadingElement) {
            loadingElement.classList.add("is-hidden");
        }

        flipbookIsReady = true;

        updatePageInformation();
    }


    /*
     * Destroy and rebuild the flipbook after a major screen resize.
     */
    function rebuildFlipbook() {
        if (!flipbookIsReady || !pageFlip) {
            return;
        }

        const currentIndex = pageFlip.getCurrentPageIndex();

        try {
            pageFlip.destroy();
        } catch (error) {
            console.warn(
                "The existing flipbook instance could not be destroyed cleanly.",
                error
            );
        }

        pageFlip = null;
        flipbookIsReady = false;
        flipbookIsAnimating = false;

        flipbookElement.classList.remove("is-ready");

        createFlipbook();

        if (pageFlip && currentIndex > 0) {
            const finalIndex = pageFlip.getPageCount() - 1;
            const safeIndex = Math.min(currentIndex, finalIndex);

            pageFlip.turnToPage(safeIndex);
        }
    }


    /*
     * Open the selected catalogue page in PhotoSwipe.
     */
    function openPageZoom(pageIndex) {
        if (!Number.isInteger(pageIndex)) {
            return;
        }

        if (typeof window.openCatalogueZoom !== "function") {
            console.error(
                "PhotoSwipe has not finished loading or window.openCatalogueZoom is missing."
            );

            return;
        }

        window.openCatalogueZoom(pageIndex);
    }


    /*
     * Update the page number and navigation button states.
     */
    function updatePageInformation() {
        if (!pageFlip) {
            return;
        }

        const currentIndex = pageFlip.getCurrentPageIndex();
        const totalPages = pageFlip.getPageCount();

        currentPageElement.textContent = String(currentIndex + 1);
        totalPagesElement.textContent = String(totalPages);

        previousButton.disabled = currentIndex <= 0;
        nextButton.disabled = currentIndex >= totalPages - 1;
    }


    /*
     * Open the flipbook modal.
     */
    async function openFlipbook(event) {
        if (event) {
            event.preventDefault();
        }

        if (modalIsOpen) {
            return;
        }

        lastFocusedElement = document.activeElement;
        modalIsOpen = true;

        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");

        document.body.classList.add("flipbook-open");

        /*
         * Wait for the modal to become visible before calculating dimensions.
         */
        await waitForNextPaint();

        if (!flipbookIsReady) {
            if (loadingElement) {
                loadingElement.classList.remove("is-hidden");
            }

            const results = await preloadImages(cataloguePages);

            const successfulImages = results.filter(
                (result) => result.loaded
            );

            if (successfulImages.length === 0) {
                showLoadingError(
                    "The catalogue pages could not be loaded."
                );

                return;
            }

            if (successfulImages.length < cataloguePages.length) {
                console.warn(
                    `${cataloguePages.length - successfulImages.length} catalogue image(s) failed to load.`
                );
            }

            createFlipbook();
        }

        const closeButton = document.getElementById(
            "closePricingFlipbook"
        );

        if (closeButton) {
            closeButton.focus();
        }
    }


    /*
     * Close the flipbook modal.
     */
    function closeFlipbook(event) {
        if (event) {
            event.preventDefault();
        }

        if (!modalIsOpen) {
            return;
        }

        modalIsOpen = false;

        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");

        document.body.classList.remove("flipbook-open");

        exitFullscreen();

        if (
            lastFocusedElement &&
            typeof lastFocusedElement.focus === "function"
        ) {
            lastFocusedElement.focus();
        }

        if (pageFlip) {
            pageFlip.turnToPage(0);
        }
        updatePageInformation();
    }


    /*
     * Display an error inside the loading area.
     */
    function showLoadingError(message) {
        if (!loadingElement) {
            return;
        }

        loadingElement.classList.remove("is-hidden");
        loadingElement.innerHTML = "";

        const messageElement = document.createElement("span");
        messageElement.textContent = message;

        loadingElement.appendChild(messageElement);
    }


    /*
     * Wait for two animation frames.
     */
    function waitForNextPaint() {
        return new Promise((resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
            });
        });
    }


    /*
     * Enter fullscreen mode.
     */
    function enterFullscreen() {
        const dialog = modal.querySelector(".flipbook-dialog");

        if (!dialog) {
            return;
        }

        if (dialog.requestFullscreen) {
            dialog.requestFullscreen().catch((error) => {
                console.error(
                    "Full-screen mode could not be started:",
                    error
                );
            });

            return;
        }

        if (dialog.webkitRequestFullscreen) {
            dialog.webkitRequestFullscreen();
        }
    }


    /*
     * Exit fullscreen mode.
     */
    function exitFullscreen() {
        if (
            document.fullscreenElement &&
            document.exitFullscreen
        ) {
            document.exitFullscreen().catch(() => {
                /*
                 * The browser may already be leaving fullscreen mode.
                 */
            });

            return;
        }

        if (
            document.webkitFullscreenElement &&
            document.webkitExitFullscreen
        ) {
            document.webkitExitFullscreen();
        }
    }


    /*
     * Toggle fullscreen mode.
     */
    function toggleFullscreen(event) {
        if (event) {
            event.preventDefault();
        }

        if (
            document.fullscreenElement ||
            document.webkitFullscreenElement
        ) {
            exitFullscreen();
        } else {
            enterFullscreen();
        }
    }


    /*
     * Open-button listeners.
     */
    openButtons.forEach((button) => {
        button.addEventListener("click", openFlipbook);
    });


    /*
     * Close-button and backdrop listeners.
     */
    closeButtons.forEach((button) => {
        button.addEventListener("click", closeFlipbook);
    });


    /*
     * Previous page.
     */
    previousButton.addEventListener("click", () => {
        if (
            !pageFlip ||
            flipbookIsAnimating ||
            pageFlip.getCurrentPageIndex() <= 0
        ) {
            return;
        }

        flipbookIsAnimating = true;
        pageFlip.flipPrev();
    });


    /*
     * Next page.
     */
    nextButton.addEventListener("click", () => {
        if (!pageFlip || flipbookIsAnimating) {
            return;
        }

        const finalPageIndex = pageFlip.getPageCount() - 1;

        if (
            pageFlip.getCurrentPageIndex() >= finalPageIndex
        ) {
            return;
        }

        flipbookIsAnimating = true;
        pageFlip.flipNext();
    });


    /*
     * Fullscreen button.
     */
    if (fullscreenButton) {
        fullscreenButton.addEventListener(
            "click",
            toggleFullscreen
        );
    }


    /*
     * Desktop: double-click a catalogue page to enlarge it.
     */
    flipbookElement.addEventListener("dblclick", (event) => {
        const image = event.target.closest(
            ".flipbook-page img"
        );

        if (!image) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const pageIndex = Number(
            image.dataset.pageIndex
        );

        if (!Number.isInteger(pageIndex)) {
            return;
        }

        openPageZoom(pageIndex);
    });


    /*
     * Mobile: double-tap a catalogue page to enlarge it.
     */
    flipbookElement.addEventListener(
        "touchend",
        (event) => {
            const image = event.target.closest(
                ".flipbook-page img"
            );

            if (!image) {
                previousTapTime = 0;
                previousTapImage = null;
                return;
            }

            const currentTapTime = Date.now();
            const tapDelay =
                currentTapTime - previousTapTime;

            const isDoubleTap =
                previousTapImage === image &&
                tapDelay > 0 &&
                tapDelay < 350;

            if (isDoubleTap) {
                event.preventDefault();
                event.stopPropagation();

                const pageIndex = Number(
                    image.dataset.pageIndex
                );

                if (Number.isInteger(pageIndex)) {
                    openPageZoom(pageIndex);
                }

                previousTapTime = 0;
                previousTapImage = null;

                return;
            }

            previousTapTime = currentTapTime;
            previousTapImage = image;
        },
        {
            passive: false
        }
    );


    /*
     * Keyboard navigation.
     */
    document.addEventListener("keydown", (event) => {
        if (!modalIsOpen) {
            return;
        }

        /*
         * Let PhotoSwipe handle keyboard input while it is open.
         */
        if (
            document.querySelector(".pswp") &&
            document.querySelector(".pswp").classList.contains(
                "pswp--open"
            )
        ) {
            return;
        }

        switch (event.key) {
            case "Escape":
                closeFlipbook();
                break;

            case "ArrowLeft":
                if (
                    pageFlip &&
                    !flipbookIsAnimating &&
                    pageFlip.getCurrentPageIndex() > 0
                ) {
                    event.preventDefault();

                    flipbookIsAnimating = true;
                    pageFlip.flipPrev();
                }

                break;

            case "ArrowRight":
                if (
                    pageFlip &&
                    !flipbookIsAnimating &&
                    pageFlip.getCurrentPageIndex() <
                        pageFlip.getPageCount() - 1
                ) {
                    event.preventDefault();

                    flipbookIsAnimating = true;
                    pageFlip.flipNext();
                }

                break;

            default:
                break;
        }
    });


    /*
     * Update fullscreen button text.
     */
    function updateFullscreenButtonText() {
        if (!fullscreenButton) {
            return;
        }

        const isFullscreen =
            Boolean(document.fullscreenElement) ||
            Boolean(document.webkitFullscreenElement);

        fullscreenButton.textContent = isFullscreen
            ? "Exit Full Screen"
            : "Full Screen";
    }

    document.addEventListener(
        "fullscreenchange",
        updateFullscreenButtonText
    );

    document.addEventListener(
        "webkitfullscreenchange",
        updateFullscreenButtonText
    );


    /*
     * Rebuild the flipbook after the window size changes.
     */
    window.addEventListener("resize", () => {
        if (!modalIsOpen || !flipbookIsReady) {
            return;
        }

        window.clearTimeout(resizeTimer);

        resizeTimer = window.setTimeout(() => {
            rebuildFlipbook();
        }, 300);
    });
}


// Catalogue Flip Book Section
function initialiseProductFlipbook() {
    /*
     * Add or remove catalogue images here.
     * The order of this array determines the page order.
     */
    

    const productCataloguePages = Array.from(
        { length: 15 },
        (_, index) =>
            `assets/images/flipbook/${index + 1}.png`
    );

    const cataloguePages = productCataloguePages;

    const modal = document.getElementById("productFlipbookModal");
    const flipbookElement = document.getElementById("productFlipbook");
    const loadingElement = document.getElementById("productFlipbookLoading");

    const previousButton = document.getElementById("productPreviousPage");
    const nextButton = document.getElementById("productNextPage");
    const fullscreenButton = document.getElementById("productFullscreenButton");

    const currentPageElement = document.getElementById("productCurrentPage");
    const totalPagesElement = document.getElementById("productTotalPages");

    const openButtons = document.querySelectorAll(
        "[data-open-product-flipbook]"
    );

    const closeButtons = document.querySelectorAll(
        "[data-close-product-flipbook]"
    );

    /*
     * Stop if essential flipbook elements do not exist.
     */
    if (
        !modal ||
        !flipbookElement ||
        !previousButton ||
        !nextButton ||
        !currentPageElement ||
        !totalPagesElement
    ) {
        console.warn(
            "The flipbook could not initialise because required HTML elements are missing."
        );

        return;
    }

    let pageFlip = null;
    let modalIsOpen = false;
    let flipbookIsReady = false;
    let flipbookIsAnimating = false;
    let lastFocusedElement = null;

    let previousTapTime = 0;
    let previousTapImage = null;

    let resizeTimer = null;


    /*
     * Preload catalogue pages before creating the flipbook.
     */
    function preloadImages(imagePaths) {
        const promises = imagePaths.map((imagePath) => {
            return new Promise((resolve) => {
                const image = new Image();

                image.onload = () => {
                    resolve({
                        path: imagePath,
                        loaded: true
                    });
                };

                image.onerror = () => {
                    console.error(
                        `Catalogue image could not load: ${imagePath}`
                    );

                    resolve({
                        path: imagePath,
                        loaded: false
                    });
                };

                image.src = imagePath;
            });
        });

        return Promise.all(promises);
    }


    /*
     * Calculate the appropriate page dimensions.
     *
     * Original catalogue image dimensions:
     * 1591 × 2250 pixels.
     */
    function getPageDimensions() {
        const sourceWidth = 1591;
        const sourceHeight = 2250;

        const pageRatio = sourceHeight / sourceWidth;

        const isMobile = window.innerWidth <= 950;

        const availableWidth = Math.max(
            window.innerWidth - (isMobile ? 30 : 220),
            280
        );

        const availableHeight = Math.max(
            window.innerHeight - (isMobile ? 170 : 230),
            340
        );

        /*
         * Mobile displays one portrait page.
         */
        if (isMobile) {
            const pageWidth = Math.min(
                availableWidth,
                availableHeight / pageRatio,
                480
            );

            return {
                width: Math.floor(pageWidth),
                height: Math.floor(pageWidth * pageRatio),
                usePortrait: true
            };
        }

        /*
         * Desktop displays a two-page spread.
         */
        const pageWidth = Math.min(
            availableWidth / 2,
            availableHeight / pageRatio,
            520
        );

        return {
            width: Math.floor(pageWidth),
            height: Math.floor(pageWidth * pageRatio),
            usePortrait: false
        };
    }


    /*
     * Generate the HTML pages used by StPageFlip.
     */
    function generateFlipbookPages() {
        flipbookElement.innerHTML = "";

        cataloguePages.forEach((imagePath, index) => {
            const page = document.createElement("div");

            page.className = "flipbook-page";
            page.dataset.pageIndex = String(index);

            page.style.width = "100%";
            page.style.height = "100%";
            page.style.display = "flex";
            page.style.alignItems = "center";
            page.style.justifyContent = "center";
            page.style.overflow = "hidden";

            const image = document.createElement("img");

            image.src = imagePath;
            image.alt = `Luxsome pricing catalogue page ${index + 1}`;

            image.width = 1591;
            image.height = 2250;

            image.draggable = false;
            image.dataset.pageIndex = String(index);

            image.title = "Double-click to enlarge";

            image.style.width = "100%";
            image.style.height = "100%";
            image.style.display = "block";
            image.style.objectFit = "contain";

            image.style.userSelect = "none";
            image.style.webkitUserSelect = "none";
            image.style.webkitUserDrag = "none";

            page.appendChild(image);
            flipbookElement.appendChild(page);
        });

        return flipbookElement.querySelectorAll(".flipbook-page");
    }


    /*
     * Create the StPageFlip instance.
     */
    function createFlipbook() {
        if (pageFlip || flipbookIsReady) {
            return;
        }

        if (
            typeof St === "undefined" ||
            typeof St.PageFlip !== "function"
        ) {
            showLoadingError(
                "The catalogue viewer could not be loaded."
            );

            console.error(
                "StPageFlip was not found. Confirm that page-flip.browser.js is loaded before this file."
            );

            return;
        }

        const dimensions = getPageDimensions();
        const pages = generateFlipbookPages();

        pageFlip = new St.PageFlip(flipbookElement, {
            width: dimensions.width,
            height: dimensions.height,

            size: "fixed",
            autoSize: false,

            usePortrait: dimensions.usePortrait,
            showCover: true,

            drawShadow: true,
            maxShadowOpacity: 0.15,

            flippingTime: 700,

            mobileScrollSupport: true,
            swipeDistance: 30,

            showPageCorners: false,
            disableFlipByClick: true,

            startPage: 0,
            startZIndex: 10
        });

        /*
         * Load real HTML elements instead of canvas-rendered images.
         */
        pageFlip.loadFromHTML(pages);

        pageFlip.on("flip", () => {
            flipbookIsAnimating = false;
            updatePageInformation();
        });

        pageFlip.on("changeState", (event) => {
            flipbookIsAnimating = event.data === "flipping";
        });

        pageFlip.on("changeOrientation", () => {
            updatePageInformation();
        });

        pageFlip.on("init", () => {
            updatePageInformation();
        });

        totalPagesElement.textContent = String(pages.length);

        flipbookElement.classList.add("is-ready");

        if (loadingElement) {
            loadingElement.classList.add("is-hidden");
        }

        flipbookIsReady = true;

        updatePageInformation();
    }


    /*
     * Destroy and rebuild the flipbook after a major screen resize.
     */
    function rebuildFlipbook() {
        if (!flipbookIsReady || !pageFlip) {
            return;
        }

        const currentIndex = pageFlip.getCurrentPageIndex();

        try {
            pageFlip.destroy();
        } catch (error) {
            console.warn(
                "The existing flipbook instance could not be destroyed cleanly.",
                error
            );
        }

        pageFlip = null;
        flipbookIsReady = false;
        flipbookIsAnimating = false;

        flipbookElement.classList.remove("is-ready");

        createFlipbook();

        if (pageFlip && currentIndex > 0) {
            const finalIndex = pageFlip.getPageCount() - 1;
            const safeIndex = Math.min(currentIndex, finalIndex);

            pageFlip.turnToPage(safeIndex);
        }
    }


    /*
     * Open the selected catalogue page in PhotoSwipe.
     */
    function openPageZoom(pageIndex) {
        if (!Number.isInteger(pageIndex)) {
            return;
        }

        if (typeof window.openCatalogueZoom !== "function") {
            console.error(
                "PhotoSwipe has not finished loading or window.openCatalogueZoom is missing."
            );

            return;
        }

        window.openProductCatalogueZoom(pageIndex);
    }


    /*
     * Update the page number and navigation button states.
     */
    function updatePageInformation() {
        if (!pageFlip) {
            return;
        }

        const currentIndex = pageFlip.getCurrentPageIndex();
        const totalPages = pageFlip.getPageCount();

        currentPageElement.textContent = String(currentIndex + 1);
        totalPagesElement.textContent = String(totalPages);

        previousButton.disabled = currentIndex <= 0;
        nextButton.disabled = currentIndex >= totalPages - 1;
    }


    /*
     * Open the flipbook modal.
     */
    async function openFlipbook(event) {
        if (event) {
            event.preventDefault();
        }

        if (modalIsOpen) {
            return;
        }

        lastFocusedElement = document.activeElement;
        modalIsOpen = true;

        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");

        document.body.classList.add("flipbook-open");

        /*
         * Wait for the modal to become visible before calculating dimensions.
         */
        await waitForNextPaint();

        if (!flipbookIsReady) {
            if (loadingElement) {
                loadingElement.classList.remove("is-hidden");
            }

            const results = await preloadImages(cataloguePages);

            const successfulImages = results.filter(
                (result) => result.loaded
            );

            if (successfulImages.length === 0) {
                showLoadingError(
                    "The catalogue pages could not be loaded."
                );

                return;
            }

            if (successfulImages.length < cataloguePages.length) {
                console.warn(
                    `${cataloguePages.length - successfulImages.length} catalogue image(s) failed to load.`
                );
            }

            createFlipbook();
        }

        const closeButton = document.getElementById(
            "closeFlipbook"
        );

        if (closeButton) {
            closeButton.focus();
        }
    }


    /*
     * Close the flipbook modal.
     */
    function closeFlipbook(event) {
        if (event) {
            event.preventDefault();
        }

        if (!modalIsOpen) {
            return;
        }

        modalIsOpen = false;

        modal.classList.remove("is-open");
        modal.setAttribute("aria-hidden", "true");

        document.body.classList.remove("flipbook-open");

        exitFullscreen();

        if (
            lastFocusedElement &&
            typeof lastFocusedElement.focus === "function"
        ) {
            lastFocusedElement.focus();
        }

        setTimeout(() => {
            if (pageFlip) {
                pageFlip.turnToPage(0);
                updatePageInformation();
            }
        }, 300); // Match your modal's closing animation duration
    }


    /*
     * Display an error inside the loading area.
     */
    function showLoadingError(message) {
        if (!loadingElement) {
            return;
        }

        loadingElement.classList.remove("is-hidden");
        loadingElement.innerHTML = "";

        const messageElement = document.createElement("span");
        messageElement.textContent = message;

        loadingElement.appendChild(messageElement);
    }


    /*
     * Wait for two animation frames.
     */
    function waitForNextPaint() {
        return new Promise((resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
            });
        });
    }


    /*
     * Enter fullscreen mode.
     */
    function enterFullscreen() {
        const dialog = modal.querySelector(".flipbook-dialog");

        if (!dialog) {
            return;
        }

        if (dialog.requestFullscreen) {
            dialog.requestFullscreen().catch((error) => {
                console.error(
                    "Full-screen mode could not be started:",
                    error
                );
            });

            return;
        }

        if (dialog.webkitRequestFullscreen) {
            dialog.webkitRequestFullscreen();
        }
    }


    /*
     * Exit fullscreen mode.
     */
    function exitFullscreen() {
        if (
            document.fullscreenElement &&
            document.exitFullscreen
        ) {
            document.exitFullscreen().catch(() => {
                /*
                 * The browser may already be leaving fullscreen mode.
                 */
            });

            return;
        }

        if (
            document.webkitFullscreenElement &&
            document.webkitExitFullscreen
        ) {
            document.webkitExitFullscreen();
        }
    }


    /*
     * Toggle fullscreen mode.
     */
    function toggleFullscreen(event) {
        if (event) {
            event.preventDefault();
        }

        if (
            document.fullscreenElement ||
            document.webkitFullscreenElement
        ) {
            exitFullscreen();
        } else {
            enterFullscreen();
        }
    }


    /*
     * Open-button listeners.
     */
    openButtons.forEach((button) => {
        button.addEventListener("click", openFlipbook);
    });


    /*
     * Close-button and backdrop listeners.
     */
    closeButtons.forEach((button) => {
        button.addEventListener("click", closeFlipbook);
    });


    /*
     * Previous page.
     */
    previousButton.addEventListener("click", () => {
        if (
            !pageFlip ||
            flipbookIsAnimating ||
            pageFlip.getCurrentPageIndex() <= 0
        ) {
            return;
        }

        flipbookIsAnimating = true;
        pageFlip.flipPrev();
    });


    /*
     * Next page.
     */
    nextButton.addEventListener("click", () => {
        if (!pageFlip || flipbookIsAnimating) {
            return;
        }

        const finalPageIndex = pageFlip.getPageCount() - 1;

        if (
            pageFlip.getCurrentPageIndex() >= finalPageIndex
        ) {
            return;
        }

        flipbookIsAnimating = true;
        pageFlip.flipNext();
    });


    /*
     * Fullscreen button.
     */
    if (fullscreenButton) {
        fullscreenButton.addEventListener(
            "click",
            toggleFullscreen
        );
    }


    /*
     * Desktop: double-click a catalogue page to enlarge it.
     */
    flipbookElement.addEventListener("dblclick", (event) => {
        const image = event.target.closest(
            ".flipbook-page img"
        );

        if (!image) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const pageIndex = Number(
            image.dataset.pageIndex
        );

        if (!Number.isInteger(pageIndex)) {
            return;
        }

        openPageZoom(pageIndex);
    });


    /*
     * Mobile: double-tap a catalogue page to enlarge it.
     */
    flipbookElement.addEventListener(
        "touchend",
        (event) => {
            const image = event.target.closest(
                ".flipbook-page img"
            );

            if (!image) {
                previousTapTime = 0;
                previousTapImage = null;
                return;
            }

            const currentTapTime = Date.now();
            const tapDelay =
                currentTapTime - previousTapTime;

            const isDoubleTap =
                previousTapImage === image &&
                tapDelay > 0 &&
                tapDelay < 350;

            if (isDoubleTap) {
                event.preventDefault();
                event.stopPropagation();

                const pageIndex = Number(
                    image.dataset.pageIndex
                );

                if (Number.isInteger(pageIndex)) {
                    openPageZoom(pageIndex);
                }

                previousTapTime = 0;
                previousTapImage = null;

                return;
            }

            previousTapTime = currentTapTime;
            previousTapImage = image;
        },
        {
            passive: false
        }
    );


    /*
     * Keyboard navigation.
     */
    document.addEventListener("keydown", (event) => {
        if (!modalIsOpen) {
            return;
        }

        /*
         * Let PhotoSwipe handle keyboard input while it is open.
         */
        if (
            document.querySelector(".pswp") &&
            document.querySelector(".pswp").classList.contains(
                "pswp--open"
            )
        ) {
            return;
        }

        switch (event.key) {
            case "Escape":
                closeFlipbook();
                break;

            case "ArrowLeft":
                if (
                    pageFlip &&
                    !flipbookIsAnimating &&
                    pageFlip.getCurrentPageIndex() > 0
                ) {
                    event.preventDefault();

                    flipbookIsAnimating = true;
                    pageFlip.flipPrev();
                }

                break;

            case "ArrowRight":
                if (
                    pageFlip &&
                    !flipbookIsAnimating &&
                    pageFlip.getCurrentPageIndex() <
                        pageFlip.getPageCount() - 1
                ) {
                    event.preventDefault();

                    flipbookIsAnimating = true;
                    pageFlip.flipNext();
                }

                break;

            default:
                break;
        }
    });


    /*
     * Update fullscreen button text.
     */
    function updateFullscreenButtonText() {
        if (!fullscreenButton) {
            return;
        }

        const isFullscreen =
            Boolean(document.fullscreenElement) ||
            Boolean(document.webkitFullscreenElement);

        fullscreenButton.textContent = isFullscreen
            ? "Exit Full Screen"
            : "Full Screen";
    }

    document.addEventListener(
        "fullscreenchange",
        updateFullscreenButtonText
    );

    document.addEventListener(
        "webkitfullscreenchange",
        updateFullscreenButtonText
    );


    /*
     * Rebuild the flipbook after the window size changes.
     */
    window.addEventListener("resize", () => {
        if (!modalIsOpen || !flipbookIsReady) {
            return;
        }

        window.clearTimeout(resizeTimer);

        resizeTimer = window.setTimeout(() => {
            rebuildFlipbook();
        }, 300);
    });
}