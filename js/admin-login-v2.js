document.addEventListener("DOMContentLoaded", function () {
    const API_BASE = "https://api.luxsomepackaging.com";

    const form = document.getElementById("adminLoginForm");
    const tokenInput = document.getElementById("adminToken");
    const toggleButton = document.getElementById("toggleTokenVisibility");
    const loginButton = document.getElementById("loginButton");
    const buttonText = loginButton.querySelector(".crm-button__text");
    const status = document.getElementById("loginStatus");

    const existingToken = sessionStorage.getItem("luxsomeAdminToken");

    if (existingToken) {
        window.location.replace("/admin/");
        return;
    }

    toggleButton.addEventListener("click", function () {
        const shouldShow = tokenInput.type === "password";

        tokenInput.type = shouldShow ? "text" : "password";
        toggleButton.textContent = shouldShow ? "Hide" : "Show";
        toggleButton.setAttribute(
            "aria-label",
            shouldShow
                ? "Hide administrator token"
                : "Show administrator token"
        );
    });

    form.addEventListener("submit", async function (event) {
        event.preventDefault();

        const token = tokenInput.value.trim();

        if (!token) {
            status.textContent = "Enter your administrator token.";
            tokenInput.focus();
            return;
        }

        setLoading(true);
        status.textContent = "";

        try {
            const response = await fetch(`${API_BASE}/admin/stats`, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${token}`
                }
            });

            const data = await response.json().catch(function () {
                return {};
            });

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "The administrator token was not accepted."
                );
            }

            sessionStorage.setItem("luxsomeAdminToken", token);
            window.location.replace("/admin/");
        } catch (error) {
            status.textContent =
                error.message ||
                "The dashboard could not be opened. Please try again.";

            tokenInput.select();
            setLoading(false);
        }
    });

    function setLoading(isLoading) {
        loginButton.disabled = isLoading;
        loginButton.classList.toggle("is-loading", isLoading);
        buttonText.textContent = isLoading
            ? "Checking Access"
            : "Open Dashboard";
    }
});
