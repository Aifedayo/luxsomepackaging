document.addEventListener("DOMContentLoaded", () => {
    const mobileMenuButton =
        document.getElementById("mobileMenuButton");

    const siteNavigation =
        document.getElementById("siteNavigation");

    const currentYear =
        document.getElementById("currentYear");

    if (currentYear) {
        currentYear.textContent =
            new Date().getFullYear();
    }

    if (!mobileMenuButton || !siteNavigation) {
        return;
    }

    function closeMobileMenu() {
        mobileMenuButton.classList.remove("is-active");
        siteNavigation.classList.remove("is-open");

        mobileMenuButton.setAttribute(
            "aria-expanded",
            "false"
        );

        mobileMenuButton.setAttribute(
            "aria-label",
            "Open navigation menu"
        );

        document.body.classList.remove("menu-open");
    }

    function toggleMobileMenu() {
        const menuIsOpen =
            siteNavigation.classList.toggle("is-open");

        mobileMenuButton.classList.toggle(
            "is-active",
            menuIsOpen
        );

        mobileMenuButton.setAttribute(
            "aria-expanded",
            String(menuIsOpen)
        );

        mobileMenuButton.setAttribute(
            "aria-label",
            menuIsOpen
                ? "Close navigation menu"
                : "Open navigation menu"
        );

        document.body.classList.toggle(
            "menu-open",
            menuIsOpen
        );
    }

    mobileMenuButton.addEventListener(
        "click",
        toggleMobileMenu
    );

    siteNavigation
        .querySelectorAll("a")
        .forEach((link) => {
            link.addEventListener(
                "click",
                closeMobileMenu
            );
        });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 850) {
            closeMobileMenu();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeMobileMenu();
        }
    });
});