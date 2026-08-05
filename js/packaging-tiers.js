document.addEventListener("DOMContentLoaded", () => {
    initialiseCurrentYear();
    initialiseMobileMenu();
    initialiseScrollReveals();
    initialiseTierGuide();
    initialiseFAQs();
});


function initialiseCurrentYear() {
    const currentYear =
        document.getElementById("currentYear");

    if (!currentYear) {
        return;
    }

    currentYear.textContent =
        String(new Date().getFullYear());
}


function initialiseMobileMenu() {
    const button =
        document.getElementById(
            "mobileMenuButton"
        );

    const navigation =
        document.getElementById(
            "siteNavigation"
        );

    if (!button || !navigation) {
        return;
    }

    function closeMenu() {
        button.classList.remove(
            "is-active"
        );

        navigation.classList.remove(
            "is-open"
        );

        button.setAttribute(
            "aria-expanded",
            "false"
        );

        document.body.classList.remove(
            "menu-open"
        );
    }

    button.addEventListener(
        "click",
        () => {
            const shouldOpen =
                !navigation.classList.contains(
                    "is-open"
                );

            button.classList.toggle(
                "is-active",
                shouldOpen
            );

            navigation.classList.toggle(
                "is-open",
                shouldOpen
            );

            button.setAttribute(
                "aria-expanded",
                String(shouldOpen)
            );

            document.body.classList.toggle(
                "menu-open",
                shouldOpen
            );
        }
    );

    navigation.addEventListener(
        "click",
        (event) => {
            if (event.target.closest("a")) {
                closeMenu();
            }
        }
    );

    window.addEventListener(
        "resize",
        () => {
            if (window.innerWidth > 850) {
                closeMenu();
            }
        }
    );
}


function initialiseScrollReveals() {
    const elements =
        Array.from(
            document.querySelectorAll(
                ".tiers-reveal"
            )
        );

    if (elements.length === 0) {
        return;
    }

    const reducedMotion =
        window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        );

    if (
        reducedMotion.matches ||
        !("IntersectionObserver" in window)
    ) {
        elements.forEach((element) => {
            element.classList.add(
                "is-visible"
            );
        });

        return;
    }

    const observer =
        new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (!entry.isIntersecting) {
                        return;
                    }

                    entry.target.classList.add(
                        "is-visible"
                    );

                    observer.unobserve(
                        entry.target
                    );
                });
            },
            {
                threshold: 0.12,
                rootMargin:
                    "0px 0px -7% 0px"
            }
        );

    elements.forEach((element) => {
        observer.observe(element);
    });
}


function initialiseTierGuide() {
    const buttons =
        Array.from(
            document.querySelectorAll(
                "[data-tier-result]"
            )
        );

    const result =
        document.getElementById(
            "tierGuideResult"
        );

    const title =
        document.getElementById(
            "tierGuideResultTitle"
        );

    const description =
        document.getElementById(
            "tierGuideResultText"
        );

    const link =
        document.getElementById(
            "tierGuideResultLink"
        );

    if (
        buttons.length === 0 ||
        !result ||
        !title ||
        !description ||
        !link
    ) {
        return;
    }

    const tierData = {
        essential: {
            title: "Essential",
            description:
                "Essential gives your brand the core packaging pieces needed to move beyond a generic presentation without building a large system immediately.",
            url: "/shop/tier-1/"
        },

        signature: {
            title: "Signature",
            description:
                "Signature brings several packaging touchpoints together, helping a growing brand look more coordinated, recognisable and established.",
            url: "/shop/tier-2/"
        },

        prestige: {
            title: "Prestige",
            description:
                "Prestige creates a fuller premium unboxing experience for brands whose presentation must feel equal to the value of the product.",
            url: "/shop/tier-3/"
        },

        bespoke: {
            title: "Bespoke",
            description:
                "Bespoke lets you select the exact packaging pieces your product, launch or existing system requires.",
            url: "/shop/bespoke/"
        }
    };

    buttons.forEach((button) => {
        button.addEventListener(
            "click",
            () => {
                const tierName =
                    button.dataset.tierResult;

                const selectedTier =
                    tierData[tierName];

                if (!selectedTier) {
                    return;
                }

                buttons.forEach(
                    (otherButton) => {
                        const isSelected =
                            otherButton === button;

                        otherButton.classList.toggle(
                            "is-selected",
                            isSelected
                        );

                        otherButton.setAttribute(
                            "aria-pressed",
                            String(isSelected)
                        );
                    }
                );

                title.textContent =
                    selectedTier.title;

                description.textContent =
                    selectedTier.description;

                link.href =
                    selectedTier.url;

                link.textContent =
                    `Explore ${selectedTier.title}`;

                result.hidden = false;

                requestAnimationFrame(() => {
                    result.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest"
                    });
                });
            }
        );
    });
}


function initialiseFAQs() {
    const faqItems =
        Array.from(
            document.querySelectorAll(
                ".tiers-faq details"
            )
        );

    if (faqItems.length === 0) {
        return;
    }

    faqItems.forEach((item) => {
        item.addEventListener(
            "toggle",
            () => {
                if (!item.open) {
                    return;
                }

                faqItems.forEach(
                    (otherItem) => {
                        if (otherItem !== item) {
                            otherItem.open = false;
                        }
                    }
                );
            }
        );
    });
}