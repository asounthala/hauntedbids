/* ---------------------------- Live Countdown---------------------------- */
document.addEventListener('DOMContentLoaded', function () {
    function updateAuctionTimes() {
        const auctionRows = document.querySelectorAll('.auction-end-time');

        auctionRows.forEach(row => {
            const endDateStr = row.getAttribute('data-end-date'); // Get the end date from the data attribute

            // Check to see if the end date exist
            if (!endDateStr) {
                row.textContent = "No End Date Provided";
                return;
            }

            // Parse the end date
            const endDate = new Date(endDateStr);
            const now = new Date(); // Current time
            const timeDiff = endDate - now; // Difference in milliseconds

            if (timeDiff <= 0) {
                row.textContent = "Auction Ended";
            } else {
                const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

                row.textContent = `${days}d, ${hours}h, ${minutes}m, ${seconds}s`;
            }
        });
    }

    // Update countdown every second
    setInterval(updateAuctionTimes, 1000);

    updateAuctionTimes();
});

/* ---------------------------- Hover Preview ---------------------------- */
document.addEventListener("DOMContentLoaded", function () {
    const tableRows = document.querySelectorAll(".auction-table tbody tr");
    const previewArea = document.getElementById("preview");

    tableRows.forEach(row => {
        row.addEventListener("mouseover", function () {
            const imageUrl = row.getAttribute("data-image");
            const description = row.getAttribute("data-description");

            previewArea.innerHTML = `
                <div class="preview-card">
                    <img src="${imageUrl}" alt="Auction Preview" class="preview-image" />
                    <p class="preview-description">${description}</p>
                </div>
            `;
        });
        
        row.addEventListener("mouseleave", function () {
            previewArea.innerHTML = ""; // Clear the preview
        });
    });
});

/* ---------------------------- Delete Listing ---------------------------- */
document.addEventListener('DOMContentLoaded', function () {
    const tableRows = document.querySelectorAll(".auction-table tbody tr");

    tableRows.forEach(row => {
        const listingId = row.getAttribute("data-listing-id");

        // Create a delete button
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "-";
        deleteButton.classList.add("delete-button");


        // Add click event to delete the listing
        deleteButton.addEventListener("click", function (event) {
            event.stopPropagation(); 
            if (confirm("Are you sure you want to delete this listing?")) {
                deleteListing(listingId, row);
            }
        });

        // Append the delete button to the row
        const cell = document.createElement("td");
        cell.appendChild(deleteButton);
        row.appendChild(cell);
    });
});

function deleteListing(listingId, row) {
    fetch("/api/delete_listing", {
        method: "DELETE",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ listing_id: parseInt(listingId, 10) }), // Ensure listing_id is a number
    })
        .then((response) => {
            if (response.ok) {
                alert("Listing deleted successfully.");
                row.remove(); 
            } else if (response.status === 404) {
                alert("Listing not found.");
            } else if (response.status === 400) {
                alert("Invalid request. Please try again.");
            } else if (response.status === 429) {
                alert("Rate limit exceeded. Please wait and try again.");
            } else {
                throw new Error("Unexpected response.");
            }
        })
        .catch((error) => {
            console.error("Error deleting listing:", error);
            alert("An error occurred. Please try again.");
        });
}
