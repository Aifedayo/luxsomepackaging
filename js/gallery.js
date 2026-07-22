import PhotoSwipeLightbox from
    "https://cdn.jsdelivr.net/npm/photoswipe@5/dist/photoswipe-lightbox.esm.js";

document.addEventListener("DOMContentLoaded", () => {
    const galleryGrid =
        document.getElementById("galleryGrid");

    const filterButtons =
        document.querySelectorAll(".gallery-filter");

    const galleryItems =
        document.querySelectorAll(".gallery-item");

    const galleryEmptyState =
        document.getElementById("galleryEmptyState");

    if (!galleryGrid) {
        return;
    }

    function getVisibleGalleryItems() {
        return Array.from(
            galleryGrid.querySelectorAll(
                ".gallery-item:not([hidden])"
            )
        );
    }

    function buildPhotoSwipeDataSource() {
        return getVisibleGalleryItems().map((item) => {
            const image = item.querySelector("img");

            return {
                src: item.href,
                width:
                    Number(item.dataset.width) || 1600,
                height:
                    Number(item.dataset.height) || 1200,
                alt: image?.alt || "",
                title: item.dataset.title || ""
            };
        });
    }

    const lightbox = new PhotoSwipeLightbox({
        dataSource: buildPhotoSwipeDataSource(),

        pswpModule: () =>
            import(
                "https://cdn.jsdelivr.net/npm/photoswipe@5/dist/photoswipe.esm.js"
            ),

        showHideAnimationType: "fade",
        bgOpacity: 0.96,
        wheelToZoom: true,
        closeOnVerticalDrag: true,
        clickToCloseNonZoomable: false,

        padding: {
            top: 20,
            right: 20,
            bottom: 20,
            left: 20
        }
    });

    lightbox.on("uiRegister", () => {
        lightbox.pswp.ui.registerElement({
            name: "luxsome-caption",
            order: 9,
            isButton: false,
            appendTo: "root",
            html: "",

            onInit: (element, pswp) => {
                Object.assign(element.style, {
                    position: "absolute",
                    right: "20px",
                    bottom: "18px",
                    left: "20px",
                    zIndex: "10",
                    color: "#ffffff",
                    fontFamily:
                        "Montserrat, sans-serif",
                    fontSize: "0.85rem",
                    textAlign: "center",
                    pointerEvents: "none"
                });

                function updateCaption() {
                    element.textContent =
                        pswp.currSlide?.data?.title || "";
                }

                pswp.on("change", updateCaption);

                updateCaption();
            }
        });
    });

    lightbox.init();

    function refreshLightbox() {
        lightbox.options.dataSource =
            buildPhotoSwipeDataSource();
    }

    function filterGallery(selectedCategory) {
        let visibleItemCount = 0;

        galleryItems.forEach((item) => {
            const itemCategory =
                item.dataset.category;

            const shouldShow =
                selectedCategory === "all" ||
                itemCategory === selectedCategory;

            item.hidden = !shouldShow;

            if (shouldShow) {
                visibleItemCount += 1;
            }
        });

        galleryEmptyState?.classList.toggle(
            "is-visible",
            visibleItemCount === 0
        );

        refreshLightbox();
    }

    filterButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const selectedCategory =
                button.dataset.filter || "all";

            filterButtons.forEach((filterButton) => {
                const isSelected =
                    filterButton === button;

                filterButton.classList.toggle(
                    "is-active",
                    isSelected
                );

                filterButton.setAttribute(
                    "aria-pressed",
                    String(isSelected)
                );
            });

            filterGallery(selectedCategory);
        });
    });

    galleryGrid.addEventListener(
        "click",
        (event) => {
            const clickedItem =
                event.target.closest(".gallery-item");

            if (!clickedItem || clickedItem.hidden) {
                return;
            }

            event.preventDefault();

            const visibleItems =
                getVisibleGalleryItems();

            const clickedIndex =
                visibleItems.indexOf(clickedItem);

            if (clickedIndex < 0) {
                return;
            }

            refreshLightbox();
            lightbox.loadAndOpen(clickedIndex);
        }
    );
});
