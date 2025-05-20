document.addEventListener("DOMContentLoaded", () => {
    const categorySelect = document.getElementById("category");
    const otherCategoryGroup = document.getElementById("other-category-group");
    const otherCategoryInput = document.getElementById("other-category");

    // Event listener for dropdown selection
    categorySelect.addEventListener("change", () => {
        if (categorySelect.value === "Other") {
            // Show the "Other" input field
            otherCategoryGroup.style.display = "block";
            otherCategoryInput.required = true; // Make it required
            otherCategoryInput.focus(); // Auto-focus for better UX
        } else {
            // Hide the "Other" input field
            otherCategoryGroup.style.display = "none";
            otherCategoryInput.required = false; // Remove required attribute
            otherCategoryInput.value = ""; // Clear the input field
        }
    });
});
