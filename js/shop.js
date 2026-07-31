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

    const tierThreeColourSelection = document.getElementById('tierThreeColourSelection');
    const tierThreeCustomColourField = document.getElementById('tierThreeCustomColourField');
    const tierThreeCustomColour = document.getElementById('tierThreeCustomColour');

    const toggleTierThreeCustomColour = () => {
        if (!tierThreeColourSelection || !tierThreeCustomColourField || !tierThreeCustomColour) return;

        const isCustom = tierThreeColourSelection.value === 'Custom';
        tierThreeCustomColourField.hidden = !isCustom;
        tierThreeCustomColour.required = isCustom;

        if (!isCustom) tierThreeCustomColour.value = '';
    };

    tierThreeColourSelection?.addEventListener('change', toggleTierThreeCustomColour);
    toggleTierThreeCustomColour();

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
});
