// A simple script to automatically update the year in the footer.

document.addEventListener('DOMContentLoaded', function() {
    // Find the element with the ID 'current-year'
    const yearSpan = document.getElementById('current-year');
    
    // Get the current year
    const currentYear = new Date().getFullYear();
    
    // Set the text of the span to the current year
    if (yearSpan) {
        yearSpan.textContent = currentYear;
    }

    console.log("Portfolio site loaded successfully!");
});
