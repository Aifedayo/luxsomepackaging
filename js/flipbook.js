document.addEventListener("DOMContentLoaded", () => {
    const viewers = [
        new LuxsomeFlipbook({
            name: "Pricing catalogue",
            modalId: "flipbookModal",
            flipbookId: "flipbook",
            loadingId: "flipbookLoading",
            previousButtonId: "previousPage",
            nextButtonId: "nextPage",
            fullscreenButtonId: "fullscreenButton",
            currentPageId: "currentPage",
            totalPagesId: "totalPages",
            closeButtonId: "closePricingFlipbook",
            openSelector: "[data-open-flipbook]",
            closeSelector: "[data-close-flipbook]",

            imagePaths: Array.from(
                { length: 15 },
                (_, index) =>
                    `assets/images/flipbook/${index + 25}.jpg`
            ),

            imageAltPrefix:
                "Luxsome pricing catalogue page",

            zoomHandlerName: "openCatalogueZoom"
        }),

        new LuxsomeFlipbook({
            name: "Product catalogue",
            modalId: "productFlipbookModal",
            flipbookId: "productFlipbook",
            loadingId: "productFlipbookLoading",
            previousButtonId: "productPreviousPage",
            nextButtonId: "productNextPage",
            fullscreenButtonId: "productFullscreenButton",
            currentPageId: "productCurrentPage",
            totalPagesId: "productTotalPages",
            closeButtonId: "closeFlipbook",
            openSelector: "[data-open-product-flipbook]",
            closeSelector:
                "[data-close-product-flipbook]",

            imagePaths: Array.from(
                { length: 15 },
                (_, index) =>
                    `assets/images/flipbook/${index + 1}.png`
            ),

            imageAltPrefix:
                "Luxsome product catalogue page",

            zoomHandlerName:
                "openProductCatalogueZoom"
        })
    ];

    viewers.forEach((viewer) => {
        viewer.initialise();
    });
});


class LuxsomeFlipbook {
    constructor(options) {
        this.options = {
            sourceWidth: 1591,
            sourceHeight: 2250,
            mobileBreakpoint: 950,
            flippingTime: 650,
            ...options
        };

        this.modal = document.getElementById(
            this.options.modalId
        );

        this.flipbookElement = document.getElementById(
            this.options.flipbookId
        );

        this.loadingElement = document.getElementById(
            this.options.loadingId
        );

        this.previousButton = document.getElementById(
            this.options.previousButtonId
        );

        this.nextButton = document.getElementById(
            this.options.nextButtonId
        );

        this.fullscreenButton = document.getElementById(
            this.options.fullscreenButtonId
        );

        this.currentPageElement = document.getElementById(
            this.options.currentPageId
        );

        this.totalPagesElement = document.getElementById(
            this.options.totalPagesId
        );

        this.openButtons = document.querySelectorAll(
            this.options.openSelector
        );

        this.closeButtons = document.querySelectorAll(
            this.options.closeSelector
        );

        this.pageFlip = null;

        this.modalIsOpen = false;
        this.flipbookIsReady = false;
        this.flipbookIsAnimating = false;

        this.lastFocusedElement = null;

        this.animationSafetyTimer = null;
        this.resizeTimer = null;

        this.previousTapTime = 0;
        this.previousTapImage = null;

        this.lastViewportWidth = window.innerWidth;
        this.lastLayoutMode = this.getLayoutMode();

        this.handleResize =
            this.handleResize.bind(this);

        this.handleKeydown =
            this.handleKeydown.bind(this);

        this.updateFullscreenButtonText =
            this.updateFullscreenButtonText.bind(this);
    }


    initialise() {
        if (!this.hasRequiredElements()) {
            console.warn(
                `${this.options.name} could not initialise because required HTML elements are missing.`
            );

            return;
        }

        this.totalPagesElement.textContent = String(
            this.options.imagePaths.length
        );

        this.bindEvents();
        this.updatePageInformation();
    }


