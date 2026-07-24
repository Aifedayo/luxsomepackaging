document.addEventListener("DOMContentLoaded", () => {
    const popup = document.getElementById("newsletterPopup");
    const form = document.getElementById("newsletterForm");
    const emailInput = document.getElementById("newsletterEmail");
    const closeButton = document.getElementById(
        "newsletterCloseButton"
    );
    const message = document.getElementById("newsletterMessage");
    const successView = document.getElementById(
        "newsletterSuccess"
    );

    if (!popup || !form) {
        return;
    }

    const submitButton = form.querySelector(
        'button[type="submit"]'
    );

    const closeElements = popup.querySelectorAll(
        "[data-newsletter-close]"
    );

    const STORAGE_KEYS = {
        dismissed: "luxsomeNewsletterDismissedAt",
        subscribed: "luxsomeNewsletterSubscribed"
    };

    const POPUP_DELAY = 10000;
    const DISMISSAL_DURATION =
        7 * 24 * 60 * 60 * 1000;

    let popupTimer;
    let lastFocusedElement = null;

    function isContactPage() {
        const path = window.location.pathname
            .toLowerCase()
            .replace(/\/+$/, "");

        return (
            path === "/contact" ||
            path.endsWith("/contact")
        );
    }

    function hasSubscribed() {
        return (
            localStorage.getItem(
                STORAGE_KEYS.subscribed
            ) === "true"
        );
    }

    function wasDismissedRecently() {
        const dismissedAt = Number(
            localStorage.getItem(
                STORAGE_KEYS.dismissed
            )
        );

        if (!dismissedAt) {
            return false;
        }

        return (
            Date.now() - dismissedAt <
            DISMISSAL_DURATION
        );
    }

    function shouldShowPopup() {
        return (
            !isContactPage() &&
            !hasSubscribed() &&
            !wasDismissedRecently()
        );
    }

    function openPopup() {
        if (!shouldShowPopup()) {
            return;
        }

        lastFocusedElement =
            document.activeElement;

        popup.classList.add("is-visible");
        popup.setAttribute("aria-hidden", "false");

        document.body.classList.add(
            "newsletter-open"
        );

        window.setTimeout(() => {
            emailInput?.focus();
        }, 400);
    }

    function closePopup({
        rememberDismissal = true
    } = {}) {
        popup.classList.remove("is-visible");
        popup.setAttribute("aria-hidden", "true");

        document.body.classList.remove(
            "newsletter-open"
        );

        if (
            rememberDismissal &&
            !hasSubscribed()
        ) {
            localStorage.setItem(
                STORAGE_KEYS.dismissed,
                String(Date.now())
            );
        }

        lastFocusedElement?.focus?.();
    }

    function showMessage(text, type = "error") {
        if (!message) {
            return;
        }

        message.textContent = text;
        message.className =
            `newsletter-form__message is-${type}`;
    }

    function clearMessage() {
        if (!message) {
            return;
        }

        message.textContent = "";
        message.className =
            "newsletter-form__message";
    }

    function showSuccessView() {
        form.style.display = "none";

        successView?.classList.add("is-visible");
        successView?.setAttribute(
            "aria-hidden",
            "false"
        );
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        clearMessage();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const originalButtonContent =
            submitButton.innerHTML;

        submitButton.disabled = true;
        submitButton.setAttribute(
            "aria-busy",
            "true"
        );

        submitButton.innerHTML = `
            <span
                class="newsletter-spinner"
                aria-hidden="true"
            ></span>
            <span>Joining...</span>
        `;

        try {
            const response = await fetch(
                form.action,
                {
                    method: "POST",
                    body: new FormData(form),
                    headers: {
                        Accept: "application/json"
                    }
                }
            );

            if (response.ok) {
                localStorage.setItem(
                    STORAGE_KEYS.subscribed,
                    "true"
                );

                localStorage.removeItem(
                    STORAGE_KEYS.dismissed
                );

                form.reset();
                showSuccessView();
                return;
            }

            let errorMessage =
                "We could not add you to the list. Please try again.";

            try {
                const data = await response.json();

                if (
                    Array.isArray(data.errors) &&
                    data.errors.length > 0
                ) {
                    errorMessage = data.errors
                        .map((error) => error.message)
                        .filter(Boolean)
                        .join(" ");
                }
            } catch (error) {
                console.warn(
                    "Formspree returned an unreadable response.",
                    error
                );
            }

            showMessage(errorMessage, "error");
        } catch (error) {
            console.error(
                "Newsletter submission failed:",
                error
            );

            showMessage(
                "Unable to subscribe right now. Please check your connection and try again.",
                "error"
            );
        } finally {
            submitButton.disabled = false;
            submitButton.removeAttribute(
                "aria-busy"
            );

            submitButton.innerHTML =
                originalButtonContent;
        }
    });

    closeElements.forEach((element) => {
        element.addEventListener("click", () => {
            closePopup();
        });
    });

    document.addEventListener(
        "keydown",
        (event) => {
            if (
                event.key === "Escape" &&
                popup.classList.contains(
                    "is-visible"
                )
            ) {
                closePopup();
            }
        }
    );

    popupTimer = window.setTimeout(() => {
        openPopup();
    }, POPUP_DELAY);

    window.addEventListener(
        "beforeunload",
        () => {
            window.clearTimeout(popupTimer);
        }
    );
});