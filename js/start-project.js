document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("contactForm");
    const projectsContainer = document.getElementById("projectsContainer");
    const projectTemplate = document.getElementById("projectTemplate");
    const addProjectButton = document.getElementById("addProjectButton");
    const projectCountInput = document.getElementById("projectCount");
    const notification = document.getElementById("notification");

    if (
        !form ||
        !projectsContainer ||
        !projectTemplate ||
        !addProjectButton
    ) {
        console.error(
            "The project form could not be initialised because one or more required elements are missing."
        );
        return;
    }

    const submitButton = form.querySelector('button[type="submit"]');

    if (!submitButton) {
        console.error("The project form submit button was not found.");
        return;
    }

    const MAX_PROJECTS = 5;

    let nextProjectIndex = 0;
    let notificationTimer;


    /*
     * Create the first project when the page loads.
     */
    addProject();


    /*
     * Add another project.
     */
    addProjectButton.addEventListener("click", () => {
        addProject(true);
    });


    /*
     * Handle project radio selections and removal using delegation.
     */
    projectsContainer.addEventListener("change", (event) => {
        const target = event.target;

        if (!(target instanceof HTMLInputElement)) {
            return;
        }

        if (target.type === "radio") {
            const projectCard = target.closest("[data-project-card]");

            if (projectCard) {
                updateBespokeVisibility(projectCard);
            }
        }
    });


    projectsContainer.addEventListener("click", (event) => {
        const removeButton = event.target.closest("[data-remove-project]");

        if (!removeButton) {
            return;
        }

        const projectCard = removeButton.closest("[data-project-card]");

        if (!projectCard) {
            return;
        }

        removeProject(projectCard);
    });


    /*
     * Form submission.
     */
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearCustomValidationMessages();

        if (!form.checkValidity()) {
            form.reportValidity();
            focusFirstInvalidField();
            return;
        }

        if (!validateBespokeProjects()) {
            return;
        }

        const originalButtonContent = submitButton.innerHTML;

        submitButton.disabled = true;
        submitButton.setAttribute("aria-busy", "true");

        submitButton.innerHTML = `
            <span class="spinner" aria-hidden="true"></span>
            <span>Sending project request...</span>
        `;

        try {
            const response = await fetch(form.action, {
                method: "POST",
                body: new FormData(form),
                headers: {
                    Accept: "application/json"
                }
            });

            if (response.ok) {
                resetProjectForm();

                window.location.href = "/start-project/project-submitted/";
                    return;
            }

            let message =
                "Something went wrong. Please check your details and try again.";

            try {
                const responseData = await response.json();

                if (
                    Array.isArray(responseData.errors) &&
                    responseData.errors.length > 0
                ) {
                    message = responseData.errors
                        .map((error) => error.message)
                        .filter(Boolean)
                        .join(" ");
                }
            } catch (error) {
                console.warn(
                    "Formspree returned an unreadable error response.",
                    error
                );
            }

            showNotification(message, "error");
        } catch (error) {
            console.error("Project form submission failed:", error);

            showNotification(
                "Unable to send your project request. Please check your internet connection and try again.",
                "error"
            );
        } finally {
            submitButton.disabled = false;
            submitButton.removeAttribute("aria-busy");
            submitButton.innerHTML = originalButtonContent;
        }
    });


    /*
     * Add a new project card.
     */
    function addProject(shouldScroll = false) {
        const currentProjectCount = getProjectCards().length;

        if (currentProjectCount >= MAX_PROJECTS) {
            showNotification(
                `You can add a maximum of ${MAX_PROJECTS} projects to one request.`,
                "error"
            );

            return;
        }

        const projectIndex = nextProjectIndex;
        nextProjectIndex += 1;

        const projectNumber = currentProjectCount + 1;

        const templateHTML = projectTemplate.innerHTML
            .replaceAll("__INDEX__", String(projectIndex));

        const temporaryContainer = document.createElement("div");
        temporaryContainer.innerHTML = templateHTML.trim();

        const projectCard = temporaryContainer.firstElementChild;

        if (!projectCard) {
            console.error("The project template could not be created.");
            return;
        }

        projectCard.dataset.projectIndex = String(projectIndex);

        projectsContainer.appendChild(projectCard);

        updateProjectNumbers();
        updateProjectCount();
        updateAddProjectButton();
        updateMinimumDate(projectCard);
        updateBespokeVisibility(projectCard);

        if (shouldScroll) {
            projectCard.scrollIntoView({
                behavior: prefersReducedMotion() ? "auto" : "smooth",
                block: "start"
            });

            const firstRadio = projectCard.querySelector(
                'input[type="radio"]'
            );

            window.setTimeout(() => {
                firstRadio?.focus();
            }, prefersReducedMotion() ? 0 : 350);
        }
    }


    /*
     * Remove a project card.
     */
    function removeProject(projectCard) {
        const projectCards = getProjectCards();

        if (projectCards.length <= 1) {
            showNotification(
                "At least one packaging project is required.",
                "error"
            );

            return;
        }

        projectCard.remove();

        updateProjectNumbers();
        updateProjectCount();
        updateAddProjectButton();

        showNotification(
            "The packaging project was removed.",
            "success"
        );
    }


    /*
     * Show or hide bespoke items.
     */
    function updateBespokeVisibility(projectCard) {
        const selectedPackageType = projectCard.querySelector(
            'input[type="radio"]:checked'
        );

        const bespokeOptions = projectCard.querySelector(
            "[data-bespoke-options]"
        );

        if (!bespokeOptions) {
            return;
        }

        const isBespoke =
            selectedPackageType?.value === "Bespoke Packaging Project";

        bespokeOptions.hidden = !isBespoke;

        const bespokeInputs = bespokeOptions.querySelectorAll(
            "input, select, textarea"
        );

        bespokeInputs.forEach((input) => {
            input.disabled = !isBespoke;

            if (!isBespoke && input instanceof HTMLInputElement) {
                if (input.type === "checkbox") {
                    input.checked = false;
                }

                input.setCustomValidity("");
            }
        });
    }


    /*
     * Bespoke projects must contain at least one selected item.
     */
    function validateBespokeProjects() {
        const projectCards = getProjectCards();

        for (const projectCard of projectCards) {
            const selectedPackageType = projectCard.querySelector(
                'input[type="radio"]:checked'
            );

            if (
                selectedPackageType?.value !==
                "Bespoke Packaging Project"
            ) {
                continue;
            }

            const bespokeCheckboxes = Array.from(
                projectCard.querySelectorAll(
                    '[data-bespoke-options] input[type="checkbox"]'
                )
            );

            const selectedBespokeItems = bespokeCheckboxes.filter(
                (checkbox) => checkbox.checked
            );

            if (selectedBespokeItems.length === 0) {
                const firstCheckbox = bespokeCheckboxes[0];

                firstCheckbox?.setCustomValidity(
                    "Please select at least one bespoke packaging item."
                );

                firstCheckbox?.reportValidity();
                firstCheckbox?.focus();

                showNotification(
                    "Please select at least one item for every bespoke packaging project.",
                    "error"
                );

                return false;
            }
        }

        return true;
    }


    /*
     * Remove previous custom validation messages.
     */
    function clearCustomValidationMessages() {
        const bespokeCheckboxes = form.querySelectorAll(
            '[data-bespoke-options] input[type="checkbox"]'
        );

        bespokeCheckboxes.forEach((checkbox) => {
            checkbox.setCustomValidity("");
        });
    }


    /*
     * Keep project numbering visually sequential even after removal.
     */
    function updateProjectNumbers() {
        const projectCards = getProjectCards();

        projectCards.forEach((projectCard, index) => {
            const projectNumberElement = projectCard.querySelector(
                "[data-project-number]"
            );

            if (projectNumberElement) {
                projectNumberElement.textContent = String(
                    index + 1
                ).padStart(2, "0");
            }

            const removeButton = projectCard.querySelector(
                "[data-remove-project]"
            );

            if (removeButton) {
                removeButton.setAttribute(
                    "aria-label",
                    `Remove project ${index + 1}`
                );
            }
        });
    }


    /*
     * Keep the hidden Formspree project count accurate.
     */
    function updateProjectCount() {
        if (projectCountInput) {
            projectCountInput.value = String(
                getProjectCards().length
            );
        }
    }


    /*
     * Disable the add button after reaching the maximum.
     */
    function updateAddProjectButton() {
        const projectCount = getProjectCards().length;
        const maximumReached = projectCount >= MAX_PROJECTS;

        addProjectButton.disabled = maximumReached;

        if (maximumReached) {
            addProjectButton.innerHTML = `
                <i class="fa-solid fa-check" aria-hidden="true"></i>
                Maximum of ${MAX_PROJECTS} projects added
            `;
        } else {
            addProjectButton.innerHTML = `
                <i class="fa-solid fa-plus" aria-hidden="true"></i>
                Add another packaging project
            `;
        }
    }


    /*
     * Prevent users from selecting a date in the past.
     */
    function updateMinimumDate(projectCard) {
        const dateInput = projectCard.querySelector(
            'input[type="date"]'
        );

        if (!dateInput) {
            return;
        }

        const today = new Date();
        const localDate = new Date(
            today.getTime() -
            today.getTimezoneOffset() * 60000
        )
            .toISOString()
            .split("T")[0];

        dateInput.min = localDate;
    }


    /*
     * Find and focus the first invalid field.
     */
    function focusFirstInvalidField() {
        const firstInvalidField = form.querySelector(":invalid");

        if (!firstInvalidField) {
            return;
        }

        const projectCard = firstInvalidField.closest(
            "[data-project-card]"
        );

        projectCard?.scrollIntoView({
            behavior: prefersReducedMotion() ? "auto" : "smooth",
            block: "center"
        });

        window.setTimeout(() => {
            firstInvalidField.focus();
        }, prefersReducedMotion() ? 0 : 300);
    }


    /*
     * Reset all dynamic project cards after a successful submission.
     */
    function resetProjectForm() {
        form.reset();

        projectsContainer.innerHTML = "";
        nextProjectIndex = 0;

        addProject();

        window.scrollTo({
            top: 0,
            behavior: prefersReducedMotion() ? "auto" : "smooth"
        });
    }


    /*
     * Return all project cards.
     */
    function getProjectCards() {
        return Array.from(
            projectsContainer.querySelectorAll(
                "[data-project-card]"
            )
        );
    }


    /*
     * Notification helper.
     */
    function showNotification(message, type) {
        if (!notification) {
            window.alert(message);
            return;
        }

        window.clearTimeout(notificationTimer);

        notification.textContent = message;
        notification.className =
            `notification ${type} show`;

        notification.setAttribute(
            "role",
            type === "error" ? "alert" : "status"
        );

        notificationTimer = window.setTimeout(() => {
            notification.classList.remove("show");
        }, 5500);
    }


    /*
     * Respect reduced-motion preferences.
     */
    function prefersReducedMotion() {
        return window.matchMedia(
            "(prefers-reduced-motion: reduce)"
        ).matches;
    }
});

