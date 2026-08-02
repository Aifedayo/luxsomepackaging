document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("contactForm");

    if (!form) {
        console.error("Contact form was not found.");
        return;
    }

    const API_BASE = window.LUXSOME?.apiBase;

    if (!API_BASE) {
        console.error(
            "Luxsome environment configuration was not loaded."
        );
        return;
    }

    const brandName = document.getElementById("brandName");
    const phoneNumber = document.getElementById("phoneNumber");
    const emailAddress = document.getElementById("emailAddress");
    const message = document.getElementById("message");
    const enquiryReference = document.getElementById("enquiryReference");

    const characterCount = document.getElementById("characterCount");
    const formStatus = document.getElementById("formStatus");
    const submitButton = document.getElementById("submitButton");
    const buttonText = submitButton?.querySelector(".button-text");
    const currentYear = document.getElementById("currentYear");

    if (
        !brandName ||
        !phoneNumber ||
        !emailAddress ||
        !message ||
        !characterCount ||
        !formStatus ||
        !submitButton ||
        !buttonText
    ) {
        console.error("One or more contact form elements are missing.");
        return;
    }

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
        let cleanedValue = phoneNumber.value.replace(/[^0-9+\s()-]/g, "");
        cleanedValue = cleanedValue.replace(/(?!^)\+/g, "");

        if (phoneNumber.value !== cleanedValue) {
            phoneNumber.value = cleanedValue;

            showError(
                phoneNumber,
                "phoneNumberError",
                "Only numbers and valid phone symbols are allowed."
            );

            return;
        }

        clearFieldError(phoneNumber, "phoneNumberError");
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
            formStatus.textContent = "Please correct the highlighted fields.";
            formStatus.classList.add("is-error");
            focusFirstInvalidField();
            return;
        }

        const reference = getOrCreateEnquiryReference();
        setLoadingState(true);

        try {
            const response = await fetch(`${API_BASE}/contact`, {
                method: "POST",
                body: new FormData(form),
                headers: {
                    Accept: "application/json"
                }
            });

            const responseData = await response.json().catch(function () {
                return {};
            });

            if (!response.ok) {
                throw new Error(
                    responseData.message ||
                    getApiError(responseData) ||
                    "Your message could not be sent. Please try again."
                );
            }

            const confirmedReference = responseData.reference || reference;

            try {
                sessionStorage.setItem(
                    "luxsomeContactConfirmation",
                    JSON.stringify({
                        reference: confirmedReference,
                        brandName: values.brandName,
                        emailAddress: values.emailAddress,
                        submittedAt: new Date().toISOString()
                    })
                );
            } catch (storageError) {
                console.warn(
                    "The message was sent, but confirmation details could not be stored.",
                    storageError
                );
            }

            form.reset();
            characterCount.textContent = "0 / 1500";

            window.location.assign(
                `/contact/success/?reference=${encodeURIComponent(confirmedReference)}`
            );
        } catch (error) {
            console.error("Contact form submission failed:", error);

            formStatus.textContent =
                error.message ||
                "Something went wrong. Please check your connection and try again.";

            formStatus.classList.add("is-error");
            setLoadingState(false);
        }
    });

    function getOrCreateEnquiryReference() {
        const existing = enquiryReference?.value.trim();

        if (/^LC-\d{8}-\d{4}$/.test(existing || "")) {
            return existing;
        }

        const now = new Date();
        const date = [
            now.getFullYear(),
            String(now.getMonth() + 1).padStart(2, "0"),
            String(now.getDate()).padStart(2, "0")
        ].join("");

        const random = Math.floor(1000 + Math.random() * 9000);
        const reference = `LC-${date}-${random}`;

        if (enquiryReference) {
            enquiryReference.value = reference;
        }

        return reference;
    }

    function setLoadingState(isLoading) {
        submitButton.disabled = isLoading;
        submitButton.classList.toggle("loading", isLoading);
        submitButton.setAttribute("aria-busy", String(isLoading));
        buttonText.textContent = isLoading ? "Sending..." : "Send Message";
    }

    function validateForm(values) {
        let isValid = true;

        if (values.brandName.length < 2 || values.brandName.length > 100) {
            showError(
                brandName,
                "brandNameError",
                "Please enter a valid brand name."
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
        } else if (values.message.length > 1500) {
            showError(
                message,
                "messageError",
                "Your message must not exceed 1,500 characters."
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

        const errorElement = document.getElementById(errorElementId);

        if (errorElement) {
            errorElement.textContent = errorMessage;
        }
    }

    function clearFieldError(field, errorElementId) {
        field.classList.remove("is-invalid");
        field.removeAttribute("aria-invalid");

        const errorElement = document.getElementById(errorElementId);

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

    function focusFirstInvalidField() {
        form.querySelector(".is-invalid")?.focus();
    }

    function getApiError(responseData) {
        if (
            responseData &&
            Array.isArray(responseData.errors) &&
            responseData.errors.length
        ) {
            return responseData.errors
                .map(function (error) {
                    return error.message;
                })
                .filter(Boolean)
                .join(" ");
        }

        return "";
    }
});
