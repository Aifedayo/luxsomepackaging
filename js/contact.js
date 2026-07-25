document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("contactForm");

    const brandName = document.getElementById("brandName");
    const phoneNumber = document.getElementById("phoneNumber");
    const emailAddress = document.getElementById("emailAddress");
    const message = document.getElementById("message");

    const characterCount = document.getElementById("characterCount");
    const formStatus = document.getElementById("formStatus");
    const currentYear = document.getElementById("currentYear");

    /*
     * Replace this with the WhatsApp number that should
     * receive Luxsome enquiries.
     *
     * Use the international format without:
     * +, spaces, brackets or hyphens.
     */
    const luxsomeWhatsAppNumber = "2348061389594";

    currentYear.textContent = new Date().getFullYear();

    message.addEventListener("input", function () {
        characterCount.textContent = `${message.value.length} / 1500`;
    });

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        clearErrors();
        formStatus.textContent = "";

        const formData = {
            brandName: brandName.value.trim(),
            phoneNumber: phoneNumber.value.trim(),
            emailAddress: emailAddress.value.trim(),
            message: message.value.trim()
        };

        const isValid = validateForm(formData);

        if (!isValid) {
            formStatus.textContent =
                "Please correct the highlighted fields before continuing.";

            return;
        }

        const whatsappMessage = [
            "Hello Luxsome Packaging,",
            "",
            "I would like to make an enquiry.",
            "",
            `Brand name: ${formData.brandName}`,
            `Phone number: ${formData.phoneNumber}`,
            `Email address: ${formData.emailAddress}`,
            "",
            "Message:",
            formData.message
        ].join("\n");

        const whatsappUrl =
            `https://wa.me/${luxsomeWhatsAppNumber}` +
            `?text=${encodeURIComponent(whatsappMessage)}`;

        formStatus.textContent = "Opening your message in WhatsApp…";

        window.open(
            whatsappUrl,
            "_blank",
            "noopener,noreferrer"
        );
    });

    function validateForm(formData) {
        let isValid = true;

        if (formData.brandName.length < 2) {
            showError(
                brandName,
                "brandNameError",
                "Please enter your brand name."
            );

            isValid = false;
        }

        const phoneDigits = formData.phoneNumber.replace(/\D/g, "");

        if (phoneDigits.length < 10) {
            showError(
                phoneNumber,
                "phoneNumberError",
                "Please enter a valid phone number."
            );

            isValid = false;
        }

        if (!isValidEmail(formData.emailAddress)) {
            showError(
                emailAddress,
                "emailAddressError",
                "Please enter a valid email address."
            );

            isValid = false;
        }

        if (formData.message.length < 10) {
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

        document.getElementById(errorElementId).textContent =
            errorMessage;
    }

    function clearErrors() {
        const fields = [
            brandName,
            phoneNumber,
            emailAddress,
            message
        ];

        fields.forEach(function (field) {
            field.classList.remove("is-invalid");
            field.removeAttribute("aria-invalid");
        });

        document
            .querySelectorAll(".field-error")
            .forEach(function (errorElement) {
                errorElement.textContent = "";
            });
    }
});