/* =========================================================
   LUXSOME CUSTOM DROPDOWNS
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    const enhancedSelects = new WeakSet();

    /**
     * Convert a native select into a custom Luxsome dropdown.
     */
    function enhanceSelect(select) {
        if (
            !(select instanceof HTMLSelectElement) ||
            enhancedSelects.has(select) ||
            select.closest(".custom-select")
        ) {
            return;
        }

        enhancedSelects.add(select);

        const wrapper = document.createElement("div");
        wrapper.className = "custom-select";

        const trigger = document.createElement("button");
        trigger.type = "button";
        trigger.className = "custom-select-trigger";
        trigger.setAttribute("aria-haspopup", "listbox");
        trigger.setAttribute("aria-expanded", "false");

        const triggerText = document.createElement("span");
        triggerText.className = "custom-select-value";

        const arrow = document.createElement("span");
        arrow.className = "custom-select-arrow";
        arrow.setAttribute("aria-hidden", "true");

        trigger.append(triggerText, arrow);

        const optionsList = document.createElement("div");
        optionsList.className = "custom-select-options";
        optionsList.setAttribute("role", "listbox");
        optionsList.tabIndex = -1;

        const listboxId =
            `custom-select-${Math.random().toString(36).slice(2, 10)}`;

        optionsList.id = listboxId;
        trigger.setAttribute("aria-controls", listboxId);

        /*
         * Insert the wrapper around the original select.
         */
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);
        wrapper.appendChild(trigger);
        wrapper.appendChild(optionsList);

        select.classList.add("custom-select-native");
        select.tabIndex = -1;

        /*
         * Build custom options from the native select.
         */
        Array.from(select.options).forEach((nativeOption, index) => {
            const customOption = document.createElement("button");

            customOption.type = "button";
            customOption.className = "custom-select-option";
            customOption.textContent = nativeOption.textContent;
            customOption.dataset.value = nativeOption.value;
            customOption.dataset.index = String(index);

            customOption.setAttribute("role", "option");
            customOption.setAttribute("aria-selected", "false");

            if (nativeOption.disabled) {
                customOption.disabled = true;
                customOption.classList.add("is-disabled");
            }

            customOption.addEventListener("click", () => {
                if (nativeOption.disabled) {
                    return;
                }

                selectOption(select, index);
                closeDropdown(wrapper);

                trigger.focus();
            });

            optionsList.appendChild(customOption);
        });

        /*
         * Open or close the dropdown.
         */
        trigger.addEventListener("click", () => {
            if (select.disabled) {
                return;
            }

            const isOpen = wrapper.classList.contains("is-open");

            closeAllDropdowns(wrapper);

            if (isOpen) {
                closeDropdown(wrapper);
            } else {
                openDropdown(wrapper);
            }
        });

        /*
         * Keyboard navigation.
         */
        trigger.addEventListener("keydown", (event) => {
            const options = getEnabledOptions(wrapper);

            if (!options.length) {
                return;
            }

            const selectedIndex = options.findIndex((option) =>
                option.classList.contains("is-selected")
            );

            switch (event.key) {
                case "ArrowDown":
                    event.preventDefault();

                    if (!wrapper.classList.contains("is-open")) {
                        openDropdown(wrapper);
                    }

                    focusOption(
                        options,
                        selectedIndex >= 0
                            ? Math.min(selectedIndex + 1, options.length - 1)
                            : 0
                    );
                    break;

                case "ArrowUp":
                    event.preventDefault();

                    if (!wrapper.classList.contains("is-open")) {
                        openDropdown(wrapper);
                    }

                    focusOption(
                        options,
                        selectedIndex > 0
                            ? selectedIndex - 1
                            : options.length - 1
                    );
                    break;

                case "Enter":
                case " ":
                    event.preventDefault();

                    if (wrapper.classList.contains("is-open")) {
                        const focusedOption = wrapper.querySelector(
                            ".custom-select-option.is-focused"
                        );

                        focusedOption?.click();
                    } else {
                        openDropdown(wrapper);
                    }

                    break;

                case "Home":
                    event.preventDefault();
                    openDropdown(wrapper);
                    focusOption(options, 0);
                    break;

                case "End":
                    event.preventDefault();
                    openDropdown(wrapper);
                    focusOption(options, options.length - 1);
                    break;

                case "Escape":
                    event.preventDefault();
                    closeDropdown(wrapper);
                    trigger.focus();
                    break;

                case "Tab":
                    closeDropdown(wrapper);
                    break;
            }
        });

        /*
         * Allow keyboard controls while the options list is open.
         */
        optionsList.addEventListener("keydown", (event) => {
            const options = getEnabledOptions(wrapper);

            if (!options.length) {
                return;
            }

            const focusedIndex = options.findIndex((option) =>
                option.classList.contains("is-focused")
            );

            switch (event.key) {
                case "ArrowDown":
                    event.preventDefault();

                    focusOption(
                        options,
                        focusedIndex < options.length - 1
                            ? focusedIndex + 1
                            : 0
                    );
                    break;

                case "ArrowUp":
                    event.preventDefault();

                    focusOption(
                        options,
                        focusedIndex > 0
                            ? focusedIndex - 1
                            : options.length - 1
                    );
                    break;

                case "Enter":
                case " ":
                    event.preventDefault();

                    options[focusedIndex >= 0 ? focusedIndex : 0]?.click();
                    break;

                case "Escape":
                    event.preventDefault();
                    closeDropdown(wrapper);
                    trigger.focus();
                    break;

                case "Tab":
                    closeDropdown(wrapper);
                    break;
            }
        });

        /*
         * Keep the custom dropdown synchronised when another script
         * changes the native select.
         */
        select.addEventListener("change", () => {
            updateCustomSelect(select);
        });

        /*
         * Remove the invalid state after a valid selection.
         */
        select.addEventListener("input", () => {
            if (select.validity.valid) {
                wrapper.classList.remove("is-invalid");
            }
        });

        updateCustomSelect(select);
    }


    /**
     * Select an option and send a normal change event.
     */
    function selectOption(select, optionIndex) {
        const option = select.options[optionIndex];

        if (!option || option.disabled) {
            return;
        }

        select.selectedIndex = optionIndex;

        select.dispatchEvent(
            new Event("input", {
                bubbles: true
            })
        );

        select.dispatchEvent(
            new Event("change", {
                bubbles: true
            })
        );

        updateCustomSelect(select);
    }


    /**
     * Synchronise the visible custom control with the native select.
     */
    function updateCustomSelect(select) {
        const wrapper = select.closest(".custom-select");

        if (!wrapper) {
            return;
        }

        const trigger = wrapper.querySelector(".custom-select-trigger");
        const triggerText = wrapper.querySelector(".custom-select-value");
        const customOptions = wrapper.querySelectorAll(
            ".custom-select-option"
        );

        const selectedOption = select.options[select.selectedIndex];

        if (!selectedOption) {
            return;
        }

        triggerText.textContent = selectedOption.textContent;

        const isPlaceholder =
            selectedOption.value === "";

        trigger.classList.toggle(
            "is-placeholder",
            isPlaceholder
        );

        customOptions.forEach((customOption) => {
            const isSelected =
                Number(customOption.dataset.index) === select.selectedIndex;

            customOption.classList.toggle(
                "is-selected",
                isSelected
            );

            customOption.setAttribute(
                "aria-selected",
                String(isSelected)
            );
        });

        trigger.disabled = select.disabled;

        if (select.validity.valid) {
            wrapper.classList.remove("is-invalid");
        }
    }


    /**
     * Open a dropdown.
     */
    function openDropdown(wrapper) {
        const trigger = wrapper.querySelector(".custom-select-trigger");
        const optionsList = wrapper.querySelector(".custom-select-options");

        setDropdownDirection(wrapper);

        wrapper.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");

        const selectedOption = wrapper.querySelector(
            ".custom-select-option.is-selected:not(:disabled)"
        );

        const firstOption = wrapper.querySelector(
            ".custom-select-option:not(:disabled)"
        );

        const optionToFocus = selectedOption || firstOption;

        clearFocusedOptions(wrapper);

        if (optionToFocus) {
            optionToFocus.classList.add("is-focused");

            window.setTimeout(() => {
                optionToFocus.scrollIntoView({
                    block: "nearest"
                });

                optionsList.focus({
                    preventScroll: true
                });
            }, 0);
        }
    }


    /**
     * Close a dropdown.
     */
    function closeDropdown(wrapper) {
        const trigger = wrapper.querySelector(".custom-select-trigger");

        wrapper.classList.remove("is-open");
        wrapper.classList.remove("opens-upward");

        trigger?.setAttribute("aria-expanded", "false");

        clearFocusedOptions(wrapper);
    }


    /**
     * Close every dropdown except the one currently being opened.
     */
    function closeAllDropdowns(exception = null) {
        document
            .querySelectorAll(".custom-select.is-open")
            .forEach((wrapper) => {
                if (wrapper !== exception) {
                    closeDropdown(wrapper);
                }
            });
    }


    /**
     * Focus an option during keyboard navigation.
     */
    function focusOption(options, index) {
        if (!options[index]) {
            return;
        }

        options.forEach((option) => {
            option.classList.remove("is-focused");
        });

        options[index].classList.add("is-focused");

        options[index].scrollIntoView({
            block: "nearest"
        });
    }


    /**
     * Return options that are available for selection.
     */
    function getEnabledOptions(wrapper) {
        return Array.from(
            wrapper.querySelectorAll(
                ".custom-select-option:not(:disabled)"
            )
        );
    }


    /**
     * Remove temporary keyboard focus styling.
     */
    function clearFocusedOptions(wrapper) {
        wrapper
            .querySelectorAll(".custom-select-option.is-focused")
            .forEach((option) => {
                option.classList.remove("is-focused");
            });
    }


    /**
     * Open upward if there is not enough viewport space below.
     */
    function setDropdownDirection(wrapper) {
        const trigger = wrapper.querySelector(".custom-select-trigger");
        const optionsList = wrapper.querySelector(".custom-select-options");

        wrapper.classList.remove("opens-upward");

        /*
         * Temporarily display the options to calculate their height.
         */
        const previousDisplay = optionsList.style.display;
        const previousVisibility = optionsList.style.visibility;

        optionsList.style.display = "block";
        optionsList.style.visibility = "hidden";

        const triggerRect = trigger.getBoundingClientRect();
        const optionsHeight = Math.min(
            optionsList.scrollHeight,
            280
        );

        const spaceBelow =
            window.innerHeight - triggerRect.bottom;

        const spaceAbove = triggerRect.top;

        optionsList.style.display = previousDisplay;
        optionsList.style.visibility = previousVisibility;

        if (
            spaceBelow < optionsHeight + 20 &&
            spaceAbove > spaceBelow
        ) {
            wrapper.classList.add("opens-upward");
        }
    }


    /**
     * Enhance all selects in a supplied element.
     */
    function enhanceSelectsInside(element) {
        if (!(element instanceof Element)) {
            return;
        }

        if (element.matches("select")) {
            enhanceSelect(element);
        }

        element.querySelectorAll("select").forEach(enhanceSelect);
    }


    /*
     * Enhance the dropdowns already on the page.
     */
    document.querySelectorAll(".project-form select").forEach(enhanceSelect);


    /*
     * Enhance dropdowns inside dynamically added project cards.
     */
    const projectsContainer =
        document.getElementById("projectsContainer");

    if (projectsContainer) {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    enhanceSelectsInside(node);
                });
            });
        });

        observer.observe(projectsContainer, {
            childList: true,
            subtree: true
        });
    }


    /*
     * Close dropdowns when clicking elsewhere.
     */
    document.addEventListener("click", (event) => {
        if (!event.target.closest(".custom-select")) {
            closeAllDropdowns();
        }
    });


    /*
     * Close dropdowns when the viewport changes.
     */
    window.addEventListener(
        "resize",
        () => {
            closeAllDropdowns();
        },
        {
            passive: true
        }
    );

    window.addEventListener(
        "scroll",
        () => {
            closeAllDropdowns();
        },
        {
            passive: true
        }
    );


    /*
     * Apply custom invalid styling before submission.
     */
    const projectForm = document.getElementById("contactForm");

    projectForm?.addEventListener(
        "invalid",
        (event) => {
            const invalidSelect = event.target;

            if (!(invalidSelect instanceof HTMLSelectElement)) {
                return;
            }

            const wrapper = invalidSelect.closest(".custom-select");

            wrapper?.classList.add("is-invalid");

            window.setTimeout(() => {
                wrapper
                    ?.querySelector(".custom-select-trigger")
                    ?.focus();
            }, 0);
        },
        true
    );


    /*
     * Reset custom dropdown labels when the form is reset.
     */
    projectForm?.addEventListener("reset", () => {
        window.setTimeout(() => {
            projectForm
                .querySelectorAll("select")
                .forEach(updateCustomSelect);
        }, 0);
    });
});