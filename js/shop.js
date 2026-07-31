document.addEventListener('DOMContentLoaded', () => {
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

    const getSelectedQuantity = () => {
        if (!quantityInput) return '';

        const quantity = Number(quantityInput.value);

        if (!Number.isInteger(quantity) || quantity < 25 || quantity % 25 !== 0) {
            quantityInput.setCustomValidity('Enter at least 25 pieces in multiples of 25.');
            quantityInput.reportValidity();
            return null;
        }

        quantityInput.setCustomValidity('');
        return String(quantity);
    };

    quantityInput?.addEventListener('input', () => {
        quantityInput.setCustomValidity('');
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

        const selectedQuantity = getSelectedQuantity();
        if (selectedQuantity === null) return;

        const calculatedWeight = calculateVolumetricWeight();

        if (calculatedWeight === null) {
            lengthInput?.setCustomValidity('Enter the finished box dimensions.');
            lengthInput?.reportValidity();
            return;
        }

        lengthInput?.setCustomValidity('');

        const data = new FormData(form);
        const params = new URLSearchParams();

        params.set('source', 'shop');
        params.set('product', product.dataset.product || '');
        params.set('system', product.dataset.productName || '');
        params.set('project_type', data.get('projectType') || '');
        params.set('packaging_pieces', data.getAll('packagingPieces').join(', '));
        params.set('box_style', data.get('boxStyle') || '');
        params.set('tag_style', data.get('tagStyle') || '');
        params.set('thank_you_card', data.get('thankYouCard') || '');
        params.set('sticker_style', data.get('stickerStyle') || '');
        params.set('tissue_style', data.get('tissueStyle') || '');
        params.set('envelope_style', data.get('envelopeStyle') || '');
        params.set('ribbon_style', data.get('ribbonStyle') || '');
        params.set('logo_finish', data.get('logoFinish') || '');
        params.set('quantity', selectedQuantity);
        params.set('box_length_cm', data.get('boxLength') || '');
        params.set('box_breadth_cm', data.get('boxBreadth') || '');
        params.set('box_height_cm', data.get('boxHeight') || '');
        params.set('volumetric_weight_kg', calculatedWeight.toFixed(2));
        params.set('primary_colour', data.get('primaryColour') || '');
        params.set('custom_colour', data.get('customColour') || '');
        params.set('secondary_colour', data.get('secondaryColour') || '');
        params.set('accent_colour', data.get('accentColour') || '');
        params.set('pantone_reference', data.get('pantoneReference') || '');
        params.set('comments', data.get('comments') || '');
        params.set('accessories', data.getAll('accessories').join(', '));

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
            catalogue: '/assets/pdf/catalogues/PRODUCT-CATALOGUE.pdf#page=5',
            fallback: ''
        },
        tagStyle: {
            label: 'Tag styles',
            catalogue: '/assets/pdf/catalogues/PRODUCT-CATALOGUE.pdf#page=9',
            fallback: ''
        },
        thankYouCard: {
            label: 'Thank-you card styles',
            catalogue: '/assets/pdf/catalogues/PRODUCT-CATALOGUE.pdf#page=10',
            fallback: ''
        },
        stickerStyle: {
            label: 'Sticker styles',
            catalogue: '/assets/pdf/catalogues/PRODUCT-CATALOGUE.pdf#page=11',
            fallback: ''
        },
        tissueStyle: {
            label: 'Tissue styles',
            catalogue: '/assets/pdf/catalogues/PRODUCT-CATALOGUE.pdf#page=12',
            fallback: ''
        },
        envelopeStyle: {
            label: 'Envelope styles',
            catalogue: '/assets/pdf/catalogues/PRODUCT-CATALOGUE.pdf#page=12',
            fallback: ''
        },
        ribbonStyle: {
            label: 'Ribbon styles',
            catalogue: '/assets/pdf/catalogues/PRODUCT-CATALOGUE.pdf#page=13',
            fallback: ''
        },
        logoFinish: {
            label: 'Finishing options',
            catalogue: '/assets/pdf/catalogues/PRODUCT-CATALOGUE.pdf#page=13',
            fallback: ''
        },
        accessories: {
            label: 'Accessories',
            catalogue: '/assets/pdf/catalogues/PRODUCT-CATALOGUE.pdf#page=17',
            fallback: ''
        },
        packagingPieces: {
            label: 'Packaging pieces',
            catalogue: '/assets/pdf/catalogues/PRODUCT-CATALOGUE.pdf#page=4',
            fallback: ''
        },
        projectType: {
            label: 'Project types',
            catalogue: '/assets/pdf/catalogues/PRODUCT-CATALOGUE.pdf',
            fallback: ''
        }
    };

    const visualOptionImageOverrides = {
        'Magnetic flap': '/assets/images/catalogue-preview/magnetic-flap-box.webp',
        'Shoulder box': '/assets/images/catalogue-preview/shoulder-box.webp',
        'Tray-in-bed': '/assets/images/catalogue-preview/tray-in-bed-box.webp',
        'Door style': '/assets/images/catalogue-preview/door-style-box.webp',
        'Collapsible magnetic flap': '/assets/images/catalogue-preview/collapsible-magnetic-flap-box.webp',
        'Recommend a structure': '/assets/images/catalogue-preview/recommend-a-box-structure.webp',
        'Custom structure': '/assets/images/catalogue-preview/custom-box-structure.webp',

        'One-piece tag': '/assets/images/catalogue-preview/one-piece-tag.webp',
        'Two-piece tag': '/assets/images/catalogue-preview/two-piece-tag.webp',
        'Three-piece tag': '/assets/images/catalogue-preview/three-piece-tag.webp',

        'Standard print': '/assets/images/catalogue-preview/standard-print.webp',
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
                        href="/assets/pdf/catalogues/PRODUCT-CATALOGUE.pdf"
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
            '/assets/pdf/catalogues/PRODUCT-CATALOGUE.pdf';

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
    Object.entries(visualOptionGroups).forEach(([inputName, group]) => {
        const inputs = [
            ...document.querySelectorAll(`input[name="${inputName}"]`)
        ];

        if (!inputs.length) return;

        const fieldset = inputs[0].closest('fieldset');
        if (!fieldset || fieldset.querySelector('.configuration-catalogue-link')) {
            return;
        }

        const link = document.createElement('a');
        link.className = 'configuration-catalogue-link';
        link.href = group.catalogue;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.innerHTML = `
            <span>View ${group.label.toLowerCase()} in catalogue</span>
            <span aria-hidden="true">&rarr;</span>
        `;

        fieldset.appendChild(link);
    });


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

        const visualInputs = [
            ...document.querySelectorAll(visualInputSelector)
        ].filter(input => !input.disabled);

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
                catalogue: '/assets/pdf/catalogues/PRODUCT-CATALOGUE.pdf'
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

            state.thumbnail.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
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

});
