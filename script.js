document.addEventListener("DOMContentLoaded", () => {
    const currentYear = document.getElementById("currentYear");

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }

    initialisePricingFlipbook();
});


function initialisePricingFlipbook() {
    /*
     * ADD OR REMOVE YOUR CATALOGUE IMAGES HERE.
     *
     * The order of this array determines the order
     * in which the pages appear in the flipbook.
     */
    const cataloguePages = [
        "assets/images/flipbook/25.png",
        "assets/images/flipbook/26.png",
        "assets/images/flipbook/27.png",
        "assets/images/flipbook/28.png",
        "assets/images/flipbook/29.png",
        "assets/images/flipbook/30.png",
        "assets/images/flipbook/31.png",
        "assets/images/flipbook/32.png",
        "assets/images/flipbook/33.png",
        "assets/images/flipbook/34.png",
        "assets/images/flipbook/35.png",
        "assets/images/flipbook/36.png",
        "assets/images/flipbook/37.png",
        "assets/images/flipbook/38.png",
        "assets/images/flipbook/39.png"
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

    if (
        !modal ||
        !flipbookElement ||
        !previousButton ||
        !nextButton ||
        !currentPageElement ||
        !totalPagesElement
    ) {
        return;
    }

    let pageFlip = null;
    let modalIsOpen = false;
    let flipbookIsReady = false;
    let flipbookIsAnimating = false;
    let lastFocusedElement = null;


    /*
     * Preload each catalogue page before StPageFlip starts.
     * This prevents blank pages and reduces visible flickering.
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
     * Calculate a fixed page size based on the available space.
     * Keeping the dimensions fixed while the modal is open helps
     * prevent layout changes during page-turn animations.
     */
    function getPageDimensions() {
        const availableWidth = Math.max(
            window.innerWidth - 220,
            280
        );

        const availableHeight = Math.max(
            window.innerHeight - 230,
            360
        );

        const isMobile = window.innerWidth <= 950;

        /*
         * Change this ratio when your Canva page dimensions differ.
         *
         * 1.414 is suitable for an A-series portrait page.
         * Height = width × 1.414
         */
        const pageRatio = 1.414;

        if (isMobile) {
            let pageWidth = Math.min(
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
         * In landscape mode StPageFlip shows two portrait pages.
         * The width below is the width of one individual page.
         */
        let pageWidth = Math.min(
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

            return;
        }

        const dimensions = getPageDimensions();

        pageFlip = new St.PageFlip(flipbookElement, {
            width: dimensions.width,
            height: dimensions.height,

            size: "fixed",
            autoSize: false,

            usePortrait: dimensions.usePortrait,
            showCover: true,

            drawShadow: true,
            maxShadowOpacity: 0.2,

            flippingTime: 700,

            mobileScrollSupport: true,
            swipeDistance: 30,

            showPageCorners: false,
            disableFlipByClick: false,

            startPage: 0,
            startZIndex: 10
        });

        /*
         * The catalogue pages are loaded from the JavaScript
         * array at the top of this file.
         */
        pageFlip.loadFromImages(cataloguePages);

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

        totalPagesElement.textContent = pageFlip.getPageCount();

        flipbookElement.classList.add("is-ready");

        if (loadingElement) {
            loadingElement.classList.add("is-hidden");
        }

        flipbookIsReady = true;

        updatePageInformation();
    }


    function updatePageInformation() {
        if (!pageFlip) {
            return;
        }

        const currentIndex = pageFlip.getCurrentPageIndex();
        const totalPages = pageFlip.getPageCount();

        currentPageElement.textContent = currentIndex + 1;
        totalPagesElement.textContent = totalPages;

        previousButton.disabled = currentIndex <= 0;

        nextButton.disabled = currentIndex >= totalPages - 1;
    }


    async function openFlipbook() {
        if (modalIsOpen) {
            return;
        }

        lastFocusedElement = document.activeElement;
        modalIsOpen = true;

        modal.classList.add("is-open");
        modal.setAttribute("aria-hidden", "false");

        document.body.classList.add("flipbook-open");

        /*
         * Wait until the modal has been painted before calculating
         * the dimensions of the flipbook.
         */
        await waitForNextPaint();

        if (!flipbookIsReady) {
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

            createFlipbook();
        }

        const closeButton = document.getElementById(
            "closeFlipbook"
        );

        if (closeButton) {
            closeButton.focus();
        }
    }


    function closeFlipbook() {
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
    }


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


    function waitForNextPaint() {
        return new Promise((resolve) => {
            requestAnimationFrame(() => {
                requestAnimationFrame(resolve);
            });
        });
    }


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


    function exitFullscreen() {
        if (document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {
                // The browser may already be leaving full-screen mode.
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


    function toggleFullscreen() {
        if (
            document.fullscreenElement ||
            document.webkitFullscreenElement
        ) {
            exitFullscreen();
        } else {
            enterFullscreen();
        }
    }


    openButtons.forEach((button) => {
        button.addEventListener("click", openFlipbook);
    });


    closeButtons.forEach((button) => {
        button.addEventListener("click", closeFlipbook);
    });


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


    nextButton.addEventListener("click", () => {
        if (!pageFlip || flipbookIsAnimating) {
            return;
        }

        const finalPageIndex = pageFlip.getPageCount() - 1;

        if (pageFlip.getCurrentPageIndex() >= finalPageIndex) {
            return;
        }

        flipbookIsAnimating = true;
        pageFlip.flipNext();
    });


    if (fullscreenButton) {
        fullscreenButton.addEventListener(
            "click",
            toggleFullscreen
        );
    }


    document.addEventListener("keydown", (event) => {
        if (!modalIsOpen) {
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
                    flipbookIsAnimating = true;
                    pageFlip.flipNext();
                }

                break;

            default:
                break;
        }
    });


    /*
     * Keep the Full Screen button label accurate.
     */
    document.addEventListener("fullscreenchange", () => {
        if (!fullscreenButton) {
            return;
        }

        fullscreenButton.textContent =
            document.fullscreenElement
                ? "Exit Full Screen"
                : "Full Screen";
    });
}