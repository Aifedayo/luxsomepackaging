document.addEventListener('DOMContentLoaded', () => {
    /*
     * Restore a configuration before the rest of the product page
     * initialises. This ensures gallery state, colour controls and
     * calculations start from the customer's saved selections.
     */
    const restoreProductConfiguration = () => {
        const form = document.getElementById('productConfigForm');
        if (!form) return;

        const params = new URLSearchParams(window.location.search);

        if (params.get('restore_configuration') !== '1') return;

        let stored = {};

        try {
            stored = JSON.parse(
                localStorage.getItem('luxsomeShopConfiguration') || '{}'
            );
        } catch (error) {
            console.warn(
                'The saved shop configuration could not be restored.',
                error
            );
        }

        const queryValues = {};

        params.forEach((value, key) => {
            queryValues[key] = value;
        });

        const configuration = {
            ...stored,
            ...queryValues
        };

        const fieldMap = {
            project_type: 'projectType',
            box_style: 'boxStyle',
            tag_style: 'tagStyle',
            thank_you_card: 'thankYouCard',
            sticker_style: 'stickerStyle',
            tissue_style: 'tissueStyle',
            envelope_style: 'envelopeStyle',
            ribbon_style: 'ribbonStyle',
            ribbon_colour: 'ribbonColour',
            logo_finish: 'logoFinish',
            artwork_status: 'artworkStatus',
            quantity: 'quantity',
            box_quantity: 'boxQuantity',
            other_pieces_quantity: 'otherPiecesQuantity',
            box_length_cm: 'boxLength',
            box_breadth_cm: 'boxBreadth',
            box_height_cm: 'boxHeight',
            primary_colour: 'primaryColour',
            custom_colour: 'customColour',
            secondary_colour: 'secondaryColour',
            accent_colour: 'accentColour',
            pantone_reference: 'pantoneReference',
            comments: 'comments'
        };

        const setFieldValue = (fieldName, value) => {
            if (
                value === null ||
                value === undefined ||
                String(value).trim() === ''
            ) {
                return;
            }

            const fields = Array.from(
                form.querySelectorAll(
                    `[name="${CSS.escape(fieldName)}"]`
                )
            );

            if (!fields.length) {
                const element = document.getElementById(fieldName);

                if (element) {
                    element.value = String(value);
                }

                return;
            }

            const firstField = fields[0];

            if (
                firstField instanceof HTMLInputElement &&
                firstField.type === 'radio'
            ) {
                const matchingField = fields.find(field => (
                    field.value.trim().toLowerCase() ===
                    String(value).trim().toLowerCase()
                ));

                if (matchingField) {
                    matchingField.checked = true;
                }

                return;
            }

            firstField.value = String(value);
        };

        Object.entries(fieldMap).forEach(([key, fieldName]) => {
            setFieldValue(fieldName, configuration[key]);
        });

        const selectedAccessories = String(
            configuration.accessories || ''
        )
            .split(',')
            .map(item => item.trim().toLowerCase())
            .filter(Boolean);

        form
            .querySelectorAll('input[name="accessories"]')
            .forEach(input => {
                input.checked = selectedAccessories.includes(
                    input.value.trim().toLowerCase()
                );
            });

        const selectedPieces = String(
            configuration.packaging_pieces || ''
        )
            .split(',')
            .map(item => item.trim().toLowerCase())
            .filter(Boolean);

        form
            .querySelectorAll('input[name="packagingPieces"]')
            .forEach(input => {
                input.checked = selectedPieces.includes(
                    input.value.trim().toLowerCase()
                );
            });

        form.dataset.configurationRestored = 'true';
    };

    restoreProductConfiguration();

    /*
    * Tier 3 thank-you insert and envelope relationship.
    *
    * The envelope is available only when the customer chooses
    * the Thank-you note option.
    */
    const setupThankYouEnvelopeSelection = () => {
        const form = document.getElementById(
            "productConfigForm"
        );

        const envelopeSection = document.getElementById(
            "envelopeConfiguration"
        );

        if (!form || !envelopeSection) {
            return;
        }

        const thankYouInputs = Array.from(
            form.querySelectorAll(
                'input[name="thankYouCard"]'
            )
        );

        const envelopeInputs = Array.from(
            envelopeSection.querySelectorAll(
                'input[name="envelopeStyle"]'
            )
        );

        if (!thankYouInputs.length) {
            return;
        }

        const updateEnvelopeVisibility = () => {
            const selectedThankYouOption =
                form.querySelector(
                    'input[name="thankYouCard"]:checked'
                );

            const shouldShowEnvelope =
                selectedThankYouOption?.value ===
                "Thank-you note";

            envelopeSection.hidden =
                !shouldShowEnvelope;

            envelopeSection.setAttribute(
                "aria-hidden",
                String(!shouldShowEnvelope)
            );

            envelopeInputs.forEach((input) => {
                input.disabled =
                    !shouldShowEnvelope;
            });

            /*
            * Ensure one envelope style is selected whenever
            * the envelope section becomes available.
            */
            if (
                shouldShowEnvelope &&
                !envelopeInputs.some(
                    (input) => input.checked
                )
            ) {
                const defaultEnvelope =
                    envelopeInputs.find(
                        (input) =>
                            input.value ===
                            "Wallet envelope"
                    ) ||
                    envelopeInputs[0];

                if (defaultEnvelope) {
                    defaultEnvelope.checked = true;
                }
            }

            /*
            * Notify the rest of shop.js that the configuration
            * has changed. This keeps image previews and saved
            * configuration in sync where applicable.
            */
            envelopeSection.dispatchEvent(
                new CustomEvent(
                    "luxsome:envelope-visibility-change",
                    {
                        bubbles: true,
                        detail: {
                            visible:
                                shouldShowEnvelope
                        }
                    }
                )
            );
        };

        thankYouInputs.forEach((input) => {
            input.addEventListener(
                "change",
                updateEnvelopeVisibility
            );
        });

        updateEnvelopeVisibility();
    };

    setupThankYouEnvelopeSelection();

    const sort = document.getElementById('shopSort');
    const grid = document.getElementById('productGrid');

    if (sort && grid) {
        sort.addEventListener('change', () => {
            const cards = [...grid.querySelectorAll('.product-card')];

            cards.sort((a, b) => {
                if (sort.value === 'items-low') return Number(a.dataset.items) - Number(b.dataset.items);
                if (sort.value === 'items-high') return Number(b.dataset.items) - Number(a.dataset.items);
                return Number(a.dataset.order) - Number(b.dataset.order);
            });

            cards.forEach(card => grid.appendChild(card));
        });
    }

    const mainImage = document.getElementById('productMainImage');

    document.querySelectorAll('.product-thumb').forEach(button => {
        button.addEventListener('click', () => {
            if (!mainImage) return;

            mainImage.src = button.dataset.image;

            document.querySelectorAll('.product-thumb').forEach(item => {
                item.classList.remove('is-active');
            });

            button.classList.add('is-active');
        });
    });

    const quantityInput = document.getElementById('quantity');
    const boxQuantityInput = document.getElementById('boxQuantity');
    const otherPiecesQuantityInput = document.getElementById(
        'otherPiecesQuantity'
    );

    const validateQuantityInput = (input, fallbackMinimum = 25) => {
        if (!input || input.disabled) return '';

        const quantity = Number(input.value);
        const minimum = Number(input.min || fallbackMinimum);

        if (
            !Number.isInteger(quantity) ||
            quantity < minimum ||
            quantity % 25 !== 0
        ) {
            input.setCustomValidity(
                `Enter at least ${minimum} pieces in multiples of 25.`
            );
            input.reportValidity();
            return null;
        }

        input.setCustomValidity('');
        return String(quantity);
    };

    const getSelectedQuantity = () => (
        validateQuantityInput(quantityInput, 25)
    );

    [
        quantityInput,
        boxQuantityInput,
        otherPiecesQuantityInput
    ].forEach(input => {
        input?.addEventListener('input', () => {
            input.setCustomValidity('');
        });
    });

    const lengthInput = document.getElementById('boxLength');
    const breadthInput = document.getElementById('boxBreadth');
    const heightInput = document.getElementById('boxHeight');
    const weightCalculator = document.getElementById('weightCalculator');
    const volumetricWeight = document.getElementById('volumetricWeight');
    const weightStatus = document.getElementById('weightStatus');

    const calculateVolumetricWeight = () => {
        if (!lengthInput || !breadthInput || !heightInput || !weightCalculator || !volumetricWeight || !weightStatus) {
            return null;
        }

        const length = Number(lengthInput.value);
        const breadth = Number(breadthInput.value);
        const height = Number(heightInput.value);

        weightCalculator.classList.remove('is-within-limit', 'is-over-limit');

        if (length <= 0 || breadth <= 0 || height <= 0) {
            volumetricWeight.textContent = 'Enter dimensions';
            weightStatus.textContent = 'Pricing covers a finished box of up to 1 kg volumetric weight.';
            return null;
        }

        const weight = (length * breadth * height) / 5000;
        const roundedWeight = Number(weight.toFixed(2));

        volumetricWeight.textContent = `${roundedWeight.toFixed(2)} kg`;

        if (roundedWeight <= 1) {
            weightCalculator.classList.add('is-within-limit');
            weightStatus.textContent = 'Included within the standard 1 kg pricing allowance.';
        } else {
            weightCalculator.classList.add('is-over-limit');
            weightStatus.textContent = 'This exceeds the standard 1 kg allowance. An additional size charge may apply.';
        }

        return roundedWeight;
    };

    [lengthInput, breadthInput, heightInput].forEach(input => {
        input?.addEventListener('input', calculateVolumetricWeight);
    });

    const standardColourOptions = document.querySelectorAll('input[name="primaryColour"]');
    const customColourField = document.getElementById('customColourField');
    const customColourInput = document.getElementById('customColour');

    const toggleStandardCustomColour = () => {
        if (!customColourField || !customColourInput) return;

        const selected = document.querySelector('input[name="primaryColour"]:checked');
        const isCustom = selected?.value === 'Other';

        customColourField.hidden = !isCustom;
        customColourInput.required = isCustom;

        if (!isCustom) customColourInput.value = '';
    };

    standardColourOptions.forEach(option => {
        option.addEventListener('change', toggleStandardCustomColour);
    });

    toggleStandardCustomColour();

    const form = document.getElementById('productConfigForm');
    const product = document.querySelector('.product-detail');

    const submitConfiguration = () => {
        if (!form || !product) return;

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const data = new FormData(form);
        const selectedPieces = data.getAll('packagingPieces');
        const isBespoke = product.dataset.product === 'bespoke';
        const hasRigidBox =
            !isBespoke || selectedPieces.includes('Rigid box');
        const hasOtherPieces =
            isBespoke &&
            selectedPieces.some(piece => piece !== 'Rigid box');

        const selectedQuantity = isBespoke
            ? ''
            : getSelectedQuantity();

        if (!isBespoke && selectedQuantity === null) return;

        const selectedBoxQuantity = hasRigidBox
            ? validateQuantityInput(boxQuantityInput, 25)
            : '';

        if (hasRigidBox && isBespoke && selectedBoxQuantity === null) {
            return;
        }

        const selectedOtherQuantity = hasOtherPieces
            ? validateQuantityInput(otherPiecesQuantityInput, 100)
            : '';

        if (hasOtherPieces && selectedOtherQuantity === null) {
            return;
        }

        const calculatedWeight = hasRigidBox
            ? calculateVolumetricWeight()
            : null;

        if (hasRigidBox && calculatedWeight === null) {
            lengthInput?.setCustomValidity(
                'Enter the finished box dimensions.'
            );
            lengthInput?.reportValidity();
            return;
        }

        lengthInput?.setCustomValidity('');

        const params = new URLSearchParams();

        params.set('source', 'shop');
        params.set('product', product.dataset.product || '');
        params.set('system', product.dataset.productName || '');
        params.set('project_type', data.get('projectType') || '');
        params.set('packaging_pieces', data.getAll('packagingPieces').join(', '));
        params.set('box_style', data.get('boxStyle') || '');
        params.set('tag_style', data.get('tagStyle') || '');
        params.set('sticker_style', data.get('stickerStyle') || '');
        params.set('tissue_style', data.get('tissueStyle') || '');
        params.set('ribbon_style', data.get('ribbonStyle') || '');
        params.set('ribbon_colour', data.get('ribbonColour') || '');
        params.set('logo_finish', data.get('logoFinish') || '');
        params.set('artwork_status', data.get('artworkStatus') || '');
        const selectedThankYouInsert =
            data.get("thankYouCard") || "";

        const selectedEnvelope =
            selectedThankYouInsert === "Thank-you note"
                ? data.get("envelopeStyle") || ""
                : "";

        params.set(
            "thank_you_card",
            selectedThankYouInsert
        );

        params.set(
            "envelope_style",
            selectedEnvelope
        );
        const quantitySummary = isBespoke
            ? [
                selectedBoxQuantity
                    ? `Boxes: ${selectedBoxQuantity}`
                    : '',
                selectedOtherQuantity
                    ? `Other pieces: ${selectedOtherQuantity}`
                    : ''
            ].filter(Boolean).join('; ')
            : selectedQuantity;

        params.set('quantity', quantitySummary);
        params.set('box_quantity', selectedBoxQuantity || '');
        params.set(
            'other_pieces_quantity',
            selectedOtherQuantity || ''
        );
        params.set(
            'box_length_cm',
            hasRigidBox ? (data.get('boxLength') || '') : ''
        );
        params.set(
            'box_breadth_cm',
            hasRigidBox ? (data.get('boxBreadth') || '') : ''
        );
        params.set(
            'box_height_cm',
            hasRigidBox ? (data.get('boxHeight') || '') : ''
        );
        params.set(
            'volumetric_weight_kg',
            calculatedWeight === null ? '' : calculatedWeight.toFixed(2)
        );
        params.set('primary_colour', data.get('primaryColour') || '');
        params.set('custom_colour', data.get('customColour') || '');
        params.set('secondary_colour', data.get('secondaryColour') || '');
        params.set('accent_colour', data.get('accentColour') || '');
        params.set('pantone_reference', data.get('pantoneReference') || '');
        params.set('comments', data.get('comments') || '');
        params.set('accessories', data.getAll('accessories').join(', '));
        params.set(
            'additional_projects',
            data.get('additionalProjects') || '[]'
        );

        localStorage.setItem(
            'luxsomeShopConfiguration',
            JSON.stringify(Object.fromEntries(params.entries()))
        );

        window.location.href = `/start-project/?${params.toString()}`;
    };

    form?.addEventListener('submit', event => {
        event.preventDefault();
        submitConfiguration();
    });

    document.getElementById('mobileBuyButton')?.addEventListener('click', submitConfiguration);


    /*
     * Inline pricing guide
     */
    const pricingModal = document.getElementById('pricingModal');
    const pricingOpenButtons = document.querySelectorAll('[data-pricing-open]');
    const pricingCloseButtons = document.querySelectorAll('[data-pricing-close]');
    let pricingModalTrigger = null;
    
    const getPricingFocusableElements = () => {
        if (!pricingModal) return [];
    
        return [...pricingModal.querySelectorAll(
            'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )];
    };
    
    const openPricingModal = event => {
        if (!pricingModal) return;
    
        pricingModalTrigger = event?.currentTarget || document.activeElement;
        pricingModal.hidden = false;
        document.body.classList.add('pricing-modal-open');
    
        const closeButton = pricingModal.querySelector('.pricing-modal__close');
        closeButton?.focus();
    };
    
    const closePricingModal = () => {
        if (!pricingModal || pricingModal.hidden) return;
    
        pricingModal.hidden = true;
        document.body.classList.remove('pricing-modal-open');
        pricingModalTrigger?.focus();
    };
    
    pricingOpenButtons.forEach(button => {
        button.addEventListener('click', openPricingModal);
    });
    
    pricingCloseButtons.forEach(button => {
        button.addEventListener('click', closePricingModal);
    });
    
    document.addEventListener('keydown', event => {
        if (!pricingModal || pricingModal.hidden) return;
    
        if (event.key === 'Escape') {
            closePricingModal();
            return;
        }
    
        if (event.key !== 'Tab') return;
    
        const focusable = getPricingFocusableElements();
        if (!focusable.length) return;
    
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
    
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });


    /*
     * Visual option preview
     *
     * Add exact Luxsome images using this path pattern:
     * /assets/images/catalogue-preview/<option-slug>.webp
     *
     * Exact option images can be added later without changing this logic.
     */
    const visualOptionGroups = {
        boxStyle: {
            label: 'Box styles',
            catalogue: 'https://assets.luxsomepackaging.com/catalogues/catalogue.pdf#page=5',
            fallback: ''
        },
        tagStyle: {
            label: 'Tag styles',
            catalogue: 'https://assets.luxsomepackaging.com/catalogues/catalogue.pdf#page=9',
            fallback: ''
        },
        thankYouCard: {
            label: 'Thank-you card styles',
            catalogue: 'https://assets.luxsomepackaging.com/catalogues/catalogue.pdf#page=10',
            fallback: ''
        },
        stickerStyle: {
            label: 'Sticker styles',
            catalogue: 'https://assets.luxsomepackaging.com/catalogues/catalogue.pdf#page=11',
            fallback: ''
        },
        tissueStyle: {
            label: 'Tissue styles',
            catalogue: 'https://assets.luxsomepackaging.com/catalogues/catalogue.pdf#page=12',
            fallback: ''
        },
        envelopeStyle: {
            label: 'Envelope styles',
            catalogue: 'https://assets.luxsomepackaging.com/catalogues/catalogue.pdf#page=12',
            fallback: ''
        },
        ribbonStyle: {
            label: 'Ribbon styles',
            catalogue: 'https://assets.luxsomepackaging.com/catalogues/catalogue.pdf#page=13',
            fallback: ''
        },
        logoFinish: {
            label: 'Finishing options',
            catalogue: 'https://assets.luxsomepackaging.com/catalogues/catalogue.pdf#page=13',
            fallback: ''
        },
        accessories: {
            label: 'Accessories',
            catalogue: 'https://assets.luxsomepackaging.com/catalogues/catalogue.pdf#page=17',
            fallback: ''
        },
        packagingPieces: {
            label: 'Packaging pieces',
            catalogue: 'https://assets.luxsomepackaging.com/catalogues/catalogue.pdf#page=4',
            fallback: ''
        },
        projectType: {
            label: 'Project types',
            catalogue: 'https://assets.luxsomepackaging.com/catalogues/catalogue.pdf',
            fallback: ''
        }
    };

    const visualOptionImageOverrides = {
        'Magnetic flap': '/assets/images/catalogue-preview/collapsible-magnetic-flap-box.webp',
        'Shoulder box': '/assets/images/catalogue-preview/shoulder-box.webp',
        'Tray-in-bed': '/assets/images/catalogue-preview/tray-in-bed-box.webp',
        'Door style': '/assets/images/catalogue-preview/door-style-box.webp',
        'Collapsible magnetic flap': '/assets/images/catalogue-preview/collapsible-magnetic-flap-box.webp',
        'Recommend a structure': '/assets/images/catalogue-preview/recommend-a-box-structure.webp',
        'Custom structure': '/assets/images/catalogue-preview/custom-box-structure.webp',

        'One-piece tag': '/assets/images/catalogue-preview/one-piece-tag.webp',
        'Two-piece tag': '/assets/images/catalogue-preview/two-piece-tag.webp',
        'Three-piece tag': '/assets/images/catalogue-preview/three-piece-tag.webp',

        'Folded Thank you card': '/assets/images/catalogue-preview/folded-thank-you-card.png',
        'Matte vinyl': '/assets/images/catalogue-preview/matte-vinyl.webp',
        'Metallic vinyl': '/assets/images/catalogue-preview/metallic-vinyl.webp',
        'Embossed': '/assets/images/catalogue-preview/embossed-finish.webp',
        'Debossed': '/assets/images/catalogue-preview/debossed-finish.webp',
        'Foiled': '/assets/images/catalogue-preview/foil-finish.webp',
        'UV printed': '/assets/images/catalogue-preview/uv-print.webp',

        'Ribbon handle': '/assets/images/catalogue-preview/ribbon-handle.webp',
        'Pull tab': '/assets/images/catalogue-preview/pull-tab.webp',
        'Product description card': '/assets/images/catalogue-preview/product-description-card.webp',
        'Insert': '/assets/images/catalogue-preview/box-insert.webp',
        'Custom insert': '/assets/images/catalogue-preview/custom-box-insert.webp',
        'Foam insert': '/assets/images/catalogue-preview/foam-insert.webp',
        'Card insert': '/assets/images/catalogue-preview/card-insert.webp',
        'Fabric lining': '/assets/images/catalogue-preview/fabric-lining.webp',
        'Window cut-out': '/assets/images/catalogue-preview/window-cut-out.webp',
        'Special closure': '/assets/images/catalogue-preview/special-closure.webp',
        'Compartment divider': '/assets/images/catalogue-preview/compartment-divider.webp'
    };

    const slugifyVisualOption = value => (
        String(value || '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
    );

    const visualModalMarkup = `
        <div class="option-visual-modal" id="optionVisualModal" hidden>
            <div class="option-visual-modal__backdrop" data-option-visual-close></div>

            <section
                class="option-visual-modal__dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="optionVisualTitle"
            >
                <button
                    type="button"
                    class="option-visual-modal__close"
                    data-option-visual-close
                    aria-label="Close option preview"
                >
                    &times;
                </button>

                <div class="option-visual-modal__media">
                    <img id="optionVisualImage" src="" alt="">
                    <div class="option-visual-modal__shade"></div>

                    <div class="option-visual-modal__label">
                        <span id="optionVisualCategory"></span>
                        <h2 id="optionVisualTitle"></h2>
                    </div>
                </div>

                <div class="option-visual-modal__actions">
                    <button
                        type="button"
                        class="option-visual-modal__keep"
                        data-option-visual-close
                    >
                        Keep this choice
                    </button>

                    <a
                        class="option-visual-modal__catalogue"
                        id="optionVisualCatalogue"
                        href="/assets/pdf/product-catalogue.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        View in catalogue
                    </a>
                </div>
            </section>
        </div>
    `;

    if (!document.getElementById('optionVisualModal')) {
        document.body.insertAdjacentHTML('beforeend', visualModalMarkup);
    }

    const optionVisualModal = document.getElementById('optionVisualModal');
    const optionVisualImage = document.getElementById('optionVisualImage');
    const optionVisualTitle = document.getElementById('optionVisualTitle');
    const optionVisualCategory = document.getElementById('optionVisualCategory');
    const optionVisualCatalogue = document.getElementById('optionVisualCatalogue');

    let optionVisualTrigger = null;
    let optionVisualFallback = '';

    const closeOptionVisual = () => {
        if (!optionVisualModal || optionVisualModal.hidden) return;

        optionVisualModal.hidden = true;
        document.body.classList.remove('option-visual-open');
        optionVisualTrigger?.focus();
    };

    const openOptionVisual = input => {
        const group = visualOptionGroups[input.name];
        if (!group || !input.value || !optionVisualModal) return;

        optionVisualTrigger = input.closest('label') || input;
        optionVisualFallback = group.fallback;

        optionVisualTitle.textContent = input.value;
        optionVisualCategory.textContent = group.label;
        optionVisualCatalogue.href = group.catalogue;

        const exactImage = visualOptionImageOverrides[input.value];
        const generatedPath = `/assets/images/catalogue-preview/${slugifyVisualOption(input.value)}.webp`;

        optionVisualImage.dataset.fallbackApplied = 'false';
        optionVisualImage.src = exactImage || generatedPath;
        optionVisualImage.alt = `${input.value} visual example`;

        optionVisualModal.hidden = false;
        document.body.classList.add('option-visual-open');

        optionVisualModal
            .querySelector('.option-visual-modal__close')
            ?.focus();
    };

    optionVisualImage?.addEventListener('error', () => {
        if (
            optionVisualImage.dataset.fallbackApplied === 'true' ||
            !optionVisualFallback
        ) {
            return;
        }

        optionVisualImage.dataset.fallbackApplied = 'true';
        optionVisualImage.src = optionVisualFallback;
    });


    document
        .querySelectorAll('[data-option-visual-close]')
        .forEach(button => {
            button.addEventListener('click', closeOptionVisual);
        });


    /*
     * Robust View Larger handler.
     * Uses event delegation so it still works when the gallery button or
     * gallery slides are generated dynamically.
     */
    document.addEventListener('click', event => {
        const expandButton = event.target.closest(
            '#productGalleryExpand, .product-gallery__expand'
        );

        if (!expandButton) return;

        event.preventDefault();
        event.stopPropagation();

        const gallery = expandButton.closest('[data-synchronised-gallery]') ||
            document.querySelector('[data-synchronised-gallery]');

        const activeSlide = gallery?.querySelector(
            '.product-gallery__slide.is-active'
        );

        const activeImage = activeSlide?.querySelector('img');
        const activeTitle = document.getElementById(
            'productGalleryTitle'
        )?.textContent?.trim();
        const activeCategory = document.getElementById(
            'productGalleryCategory'
        )?.textContent?.trim();
        const catalogueLink = document.getElementById(
            'productGalleryCatalogue'
        );

        if (
            !optionVisualModal ||
            !optionVisualImage ||
            !optionVisualTitle ||
            !optionVisualCategory ||
            !optionVisualCatalogue ||
            !activeImage
        ) {
            return;
        }

        optionVisualTrigger = expandButton;
        optionVisualFallback = '';

        optionVisualImage.dataset.fallbackApplied = 'false';
        optionVisualImage.src = activeImage.currentSrc || activeImage.src;
        optionVisualImage.alt = activeImage.alt || (
            `${activeTitle || 'Packaging option'} visual preview`
        );

        optionVisualTitle.textContent =
            activeTitle || activeImage.alt || 'Packaging option';

        optionVisualCategory.textContent =
            activeCategory || 'Packaging option';

        optionVisualCatalogue.href =
            catalogueLink?.href ||
            '/assets/pdf/product-catalogue.pdf';

        optionVisualModal.hidden = false;
        document.body.classList.add('option-visual-open');

        window.requestAnimationFrame(() => {
            optionVisualModal
                .querySelector('.option-visual-modal__close')
                ?.focus();
        });
    });

    document.addEventListener('keydown', event => {
        if (!optionVisualModal || optionVisualModal.hidden) return;

        if (event.key === 'Escape') {
            closeOptionVisual();
        }
    });

    /*
     * Add a compact catalogue button to each applicable configuration group.
     */
    // Object.entries(visualOptionGroups).forEach(([inputName, group]) => {
    //     const inputs = [
    //         ...document.querySelectorAll(`input[name="${inputName}"]`)
    //     ];

    //     if (!inputs.length) return;

    //     const fieldset = inputs[0].closest('fieldset');
    //     if (!fieldset || fieldset.querySelector('.configuration-catalogue-link')) {
    //         return;
    //     }

    //     const link = document.createElement('a');
    //     link.className = 'configuration-catalogue-link';
    //     link.href = group.catalogue;
    //     link.target = '_blank';
    //     link.rel = 'noopener noreferrer';
    //     link.innerHTML = `
    //         <span>View ${group.label.toLowerCase()} in catalogue</span>
    //         <span aria-hidden="true">&rarr;</span>
    //     `;

    //     fieldset.appendChild(link);
    // });


    /*
     * Synchronised visual configurator
     */
    const synchronisedGallery = document.querySelector(
        '[data-synchronised-gallery]'
    );

    if (synchronisedGallery) {
        const slidesContainer = document.getElementById('productGallerySlides');
        const thumbsContainer = document.getElementById('productGalleryThumbs');
        const galleryCategory = document.getElementById('productGalleryCategory');
        const galleryTitle = document.getElementById('productGalleryTitle');
        const galleryCatalogue = document.getElementById('productGalleryCatalogue');
        const galleryExpand = document.getElementById('productGalleryExpand');

        const visualInputSelector = Object.keys(visualOptionGroups)
            .map(name => `input[name="${name}"]`)
            .join(', ');

        /*
        * Include conditional inputs even when they begin disabled.
        *
        * Examples:
        * - Envelope styles
        * - Ribbon colours
        *
        * Their listeners must exist before another selection
        * enables them.
        */
        const visualInputs = [
            ...document.querySelectorAll(visualInputSelector)
        ];

        const previewStates = new Map();
        const previewHistory = [];

        const getPreviewKey = input => (
            `${input.name}-${slugifyVisualOption(input.value)}`
        );

        const getPreviewImage = input => (
            visualOptionImageOverrides[input.value] ||
            `/assets/images/catalogue-preview/${slugifyVisualOption(input.value)}.webp`
        );

        const getGroup = input => (
            visualOptionGroups[input.name] || {
                label: 'Packaging option',
                catalogue: '/assets/pdf/product-catalogue.pdf'
            }
        );

        const createPreview = input => {
            const key = getPreviewKey(input);

            if (previewStates.has(key)) {
                return previewStates.get(key);
            }

            const group = getGroup(input);
            const imagePath = getPreviewImage(input);

            const slide = document.createElement('figure');
            slide.className = 'product-gallery__slide';
            slide.dataset.previewKey = key;

            const image = document.createElement('img');
            image.src = imagePath;
            image.alt = `${input.value} visual preview`;
            image.decoding = 'async';

            slide.appendChild(image);
            slidesContainer.appendChild(slide);

            const thumbnail = document.createElement('button');
            thumbnail.type = 'button';
            thumbnail.className = 'product-thumb';
            thumbnail.dataset.previewKey = key;
            thumbnail.setAttribute('aria-label', `Show ${input.value}`);
            thumbnail.innerHTML = `
                <img src="${imagePath}" alt="" loading="lazy">
            `;

            thumbnail.addEventListener('click', () => {
                if (!input.checked) {
                    input.checked = true;
                    input.dispatchEvent(
                        new Event('change', { bubbles: true })
                    );
                } else {
                    showPreview(input);
                }
            });

            thumbsContainer.appendChild(thumbnail);

            const state = {
                input,
                group,
                slide,
                image,
                thumbnail
            };

            previewStates.set(key, state);
            return state;
        };

        const setCurrentPreview = state => {
            const activeSlide = slidesContainer.querySelector(
                '.product-gallery__slide.is-active'
            );

            if (activeSlide && activeSlide !== state.slide) {
                activeSlide.classList.remove('is-active');
                activeSlide.classList.add('is-leaving');

                window.setTimeout(() => {
                    activeSlide.classList.remove('is-leaving');
                }, 420);
            }

            slidesContainer
                .querySelectorAll('.product-gallery__slide')
                .forEach(slide => {
                    if (slide !== state.slide) {
                        slide.classList.remove('is-active');
                    }
                });

            state.slide.classList.add('is-active');

            thumbsContainer
                .querySelectorAll('.product-thumb')
                .forEach(thumbnail => {
                    thumbnail.classList.toggle(
                        'is-active',
                        thumbnail === state.thumbnail
                    );
                });

            /*
             * Never use Element.scrollIntoView() here.
             * Even with block: "nearest", browsers may move the entire
             * document vertically because the thumbnail is inside a sticky
             * gallery near the top of the page.
             *
             * Scroll only the horizontal thumbnail container. This preserves
             * the customer's exact vertical reading position on desktop,
             * tablet and mobile.
             */
            const thumbnailLeft =
                state.thumbnail.offsetLeft -
                (
                    thumbsContainer.clientWidth -
                    state.thumbnail.offsetWidth
                ) / 2;

            thumbsContainer.scrollTo({
                left: Math.max(0, thumbnailLeft),
                behavior: window.matchMedia(
                    '(prefers-reduced-motion: reduce)'
                ).matches
                    ? 'auto'
                    : 'smooth'
            });

            galleryCategory.textContent = state.group.label;
            galleryTitle.textContent = state.input.value;
            galleryCatalogue.href = state.group.catalogue;

            galleryExpand.dataset.inputName = state.input.name;
            galleryExpand.dataset.inputValue = state.input.value;
        };

        function showPreview(input) {
            if (!input || input.disabled) return;

            const state = createPreview(input);
            setCurrentPreview(state);

            const previousIndex = previewHistory.indexOf(input);

            if (previousIndex !== -1) {
                previewHistory.splice(previousIndex, 1);
            }

            previewHistory.push(input);
        }

        visualInputs.forEach(input => {
            createPreview(input);

            input.addEventListener('click', () => {
                if (input.type === 'checkbox' && !input.checked) {
                    const historyIndex = previewHistory.indexOf(input);

                    if (historyIndex !== -1) {
                        previewHistory.splice(historyIndex, 1);
                    }

                    const previousInput = [...previewHistory]
                        .reverse()
                        .find(item => (
                            item.type !== 'checkbox' || item.checked
                        ));

                    if (previousInput) {
                        showPreview(previousInput);
                    }

                    return;
                }

                showPreview(input);
            });

            input.addEventListener('change', () => {
                if (input.type === 'checkbox' && !input.checked) return;
                showPreview(input);
            });
        });

        const initiallySelected = (
            visualInputs.find(input => (
                input.name === 'boxStyle' && input.checked
            )) ||
            visualInputs.find(input => input.checked)
        );

        if (initiallySelected) {
            showPreview(initiallySelected);
        }

        

        const preloadImages = () => {
            previewStates.forEach(state => {
                const image = new Image();
                image.src = state.image.src;
            });
        };

        if ('requestIdleCallback' in window) {
            window.requestIdleCallback(preloadImages);
        } else {
            window.setTimeout(preloadImages, 800);
        }
    }


    document.querySelectorAll(
        '#productGalleryExpand, .product-gallery__expand'
    ).forEach(button => {
        button.setAttribute('type', 'button');
    });


    /*
     * Re-run state-dependent controls after every listener has been
     * attached. The values themselves were restored at the top.
     */
    if (
        document.getElementById('productConfigForm')
            ?.dataset.configurationRestored === 'true'
    ) {
        window.requestAnimationFrame(() => {
            document
                .querySelectorAll(
                    '#productConfigForm input:checked'
                )
                .forEach(input => {
                    input.dispatchEvent(
                        new Event('change', { bubbles: true })
                    );
                });

            [
                'quantity',
                'boxQuantity',
                'otherPiecesQuantity',
                'boxLength',
                'boxBreadth',
                'boxHeight',
                'customColour',
                'secondaryColour',
                'accentColour',
                'pantoneReference',
                'comments'
            ].forEach(id => {
                const input = document.getElementById(id);
                if (!input) return;

                input.dispatchEvent(
                    new Event('input', { bubbles: true })
                );
            });
        });
    }

});