    hasRequiredElements() {
        return Boolean(
            this.modal &&
            this.flipbookElement &&
            this.previousButton &&
            this.nextButton &&
            this.currentPageElement &&
            this.totalPagesElement
        );
    }


    bindEvents() {
        this.openButtons.forEach((button) => {
            button.addEventListener(
                "click",
                (event) => {
                    this.open(event);
                }
            );
        });

        this.closeButtons.forEach((button) => {
            button.addEventListener(
                "click",
                (event) => {
                    this.close(event);
                }
            );
        });

        this.previousButton.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                event.stopPropagation();

                this.navigate("previous");
            }
        );

        this.nextButton.addEventListener(
            "click",
            (event) => {
                event.preventDefault();
                event.stopPropagation();

                this.navigate("next");
            }
        );

        if (this.fullscreenButton) {
            this.fullscreenButton.addEventListener(
                "click",
                (event) => {
                    this.toggleFullscreen(event);
                }
            );
        }

        this.flipbookElement.addEventListener(
            "dblclick",
            (event) => {
                this.handleDoubleClick(event);
            }
        );

        this.flipbookElement.addEventListener(
            "touchend",
            (event) => {
                this.handleDoubleTap(event);
            },
            {
                passive: false
            }
        );

        document.addEventListener(
            "keydown",
            this.handleKeydown
        );

        document.addEventListener(
            "fullscreenchange",
            this.updateFullscreenButtonText
        );

        document.addEventListener(
            "webkitfullscreenchange",
            this.updateFullscreenButtonText
        );

        window.addEventListener(
            "resize",
            this.handleResize,
            {
                passive: true
            }
        );

        window.addEventListener(
            "orientationchange",
            () => {
                window.clearTimeout(
                    this.resizeTimer
                );

                this.resizeTimer =
                    window.setTimeout(() => {
                        this.lastViewportWidth =
                            window.innerWidth;

                        this.lastLayoutMode =
                            this.getLayoutMode();

                        this.rebuild({
                            preservePage: true,
                            reason:
                                "orientation change"
                        });
                    }, 350);
            },
            {
                passive: true
            }
        );
    }


    getLayoutMode() {
        return (
            window.innerWidth <=
            this.options.mobileBreakpoint
        )
            ? "portrait"
            : "spread";
    }


    getPageDimensions() {
        const pageRatio =
            this.options.sourceHeight /
            this.options.sourceWidth;

        const isPortrait =
            this.getLayoutMode() === "portrait";

        const viewer =
            this.modal.querySelector(
                ".flipbook-viewer"
            );

        const viewerRect =
            viewer?.getBoundingClientRect();

        const viewerWidth =
            viewerRect?.width ||
            window.innerWidth;

        const viewerHeight =
            viewerRect?.height ||
            window.innerHeight;

        const horizontalSpace =
            isPortrait ? 16 : 150;

        const verticalSpace =
            isPortrait ? 20 : 30;

        const availableWidth = Math.max(
            viewerWidth - horizontalSpace,
            260
        );

        const availableHeight = Math.max(
            viewerHeight - verticalSpace,
            320
        );

        if (isPortrait) {
            const pageWidth = Math.min(
                availableWidth,
                availableHeight / pageRatio,
                480
            );

            return {
                width: Math.max(
                    260,
                    Math.floor(pageWidth)
                ),

                height: Math.max(
                    360,
                    Math.floor(
                        pageWidth * pageRatio
                    )
                ),

                usePortrait: true
            };
        }

        const pageWidth = Math.min(
            availableWidth / 2,
            availableHeight / pageRatio,
            520
        );

        return {
            width: Math.max(
                300,
                Math.floor(pageWidth)
            ),

            height: Math.max(
                420,
                Math.floor(
                    pageWidth * pageRatio
                )
            ),

            usePortrait: false
        };
    }


    preloadImages() {
        const promises =
            this.options.imagePaths.map(
                (imagePath) => {
                    return new Promise(
                        (resolve) => {
                            const image =
                                new Image();

                            image.onload = () => {
                                resolve({
                                    path: imagePath,
                                    loaded: true
                                });
                            };

                            image.onerror = () => {
                                console.error(
                                    `${this.options.name} image could not load: ${imagePath}`
                                );

                                resolve({
                                    path: imagePath,
                                    loaded: false
                                });
                            };

                            image.src =
                                imagePath;
                        }
                    );
                }
            );

        return Promise.all(promises);
    }


    generatePages() {
        this.flipbookElement.innerHTML = "";

        this.options.imagePaths.forEach(
            (imagePath, index) => {
                const page =
                    document.createElement(
                        "div"
                    );

                const image =
                    document.createElement(
                        "img"
                    );

                page.className =
                    "flipbook-page";

                page.dataset.pageIndex =
                    String(index);

                image.src = imagePath;

                image.alt =
                    `${this.options.imageAltPrefix} ${index + 1}`;

                image.width =
                    this.options.sourceWidth;

                image.height =
                    this.options.sourceHeight;

                image.draggable = false;

                image.dataset.pageIndex =
                    String(index);

                image.title =
                    "Double-click to enlarge";

                page.appendChild(image);

                this.flipbookElement.appendChild(
                    page
                );
            }
        );

        return this.flipbookElement.querySelectorAll(
            ".flipbook-page"
        );
    }


    create() {
        if (
            this.pageFlip ||
            this.flipbookIsReady
        ) {
            return;
        }

        if (
            typeof St === "undefined" ||
            typeof St.PageFlip !== "function"
        ) {
            this.showLoadingError(
                "The catalogue viewer could not be loaded."
            );

            console.error(
                "StPageFlip was not found. Load page-flip.browser.js before flipbook.js."
            );

            return;
        }

        const dimensions =
            this.getPageDimensions();

        const pages =
            this.generatePages();

        this.pageFlip =
            new St.PageFlip(
                this.flipbookElement,
                {
                    width:
                        dimensions.width,

                    height:
                        dimensions.height,

                    size: "fixed",

                    autoSize: false,

                    usePortrait:
                        dimensions.usePortrait,

                    showCover: true,

                    drawShadow: true,

                    maxShadowOpacity: 0.12,

                    flippingTime:
                        this.options
                            .flippingTime,

                    mobileScrollSupport: true,

                    swipeDistance: 30,

                    showPageCorners: false,

                    disableFlipByClick: true,

                    startPage: 0,

                    startZIndex: 10
                }
            );

        this.pageFlip.loadFromHTML(
            pages
        );

        this.bindPageFlipEvents();

        this.flipbookElement.classList.add(
            "is-ready"
        );

        if (this.loadingElement) {
            this.loadingElement.classList.add(
                "is-hidden"
            );
        }

        this.flipbookIsReady = true;
        this.flipbookIsAnimating = false;

        this.updatePageInformation();
    }


    bindPageFlipEvents() {
        const finishAnimation = () => {
            this.flipbookIsAnimating = false;

            window.clearTimeout(
                this.animationSafetyTimer
            );

            this.updatePageInformation();
        };

        this.pageFlip.on(
            "flip",
            finishAnimation
        );

        this.pageFlip.on(
            "changeState",
            (event) => {
                if (event.data === "read") {
                    finishAnimation();
                }
            }
        );

        this.pageFlip.on(
            "changeOrientation",
            () => {
                this.updatePageInformation();
            }
        );

        this.pageFlip.on(
            "init",
            () => {
                this.updatePageInformation();
            }
        );
    }


    async open(event) {
        if (event) {
            event.preventDefault();
        }

        if (this.modalIsOpen) {
            return;
        }

        this.lastFocusedElement =
            document.activeElement;

        this.modalIsOpen = true;

        this.modal.classList.add(
            "is-open"
        );

        this.modal.setAttribute(
            "aria-hidden",
            "false"
        );

        document.body.classList.add(
            "flipbook-open"
        );

        await this.waitForVisibleLayout();

        if (!this.flipbookIsReady) {
            if (this.loadingElement) {
                this.loadingElement.classList.remove(
                    "is-hidden"
                );
            }

            const results =
                await this.preloadImages();

            const loadedCount =
                results.filter(
                    (result) =>
                        result.loaded
                ).length;

            if (loadedCount === 0) {
                this.showLoadingError(
                    "The catalogue pages could not be loaded."
                );

                return;
            }

            if (
                loadedCount <
                this.options.imagePaths.length
            ) {
                console.warn(
                    `${this.options.imagePaths.length - loadedCount} ${this.options.name} image(s) failed to preload.`
                );
            }

            this.create();
        } else {
            this.safeUpdate();
        }

        const closeButton =
            document.getElementById(
                this.options.closeButtonId
            );

        if (closeButton) {
            closeButton.focus();
        }
    }


    close(event) {
        if (event) {
            event.preventDefault();
        }

        if (!this.modalIsOpen) {
            return;
        }

        this.modalIsOpen = false;
        this.flipbookIsAnimating = false;

        window.clearTimeout(
            this.animationSafetyTimer
        );

        this.modal.classList.remove(
            "is-open"
        );

        this.modal.setAttribute(
            "aria-hidden",
            "true"
        );

        document.body.classList.remove(
            "flipbook-open"
        );

        this.exitFullscreen();

        if (
            this.lastFocusedElement &&
            typeof this.lastFocusedElement.focus ===
                "function"
        ) {
            this.lastFocusedElement.focus();
        }

        /*
         * Wait until the closing animation
         * has finished before resetting.
         *
         * Calling pageFlip while the modal is
         * hidden can cause blank pages on mobile.
         */
        window.setTimeout(() => {
            if (!this.pageFlip) {
                return;
            }

            try {
                this.pageFlip.turnToPage(0);
            } catch (error) {
                console.warn(
                    `${this.options.name} could not reset cleanly.`,
                    error
                );
            }

            this.updatePageInformation();
        }, 300);
    }


    navigate(direction) {
        if (
            !this.pageFlip ||
            this.flipbookIsAnimating
        ) {
            return;
        }

        const currentIndex =
            this.pageFlip
                .getCurrentPageIndex();

        const finalIndex =
            this.pageFlip
                .getPageCount() - 1;

        const targetIndex =
            direction === "previous"
                ? currentIndex - 1
                : currentIndex + 1;

        if (
            targetIndex < 0 ||
            targetIndex > finalIndex
        ) {
            return;
        }

        this.flipbookIsAnimating = true;

        this.setNavigationDisabled(true);

        try {
            if (direction === "previous") {
                this.pageFlip.flipPrev();
            } else {
                this.pageFlip.flipNext();
            }
        } catch (error) {
            console.warn(
                `${this.options.name} animated navigation failed. Falling back to direct navigation.`,
                error
            );

            this.pageFlip.turnToPage(
                targetIndex
            );
        }

        window.clearTimeout(
            this.animationSafetyTimer
        );

        /*
         * Mobile Safari occasionally fails to
         * finish a page-turn animation.
         *
         * This verifies that the expected page
         * was reached and recovers if necessary.
         */
        this.animationSafetyTimer =
            window.setTimeout(() => {
                if (!this.pageFlip) {
                    return;
                }

                const actualIndex =
                    this.pageFlip
                        .getCurrentPageIndex();

                if (
                    actualIndex !==
                    targetIndex
                ) {
                    try {
                        this.pageFlip.turnToPage(
                            targetIndex
                        );
                    } catch (error) {
                        console.error(
                            `${this.options.name} recovery navigation failed.`,
                            error
                        );
                    }
                }

                this.flipbookIsAnimating =
                    false;

                this.safeUpdate();

                this.updatePageInformation();
            },
            this.options.flippingTime + 350
        );
    }


    setNavigationDisabled(disabled) {
        this.previousButton.disabled =
            disabled;

        this.nextButton.disabled =
            disabled;
    }


    updatePageInformation() {
        if (!this.pageFlip) {
            this.currentPageElement.textContent =
                "1";

            this.totalPagesElement.textContent =
                String(
                    this.options
                        .imagePaths.length
                );

            this.previousButton.disabled =
                true;

            this.nextButton.disabled =
                this.options
                    .imagePaths.length <= 1;

            return;
        }

        const currentIndex =
            this.pageFlip
                .getCurrentPageIndex();

        const pageCount =
            this.pageFlip
                .getPageCount();

        this.currentPageElement.textContent =
            String(currentIndex + 1);

        this.totalPagesElement.textContent =
            String(pageCount);

        if (!this.flipbookIsAnimating) {
            this.previousButton.disabled =
                currentIndex <= 0;

            this.nextButton.disabled =
                currentIndex >=
                pageCount - 1;
        }
    }


    safeUpdate() {
        if (!this.pageFlip) {
            return;
        }

        try {
            if (
                typeof this.pageFlip.update ===
                "function"
            ) {
                this.pageFlip.update();
            }
        } catch (error) {
            console.warn(
                `${this.options.name} update failed.`,
                error
            );
        }
    }


    async rebuild({
        preservePage = true,
        reason = "layout change"
    } = {}) {
        if (
            !this.modalIsOpen ||
            !this.flipbookIsReady ||
            !this.pageFlip
        ) {
            return;
        }

        const currentIndex =
            preservePage
                ? this.pageFlip
                    .getCurrentPageIndex()
                : 0;

        this.flipbookIsAnimating =
            false;

        window.clearTimeout(
            this.animationSafetyTimer
        );

        try {
            this.pageFlip.destroy();
        } catch (error) {
            console.warn(
                `${this.options.name} could not be destroyed cleanly during ${reason}.`,
                error
            );
        }

        this.pageFlip = null;
        this.flipbookIsReady = false;

        this.flipbookElement.classList.remove(
            "is-ready"
        );

        this.flipbookElement.innerHTML = "";

        await this.waitForVisibleLayout();

        this.create();

        if (!this.pageFlip) {
            return;
        }

        const safeIndex = Math.min(
            currentIndex,
            this.pageFlip.getPageCount() - 1
        );

        if (safeIndex > 0) {
            this.pageFlip.turnToPage(
                safeIndex
            );
        }

        this.safeUpdate();
        this.updatePageInformation();
    }


    handleResize() {
        if (
            !this.modalIsOpen ||
            !this.flipbookIsReady
        ) {
            return;
        }

        const currentWidth =
            window.innerWidth;

        const currentLayoutMode =
            this.getLayoutMode();

        const layoutModeChanged =
            currentLayoutMode !==
            this.lastLayoutMode;

        const widthDifference =
            Math.abs(
                currentWidth -
                this.lastViewportWidth
            );

        const meaningfulWidthChange =
            widthDifference >= 80;

        /*
         * Ignore height-only changes caused by
         * mobile browser address bars.
         */
        if (
            !layoutModeChanged &&
            !meaningfulWidthChange
        ) {
            return;
        }

        this.lastViewportWidth =
            currentWidth;

        this.lastLayoutMode =
            currentLayoutMode;

        window.clearTimeout(
            this.resizeTimer
        );

        this.resizeTimer =
            window.setTimeout(() => {
                this.rebuild({
                    preservePage: true,
                    reason:
                        "viewport width change"
                });
            }, 350);
    }


    handleKeydown(event) {
        if (!this.modalIsOpen) {
            return;
        }

        const photoSwipe =
            document.querySelector(
                ".pswp"
            );

        if (
            photoSwipe &&
            photoSwipe.classList.contains(
                "pswp--open"
            )
        ) {
            return;
        }

        switch (event.key) {
            case "Escape":
                this.close();
                break;

            case "ArrowLeft":
                event.preventDefault();
                this.navigate("previous");
                break;

            case "ArrowRight":
                event.preventDefault();
                this.navigate("next");
                break;

            default:
                break;
        }
    }


    handleDoubleClick(event) {
        const image =
            event.target.closest(
                ".flipbook-page img"
            );

        if (!image) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const pageIndex =
            Number(
                image.dataset.pageIndex
            );

        this.openZoom(pageIndex);
    }


    handleDoubleTap(event) {
        const image =
            event.target.closest(
                ".flipbook-page img"
            );

        if (!image) {
            this.previousTapTime = 0;
            this.previousTapImage = null;

            return;
        }

        const currentTapTime =
            Date.now();

        const tapDelay =
            currentTapTime -
            this.previousTapTime;

        const isDoubleTap =
            this.previousTapImage === image &&
            tapDelay > 0 &&
            tapDelay < 350;

        if (isDoubleTap) {
            event.preventDefault();
            event.stopPropagation();

            const pageIndex =
                Number(
                    image.dataset.pageIndex
                );

            this.openZoom(pageIndex);

            this.previousTapTime = 0;
            this.previousTapImage = null;

            return;
        }

        this.previousTapTime =
            currentTapTime;

        this.previousTapImage =
            image;
    }


    openZoom(pageIndex) {
        if (!Number.isInteger(pageIndex)) {
            return;
        }

        const zoomHandler =
            window[
                this.options
                    .zoomHandlerName
            ];

        if (
            typeof zoomHandler !==
            "function"
        ) {
            console.error(
                `${this.options.zoomHandlerName} is not available.`
            );

            return;
        }

        zoomHandler(pageIndex);
    }


    toggleFullscreen(event) {
        if (event) {
            event.preventDefault();
        }

        const isFullscreen =
            Boolean(
                document.fullscreenElement ||
                document.webkitFullscreenElement
            );

        if (isFullscreen) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    }


    enterFullscreen() {
        const dialog =
            this.modal.querySelector(
                ".flipbook-dialog"
            );

        if (!dialog) {
            return;
        }

        if (dialog.requestFullscreen) {
            dialog
                .requestFullscreen()
                .catch((error) => {
                    console.error(
                        "Full-screen mode could not be started:",
                        error
                    );
                });

            return;
        }

        if (
            dialog.webkitRequestFullscreen
        ) {
            dialog.webkitRequestFullscreen();
        }
    }


    exitFullscreen() {
        if (
            document.fullscreenElement &&
            document.exitFullscreen
        ) {
            document
                .exitFullscreen()
                .catch(() => {
                    /*
                     * Browser may already be
                     * leaving full screen.
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


    updateFullscreenButtonText() {
        if (!this.fullscreenButton) {
            return;
        }

        const isFullscreen =
            Boolean(
                document.fullscreenElement ||
                document.webkitFullscreenElement
            );

        this.fullscreenButton.textContent =
            isFullscreen
                ? "Exit Full Screen"
                : "Full Screen";
    }


    showLoadingError(message) {
        if (!this.loadingElement) {
            return;
        }

        this.loadingElement.classList.remove(
            "is-hidden"
        );

        this.loadingElement.innerHTML = "";

        const messageElement =
            document.createElement(
                "span"
            );

        messageElement.textContent =
            message;

        this.loadingElement.appendChild(
            messageElement
        );
    }


    waitForVisibleLayout() {
        return new Promise(
            (resolve) => {
                requestAnimationFrame(
                    () => {
                        requestAnimationFrame(
                            resolve
                        );
                    }
                );
            }
        );
    }
}