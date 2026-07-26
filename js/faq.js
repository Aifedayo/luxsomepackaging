document.addEventListener("DOMContentLoaded", () => {
    const faqItems = Array.from(
        document.querySelectorAll(".faq-item")
    );

    const faqGroups = Array.from(
        document.querySelectorAll(".faq-group")
    );

    const categoryButtons = Array.from(
        document.querySelectorAll(".faq-category-button")
    );

    const popularQuestionLinks = Array.from(
        document.querySelectorAll("[data-question-link]")
    );

    const searchInput = document.getElementById("faqSearch");
    const searchClearButton = document.getElementById("faqSearchClear");
    const searchStatus = document.getElementById("faqSearchStatus");
    const noResults = document.getElementById("faqNoResults");

    let activeCategory = "all";


    /* =====================================================
       HELPERS
    ===================================================== */

    const normaliseText = value => {
        return value
            .toLowerCase()
            .replace(/\s+/g, " ")
            .trim();
    };

    const getItemCategories = item => {
        return item.dataset.category
            .split(/\s+/)
            .filter(Boolean);
    };

    const getQuestionButton = item => {
        return item.querySelector(".faq-question");
    };

    const getAnswer = item => {
        return item.querySelector(".faq-answer");
    };


    /* =====================================================
       ACCORDION
    ===================================================== */

    const openFaqItem = (
        item,
        {
            scroll = false,
            updateHash = false
        } = {}
    ) => {
        const button = getQuestionButton(item);
        const answer = getAnswer(item);

        if (!button || !answer) {
            return;
        }

        item.classList.add("is-open");
        button.setAttribute("aria-expanded", "true");

        if (updateHash && item.id) {
            history.replaceState(
                null,
                "",
                `#${item.id}`
            );
        }

        if (scroll) {
            window.setTimeout(() => {
                item.scrollIntoView({
                    behavior: window.matchMedia(
                        "(prefers-reduced-motion: reduce)"
                    ).matches
                        ? "auto"
                        : "smooth",

                    block: "start"
                });
            }, 80);
        }
    };

    const closeFaqItem = item => {
        const button = getQuestionButton(item);

        item.classList.remove("is-open");

        if (button) {
            button.setAttribute(
                "aria-expanded",
                "false"
            );
        }
    };

    faqItems.forEach(item => {
        const button = getQuestionButton(item);

        if (!button) {
            return;
        }

        button.addEventListener("click", () => {
            const isOpen =
                button.getAttribute("aria-expanded") ===
                "true";

            if (isOpen) {
                closeFaqItem(item);

                if (
                    window.location.hash ===
                    `#${item.id}`
                ) {
                    history.replaceState(
                        null,
                        "",
                        window.location.pathname
                    );
                }

                return;
            }

            openFaqItem(item, {
                updateHash: true
            });
        });
    });


    /* =====================================================
       SEARCH HIGHLIGHT
    ===================================================== */

    const removeSearchHighlights = () => {
        document
            .querySelectorAll(".faq-search-highlight")
            .forEach(highlight => {
                highlight.replaceWith(
                    document.createTextNode(
                        highlight.textContent
                    )
                );
            });
    };

    const highlightText = (
        element,
        searchTerm
    ) => {
        if (!element || !searchTerm) {
            return;
        }

        const escapedTerm = searchTerm.replace(
            /[.*+?^${}()|[\]\\]/g,
            "\\$&"
        );

        const expression = new RegExp(
            `(${escapedTerm})`,
            "gi"
        );

        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode(node) {
                    const parent = node.parentElement;

                    if (
                        !parent ||
                        parent.closest(
                            "script, style, .faq-search-highlight"
                        )
                    ) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    if (
                        !normaliseText(node.nodeValue)
                            .includes(
                                normaliseText(searchTerm)
                            )
                    ) {
                        return NodeFilter.FILTER_REJECT;
                    }

                    return NodeFilter.FILTER_ACCEPT;
                }
            }
        );

        const textNodes = [];

        while (walker.nextNode()) {
            textNodes.push(walker.currentNode);
        }

        textNodes.forEach(node => {
            const wrapper =
                document.createElement("span");

            wrapper.innerHTML =
                node.nodeValue.replace(
                    expression,
                    '<mark class="faq-search-highlight">$1</mark>'
                );

            node.replaceWith(...wrapper.childNodes);
        });
    };


    /* =====================================================
       FILTERING
    ===================================================== */

    const filterFaqs = () => {
        const searchTerm = normaliseText(
            searchInput?.value || ""
        );

        let visibleItemCount = 0;

        removeSearchHighlights();

        faqItems.forEach(item => {
            const categories =
                getItemCategories(item);

            const questionText =
                item.querySelector(
                    ".faq-question span:first-child"
                )?.textContent || "";

            const answerText =
                item.querySelector(
                    ".faq-answer-inner"
                )?.textContent || "";

            const searchableText =
                normaliseText(
                    `${questionText} ${answerText}`
                );

            const matchesCategory =
                activeCategory === "all" ||
                categories.includes(
                    activeCategory
                );

            const matchesSearch =
                !searchTerm ||
                searchableText.includes(searchTerm);

            const shouldShow =
                matchesCategory &&
                matchesSearch;

            item.hidden = !shouldShow;

            if (shouldShow) {
                visibleItemCount += 1;

                if (searchTerm) {
                    openFaqItem(item);

                    highlightText(
                        item.querySelector(
                            ".faq-question span:first-child"
                        ),
                        searchInput.value.trim()
                    );

                    highlightText(
                        item.querySelector(
                            ".faq-answer-inner"
                        ),
                        searchInput.value.trim()
                    );
                }
            }
        });

        faqGroups.forEach(group => {
            const visibleItems = Array.from(
                group.querySelectorAll(".faq-item")
            ).filter(item => !item.hidden);

            group.hidden =
                visibleItems.length === 0;
        });

        if (noResults) {
            noResults.hidden =
                visibleItemCount !== 0;
        }

        if (searchClearButton) {
            searchClearButton.hidden =
                !searchInput?.value;
        }

        if (searchStatus) {
            if (!searchTerm) {
                searchStatus.textContent = "";
            } else if (visibleItemCount === 0) {
                searchStatus.textContent =
                    "No matching questions found.";
            } else {
                searchStatus.textContent =
                    `${visibleItemCount} ${
                        visibleItemCount === 1
                            ? "answer"
                            : "answers"
                    } found.`;
            }
        }
    };


    /* =====================================================
       CATEGORY BUTTONS
    ===================================================== */

    categoryButtons.forEach(button => {
        button.addEventListener("click", () => {
            activeCategory =
                button.dataset.category;

            categoryButtons.forEach(
                categoryButton => {
                    const isActive =
                        categoryButton === button;

                    categoryButton.classList.toggle(
                        "is-active",
                        isActive
                    );

                    categoryButton.setAttribute(
                        "aria-pressed",
                        String(isActive)
                    );
                }
            );

            filterFaqs();
        });
    });


    /* =====================================================
       SEARCH
    ===================================================== */

    if (searchInput) {
        searchInput.addEventListener(
            "input",
            filterFaqs
        );

        searchInput.addEventListener(
            "keydown",
            event => {
                if (
                    event.key === "Escape" &&
                    searchInput.value
                ) {
                    searchInput.value = "";
                    filterFaqs();
                    searchInput.focus();
                }
            }
        );
    }

    if (searchClearButton) {
        searchClearButton.addEventListener(
            "click",
            () => {
                if (!searchInput) {
                    return;
                }

                searchInput.value = "";
                filterFaqs();
                searchInput.focus();
            }
        );
    }


    /* =====================================================
       POPULAR QUESTION LINKS
    ===================================================== */

    popularQuestionLinks.forEach(link => {
        link.addEventListener("click", event => {
            const itemId =
                link.dataset.questionLink;

            const item =
                document.getElementById(itemId);

            if (!item) {
                return;
            }

            event.preventDefault();

            activeCategory = "all";

            categoryButtons.forEach(button => {
                const isAll =
                    button.dataset.category === "all";

                button.classList.toggle(
                    "is-active",
                    isAll
                );

                button.setAttribute(
                    "aria-pressed",
                    String(isAll)
                );
            });

            if (searchInput) {
                searchInput.value = "";
            }

            filterFaqs();

            openFaqItem(item, {
                scroll: true,
                updateHash: true
            });
        });
    });


    /* =====================================================
       OPEN QUESTION FROM URL HASH
    ===================================================== */

    const openQuestionFromHash = () => {
        const itemId =
            window.location.hash.slice(1);

        if (!itemId) {
            return;
        }

        const item =
            document.getElementById(itemId);

        if (
            !item ||
            !item.classList.contains("faq-item")
        ) {
            return;
        }

        activeCategory = "all";

        categoryButtons.forEach(button => {
            const isAll =
                button.dataset.category === "all";

            button.classList.toggle(
                "is-active",
                isAll
            );

            button.setAttribute(
                "aria-pressed",
                String(isAll)
            );
        });

        filterFaqs();

        openFaqItem(item, {
            scroll: true
        });
    };

    window.addEventListener(
        "hashchange",
        openQuestionFromHash
    );


    /* =====================================================
       INITIALISE
    ===================================================== */

    filterFaqs();
    openQuestionFromHash();
});