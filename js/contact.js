document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("contactForm");

    if (!form) {
        console.error("Contact form was not found.");
        return;
    }

    const brandName = document.getElementById("brandName");
    const phoneNumber = document.getElementById("phoneNumber");
    const emailAddress = document.getElementById("emailAddress");
    const message = document.getElementById("message");

    const characterCount = document.getElementById("characterCount");
    const formStatus = document.getElementById("formStatus");
    const submitButton = document.getElementById("submitButton");
    const buttonText = submitButton.querySelector(".button-text");
    const currentYear = document.getElementById("currentYear");

    /*
     * Use the Formspree endpoint already placed in the
     * form's action attribute.
     */
    const formspreeEndpoint = form.action;

    if (currentYear) {
        currentYear.textContent = new Date().getFullYear();
    }

    message.addEventListener("input", function () {
        characterCount.textContent = `${message.value.length} / 1500`;

        if (message.classList.contains("is-invalid")) {
            clearFieldError(message, "messageError");
        }
    });

    brandName.addEventListener("input", function () {
        if (brandName.classList.contains("is-invalid")) {
            clearFieldError(brandName, "brandNameError");
        }
    });

    phoneNumber.addEventListener("input", function () {
        let cleanedValue = phoneNumber.value.replace(
            /[^0-9+\s()-]/g,
            ""
        );
    
        cleanedValue = cleanedValue.replace(
            /(?!^)\+/g,
            ""
        );
    
        if (phoneNumber.value !== cleanedValue) {
            phoneNumber.value = cleanedValue;
    
            showError(
                phoneNumber,
                "phoneNumberError",
                "Only numbers and valid phone symbols are allowed."
            );
    
            return;
        }
    
        clearFieldError(
            phoneNumber,
            "phoneNumberError"
        );
    });

    emailAddress.addEventListener("input", function () {
        if (emailAddress.classList.contains("is-invalid")) {
            clearFieldError(emailAddress, "emailAddressError");
        }
    });

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        clearErrors();
        formStatus.textContent = "";
        formStatus.classList.remove("is-success", "is-error");

        const values = {
            brandName: brandName.value.trim(),
            phoneNumber: phoneNumber.value.trim(),
            emailAddress: emailAddress.value.trim(),
            message: message.value.trim()
        };

        if (!validateForm(values)) {
            formStatus.textContent =
                "Please correct the highlighted fields.";
            formStatus.classList.add("is-error");
            return;
        }

        setLoadingState(true);

        /*
         * FormData automatically includes:
         * - brandName
         * - phoneNumber
         * - emailAddress
         * - message
         * - _subject
         */
        const submissionData = new FormData(form);

        /*
         * Add Formspree's preferred email field.
         * This allows Reply-To to work correctly.
         */
        submissionData.set("email", values.emailAddress);

        try {
            const response = await fetch(formspreeEndpoint, {
                method: "POST",
                body: submissionData,
                headers: {
                    Accept: "application/json"
                }
            });

            if (!response.ok) {
                const responseData = await response.json().catch(function () {
                    return {};
                });

                throw new Error(
                    getFormspreeError(responseData)
                );
            }

            form.reset();
            characterCount.textContent = "0 / 1500";

            /*
             * Redirect to:
             * contact/success/index.html
             */
            window.location.assign("/contact/success/");
        } catch (error) {
            console.error("Form submission failed:", error);

            formStatus.textContent =
                error.message ||
                "Something went wrong. Please try again.";

            formStatus.classList.add("is-error");

            setLoadingState(false);
        }
    });

    function setLoadingState(isLoading) {
        submitButton.disabled = isLoading;
        submitButton.classList.toggle("loading", isLoading);
        submitButton.setAttribute(
            "aria-busy",
            isLoading ? "true" : "false"
        );

        buttonText.textContent = isLoading
            ? "Sending..."
            : "Send Message";
    }

    function validateForm(values) {
        let isValid = true;

        if (values.brandName.length < 2) {
            showError(
                brandName,
                "brandNameError",
                "Please enter your brand name."
            );

            isValid = false;
        }

        const phonePattern = /^\+?[0-9\s()-]+$/;
        const phoneDigits = values.phoneNumber.replace(/\D/g, "");

        if (!phonePattern.test(values.phoneNumber)) {
            showError(
                phoneNumber,
                "phoneNumberError",
                "Phone number must not contain letters."
            );

            isValid = false;
        } else if (phoneDigits.length < 10 || phoneDigits.length > 15) {
            showError(
                phoneNumber,
                "phoneNumberError",
                "Please enter a valid phone number with 10 to 15 digits."
            );

            isValid = false;
        }

        if (!isValidEmail(values.emailAddress)) {
            showError(
                emailAddress,
                "emailAddressError",
                "Please enter a valid email address."
            );

            isValid = false;
        }

        if (values.message.length < 10) {
            showError(
                message,
                "messageError",
                "Please provide a little more information about your enquiry."
            );

            isValid = false;
        }

        return isValid;
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function showError(field, errorElementId, errorMessage) {
        field.classList.add("is-invalid");
        field.setAttribute("aria-invalid", "true");

        const errorElement =
            document.getElementById(errorElementId);

        if (errorElement) {
            errorElement.textContent = errorMessage;
        }
    }

    function clearFieldError(field, errorElementId) {
        field.classList.remove("is-invalid");
        field.removeAttribute("aria-invalid");

        const errorElement =
            document.getElementById(errorElementId);

        if (errorElement) {
            errorElement.textContent = "";
        }
    }

    function clearErrors() {
        clearFieldError(brandName, "brandNameError");
        clearFieldError(phoneNumber, "phoneNumberError");
        clearFieldError(emailAddress, "emailAddressError");
        clearFieldError(message, "messageError");
    }

    function getFormspreeError(responseData) {
        if (
            responseData &&
            Array.isArray(responseData.errors) &&
            responseData.errors.length
        ) {
            return responseData.errors
                .map(function (error) {
                    return error.message;
                })
                .join(" ");
        }

        return "Your message could not be sent. Please try again.";
    }
});