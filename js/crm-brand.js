document.addEventListener("DOMContentLoaded", () => {

    document.querySelectorAll("[data-luxsome-crm-logo]")
        .forEach((container) => {

            container.innerHTML = `
                <a href="/admin/" class="crm-brand crm-brand--light">
                    <img
                        src="/assets/images/luxsome-logo-white.png"
                        alt="Luxsome Packaging"
                        class="crm-brand__logo"
                    >
                </a>
            `;

        });

});