document.addEventListener("DOMContentLoaded", () => {
    const logoContainers = document.querySelectorAll(
        "[data-luxsome-crm-logo]"
    );

    logoContainers.forEach((container) => {
        container.innerHTML = `
            <a
                href="/admin/"
                class="crm-logo"
                aria-label="Luxsome CRM dashboard"
            >
                <img
                    src="/assets/images/luxsome-logo-white.png"
                    alt="Luxsome Packaging"
                >
            </a>
        `;
    });
});