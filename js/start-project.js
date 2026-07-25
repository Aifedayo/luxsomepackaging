document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("contactForm");
    const notification = document.getElementById("notification");

    if (!form) {
        console.error('Contact form with id="contactForm" was not found.');
        return;
    }

    const submitButton = form.querySelector(
        'button[type="submit"]'
    );

    if (!submitButton) {
        console.error(
            "The contact form submit button was not found."
        );
        return;
    }

    let notificationTimer;

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const selectedProducts = form.querySelectorAll(
            'input[name="products[]"]:checked'
        );

        if (selectedProducts.length === 0) {
            showNotification(
                "Please select at least one product or packaging service.",
                "error"
            );

            const firstProductCheckbox = form.querySelector(
                'input[name="products[]"]'
            );

            firstProductCheckbox?.focus();
            return;
        }

        const originalButtonContent =
            submitButton.innerHTML;

        submitButton.disabled = true;
        submitButton.setAttribute("aria-busy", "true");

        submitButton.innerHTML = `
            <span class="spinner" aria-hidden="true"></span>
            <span>Sending...</span>
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
                form.reset();

                showNotification(
                    "Thank you! Your enquiry has been sent successfully. We will get back to you shortly.",
                    "success"
                );

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
            console.error(
                "Contact form submission failed:",
                error
            );

            showNotification(
                "Unable to send your enquiry. Please check your internet connection and try again.",
                "error"
            );
        } finally {
            submitButton.disabled = false;
            submitButton.removeAttribute("aria-busy");
            submitButton.innerHTML =
                originalButtonContent;
        }
    });

    function showNotification(message, type) {
        if (!notification) {
            alert(message);
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
        }, 5000);
    }
});