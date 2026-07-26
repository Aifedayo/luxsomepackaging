document.addEventListener("DOMContentLoaded", () => {
    const legalContent = document.querySelector(".legal-content");
    const legalSections = Array.from(
        document.querySelectorAll(".legal-block[id]")
    );

    const navigationLinks = Array.from(
        document.querySelectorAll(".legal-navigation a[href^='#']")
    );

    const progressBar = document.getElementById(
        "readingProgressBar"
    );

    const readingTimeElement = document.getElementById(
        "estimatedReadingTime"
    );

    const backToTopButton = document.getElementById(
        "backToTopButton"
    );

    const prefersReducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;


    /* =====================================================
       ESTIMATED READING TIME
    ===================================================== */

    const calculateReadingTime = () => {
        if (!legalContent || !readingTimeElement) {
            return;
        }

        const text = legalContent.textContent
            .replace(/\s+/g, " ")
            .trim();

        const wordCount = text
            ? text.split(" ").length
            : 0;

        const averageReadingSpeed = 220;

        const readingMinutes = Math.max(
            1,
            Math.ceil(wordCount / averageReadingSpeed)
        );

        readingTimeElement.textContent =
            `${readingMinutes} min read`;
    };


    /* =====================================================
       READING PROGRESS
    ===================================================== */

    const updateReadingProgress = () => {
        if (!progressBar || !legalContent) {
            return;
        }

        const contentTop =
            legalContent.getBoundingClientRect().top +
            window.scrollY;

        const contentHeight = legalContent.offsetHeight;

        const viewportHeight = window.innerHeight;

        const readingDistance =
            contentHeight - viewportHeight;

        const currentPosition =
            window.scrollY - contentTop;

        let progress = 0;

        if (readingDistance > 0) {
            progress =
                (currentPosition / readingDistance) * 100;
        }

        progress = Math.min(
            100,
            Math.max(0, progress)
        );

        progressBar.style.width = `${progress}%`;
    };


    /* =====================================================
       ACTIVE TABLE OF CONTENTS LINK
    ===================================================== */

    const setActiveNavigationLink = sectionId => {
        navigationLinks.forEach(link => {
            const linkTarget = link.getAttribute("href");

            const isActive =
                linkTarget === `#${sectionId}`;

            link.classList.toggle(
                "is-active",
                isActive
            );

            if (isActive) {
                link.setAttribute(
                    "aria-current",
                    "true"
                );
            } else {
                link.removeAttribute(
                    "aria-current"
                );
            }
        });
    };

    const updateActiveSection = () => {
        if (!legalSections.length) {
            return;
        }

        const activationPoint =
            window.scrollY + 180;

        let activeSection =
            legalSections[0];

        legalSections.forEach(section => {
            if (section.offsetTop <= activationPoint) {
                activeSection = section;
            }
        });

        setActiveNavigationLink(
            activeSection.id
        );
    };


    /* =====================================================
       TABLE OF CONTENTS SCROLLING
    ===================================================== */

    navigationLinks.forEach(link => {
        link.addEventListener("click", event => {
            const sectionId =
                link.getAttribute("href");

            const targetSection =
                document.querySelector(sectionId);

            if (!targetSection) {
                return;
            }

            event.preventDefault();

            targetSection.scrollIntoView({
                behavior: prefersReducedMotion
                    ? "auto"
                    : "smooth",

                block: "start"
            });

            history.replaceState(
                null,
                "",
                sectionId
            );

            setActiveNavigationLink(
                targetSection.id
            );
        });
    });


    /* =====================================================
       BACK TO TOP BUTTON
    ===================================================== */

    const updateBackToTopButton = () => {
        if (!backToTopButton) {
            return;
        }

        const shouldShow =
            window.scrollY > 650;

        backToTopButton.classList.toggle(
            "is-visible",
            shouldShow
        );
    };

    if (backToTopButton) {
        backToTopButton.addEventListener(
            "click",
            () => {
                window.scrollTo({
                    top: 0,

                    behavior: prefersReducedMotion
                        ? "auto"
                        : "smooth"
                });
            }
        );
    }


    /* =====================================================
       SCROLL PERFORMANCE
    ===================================================== */

    let scrollTicking = false;

    const handleScroll = () => {
        if (scrollTicking) {
            return;
        }

        window.requestAnimationFrame(() => {
            updateReadingProgress();
            updateActiveSection();
            updateBackToTopButton();

            scrollTicking = false;
        });

        scrollTicking = true;
    };


    /* =====================================================
       INITIALISE
    ===================================================== */

    calculateReadingTime();
    updateReadingProgress();
    updateActiveSection();
    updateBackToTopButton();

    window.addEventListener(
        "scroll",
        handleScroll,
        {
            passive: true
        }
    );

    window.addEventListener(
        "resize",
        () => {
            updateReadingProgress();
            updateActiveSection();
        }
    );
});