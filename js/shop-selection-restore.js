document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("productConfigForm");
    if (!form) return;

    const configuration = readSavedConfiguration();

    if (!shouldRestore(configuration)) return;

    const fieldMap = {
        box_style: "boxStyle",
        tag_style: "tagStyle",
        thank_you_card: "thankYouCard",
        sticker_style: "stickerStyle",
        tissue_style: "tissueStyle",
        envelope_style: "envelopeStyle",
        ribbon_style: "ribbonStyle",
        ribbon_colour: "ribbonColour",
        logo_finish: "logoFinish",
        artwork_status: "artworkStatus",
        quantity: "quantity",
        box_length_cm: "boxLength",
        box_breadth_cm: "boxBreadth",
        box_height_cm: "boxHeight",
        primary_colour: "primaryColour",
        custom_colour: "customColour",
        secondary_colour: "secondaryColour",
        accent_colour: "accentColour",
        pantone_reference: "pantoneReference",
        comments: "comments",
        project_type: "projectType"
    };

    Object.entries(fieldMap).forEach(([configurationKey, fieldName]) => {
        const value = configuration[configurationKey];

        if (
            value === null ||
            value === undefined ||
            String(value).trim() === ""
        ) {
            return;
        }

        restoreField(fieldName, String(value));
    });

    restoreAccessories(configuration.accessories);

    form.dispatchEvent(
        new CustomEvent("luxsome:configuration-restored", {
            bubbles: true,
            detail: configuration
        })
    );

    window.requestAnimationFrame(() => {
        form.querySelectorAll("input:checked").forEach(input => {
            input.dispatchEvent(
                new Event("change", { bubbles: true })
            );
        });

        ["boxLength", "boxBreadth", "boxHeight", "quantity"].forEach(id => {
            document.getElementById(id)?.dispatchEvent(
                new Event("input", { bubbles: true })
            );
        });
    });
});

function readSavedConfiguration() {
    const params = new URLSearchParams(window.location.search);
    let saved = {};

    try {
        saved = JSON.parse(
            localStorage.getItem("luxsomeShopConfiguration") || "{}"
        );
    } catch (error) {
        console.warn("Saved configuration could not be read.", error);
    }

    const queryValues = {};

    params.forEach((value, key) => {
        queryValues[key] = value;
    });

    return {
        ...saved,
        ...queryValues
    };
}

function shouldRestore(configuration) {
    return (
        configuration.restore_configuration === "1" ||
        new URLSearchParams(window.location.search)
            .get("restore_configuration") === "1"
    );
}

function restoreField(fieldName, value) {
    const fields = Array.from(
        document.querySelectorAll(`[name="${CSS.escape(fieldName)}"]`)
    );

    if (!fields.length) {
        const elementById = document.getElementById(fieldName);

        if (elementById) {
            elementById.value = value;
        }

        return;
    }

    const firstField = fields[0];

    if (
        firstField instanceof HTMLInputElement &&
        ["radio", "checkbox"].includes(firstField.type)
    ) {
        const matchingField = fields.find(field => (
            field.value.trim().toLowerCase() ===
            value.trim().toLowerCase()
        ));

        if (matchingField) {
            matchingField.checked = true;
        }

        return;
    }

    firstField.value = value;
}

function restoreAccessories(value) {
    if (!value) return;

    const selectedValues = String(value)
        .split(",")
        .map(item => item.trim().toLowerCase())
        .filter(Boolean);

    document
        .querySelectorAll('input[name="accessories"]')
        .forEach(input => {
            input.checked = selectedValues.includes(
                input.value.trim().toLowerCase()
            );
        });
}
