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

document.addEventListener("DOMContentLoaded", function () {
    const slides = document.querySelectorAll(".hero-slide");
    const dots = document.querySelectorAll(".hero-dot");
    const previousButton = document.querySelector(".hero-arrow-left");
    const nextButton = document.querySelector(".hero-arrow-right");
    const carousel = document.querySelector(".hero-carousel");

    let currentSlide = 0;
    let autoplayInterval;

    function showSlide(index) {
        if (index >= slides.length) {
            currentSlide = 0;
        } else if (index < 0) {
            currentSlide = slides.length - 1;
        } else {
            currentSlide = index;
        }

        slides.forEach(function (slide, slideIndex) {
            slide.classList.toggle(
                "active",
                slideIndex === currentSlide
            );
        });

        dots.forEach(function (dot, dotIndex) {
            const isActive = dotIndex === currentSlide;

            dot.classList.toggle("active", isActive);

            if (isActive) {
                dot.setAttribute("aria-current", "true");
            } else {
                dot.removeAttribute("aria-current");
            }
        });
    }

    function nextSlide() {
        showSlide(currentSlide + 1);
    }

    function previousSlide() {
        showSlide(currentSlide - 1);
    }

    function startAutoplay() {
        stopAutoplay();

        autoplayInterval = window.setInterval(function () {
            nextSlide();
        }, 6000);
    }

    function stopAutoplay() {
        if (autoplayInterval) {
            window.clearInterval(autoplayInterval);
        }
    }

    nextButton.addEventListener("click", function () {
        nextSlide();
        startAutoplay();
    });

    previousButton.addEventListener("click", function () {
        previousSlide();
        startAutoplay();
    });

    dots.forEach(function (dot, index) {
        dot.addEventListener("click", function () {
            showSlide(index);
            startAutoplay();
        });
    });

    carousel.addEventListener("mouseenter", stopAutoplay);
    carousel.addEventListener("mouseleave", startAutoplay);

    document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
            stopAutoplay();
        } else {
            startAutoplay();
        }
    });

    showSlide(0);
    startAutoplay();
});
