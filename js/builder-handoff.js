/* =========================================================
   LUXSOME PACKAGING BUILDER → Guide Me HANDOFF
   Load this file on the Packaging Builder page.
========================================================= */

(() => {
    "use strict";

    const STORAGE_KEY = "luxsomePackagingBuilderResult";
    const ANSWERS_KEY = "luxsomePackagingBuilderAnswers";
    const START_PROJECT_URL = "/packaging-builder/?source=builder";

    function cleanText(value) {
        return typeof value === "string" ? value.trim() : "";
    }

    function normaliseComponents(items) {
        if (!Array.isArray(items)) return [];

        return items
            .map(item => {
                if (typeof item === "string") return item.trim();
                return cleanText(item?.name || item?.label || item?.title);
            })
            .filter(Boolean);
    }

    function buildPayload(result = {}, answers = {}) {
        const recommendation = result.recommendationDetails || result.recommendation || result;

        const title = cleanText(
            recommendation.title ||
            result.title ||
            result.tier ||
            (typeof result.recommendation === "string" ? result.recommendation : "")
        );

        if (!title) {
            throw new Error("A recommendation title is required before continuing.");
        }

        return {
            version: 1,
            builderId: `luxsome-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            savedAt: new Date().toISOString(),
            source: "Packaging Builder",
            recommendationDetails: {
                title,
                description: cleanText(
                    recommendation.description ||
                    recommendation.reason ||
                    result.description ||
                    result.summary
                ),
                components: normaliseComponents(
                    recommendation.components ||
                    recommendation.pieces ||
                    result.components ||
                    result.pieces
                )
            },
            answers: answers && typeof answers === "object" ? answers : {}
        };
    }

    function save(result, answers = {}) {
        const payload = buildPayload(result, answers);

        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        localStorage.setItem(ANSWERS_KEY, JSON.stringify(payload.answers));

        return payload;
    }

    function continueToProject(result, answers = {}) {
        const payload = save(result, answers);
        const url = new URL(START_PROJECT_URL, window.location.origin);
        url.searchParams.set("tier", payload.recommendationDetails.title);
        window.location.assign(url.toString());
    }

    function clear() {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(ANSWERS_KEY);
    }

    window.LuxsomeBuilderHandoff = {
        save,
        continueToProject,
        clear
    };
})();
