(function initialiseLuxsomeEnvironment() {
    const hostname = window.location.hostname;

    const environments = {
        "develop.luxsomepackaging.com": {
            name: "develop",
            label: "DEVELOP",
            apiBase: "https://api-develop.luxsomepackaging.com",
            isProduction: false,
            debug: true
        },

        "staging.luxsomepackaging.com": {
            name: "staging",
            label: "STAGING",
            apiBase: "https://api-staging.luxsomepackaging.com",
            isProduction: false,
            debug: true
        },

        "luxsomepackaging.com": {
            name: "production",
            label: "PRODUCTION",
            apiBase: "https://api.luxsomepackaging.com",
            isProduction: true,
            debug: false
        },

        "www.luxsomepackaging.com": {
            name: "production",
            label: "PRODUCTION",
            apiBase: "https://api.luxsomepackaging.com",
            isProduction: true,
            debug: false
        },

        "localhost": {
            name: "local",
            label: "LOCAL",
            apiBase: "http://127.0.0.1:8787",
            isProduction: false,
            debug: true
        },

        "127.0.0.1": {
            name: "local",
            label: "LOCAL",
            apiBase: "http://127.0.0.1:8787",
            isProduction: false,
            debug: true
        }
    };

    const fallback = environments["develop.luxsomepackaging.com"];

    window.LUXSOME = Object.freeze(
        environments[hostname] || fallback
    );

    if (window.LUXSOME.debug) {
        console.info(
            `[Luxsome] Environment: ${window.LUXSOME.name}`,
            window.LUXSOME
        );

        function addEnvironmentBadge() {
            if (window.LUXSOME.isProduction) return;
        
            const badge = document.createElement("div");
        
            badge.className = "environment-badge";
            badge.textContent = window.LUXSOME.label;
            badge.setAttribute(
                "aria-label",
                `${window.LUXSOME.label} environment`
            );
        
            document.body.appendChild(badge);
        }
        
        if (document.readyState === "loading") {
            document.addEventListener(
                "DOMContentLoaded",
                addEnvironmentBadge
            );
        } else {
            addEnvironmentBadge();
        }
    }
})();