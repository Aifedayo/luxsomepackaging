import PhotoSwipeLightbox from
    "https://cdn.jsdelivr.net/npm/photoswipe@5/dist/photoswipe-lightbox.esm.js";

const pricingCatalogueImages = Array.from(
    { length: 15 },
    (_, index) => ({
        src:
            `assets/images/flipbook/${index + 25}.jpg`,
        width: 1591,
        height: 2250,
        alt:
            `Luxsome pricing catalogue page ${index + 1}`
    })
);

const productCatalogueImages = Array.from(
    { length: 15 },
    (_, index) => ({
        src:
            `assets/images/flipbook/${index + 1}.png`,
        width: 1591,
        height: 2250,
        alt:
            `Luxsome product catalogue page ${index + 1}`
    })
);

function createCatalogueLightbox(dataSource) {
    const lightbox = new PhotoSwipeLightbox({
        dataSource,

        pswpModule: () =>
            import(
                "https://cdn.jsdelivr.net/npm/photoswipe@5/dist/photoswipe.esm.js"
            ),

        showHideAnimationType: "fade",
        bgOpacity: 0.95,

        wheelToZoom: true,
        pinchToClose: true,
        closeOnVerticalDrag: true,

        initialZoomLevel: "fit",
        secondaryZoomLevel: 2.5,
        maxZoomLevel: 4,

        preload: [1, 2]
    });

    lightbox.init();

    return lightbox;
}

const pricingCatalogueLightbox =
    createCatalogueLightbox(
        pricingCatalogueImages
    );

const productCatalogueLightbox =
    createCatalogueLightbox(
        productCatalogueImages
    );

window.openCatalogueZoom = (pageIndex = 0) => {
    pricingCatalogueLightbox.loadAndOpen(
        pageIndex
    );
};

window.openProductCatalogueZoom =
    (pageIndex = 0) => {
        productCatalogueLightbox.loadAndOpen(
            pageIndex
        );
    };