/* Add this where your Packaging Builder creates its final recommendation. */

const builderResult = {
    title: recommendation.title,
    description: recommendation.description,
    components: recommendation.components
};

const builderAnswers = {
    productType: answers.productCategory,
    quantity: answers.orderQuantity,
    investmentLevel: answers.investmentLevel,
    desiredExperience: answers.customerExperience,
    timeline: answers.timeline
};

const startProjectButton = document.getElementById("startRecommendedProject");

startProjectButton.addEventListener("click", () => {
    window.LuxsomeBuilderHandoff.continueToProject(
        builderResult,
        builderAnswers
    );
});
