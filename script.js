document.addEventListener("DOMContentLoaded", () => {
    const currentYearElement = document.getElementById("currentYear");

    if (currentYearElement) {
        currentYearElement.textContent = new Date().getFullYear();
    }
});

document.addEventListener("DOMContentLoaded", () => {
    const bookElement = document.getElementById("flipbook");
    const previousButton = document.getElementById("previousPage");
    const nextButton = document.getElementById("nextPage");
    const currentPageElement = document.getElementById("currentPage");
    const totalPagesElement = document.getElementById("totalPages");

    if (!bookElement) {
        return;
    }

    const pageFlip = new St.PageFlip(bookElement, {
        width: 450,
        height: 636,

        size: "stretch",

        minWidth: 280,
        maxWidth: 900,

        minHeight: 396,
        maxHeight: 1272,

        maxShadowOpacity: 0.28,

        showCover: true,

        mobileScrollSupport: false,

        usePortrait: true,

        flippingTime: 650,

        autoSize: true
    });

    pageFlip.loadFromHTML(
        document.querySelectorAll("#flipbook .page")
    );

    const totalPages = pageFlip.getPageCount();

    totalPagesElement.textContent = totalPages;

    const updateControls = () => {
        const currentPageIndex = pageFlip.getCurrentPageIndex();

        currentPageElement.textContent = currentPageIndex + 1;

        previousButton.disabled = currentPageIndex === 0;

        nextButton.disabled =
            currentPageIndex >= totalPages - 1;
    };

    previousButton.addEventListener("click", () => {
        pageFlip.flipPrev();
    });

    nextButton.addEventListener("click", () => {
        pageFlip.flipNext();
    });

    pageFlip.on("flip", updateControls);

    updateControls();
});