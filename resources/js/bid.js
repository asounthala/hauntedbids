document.addEventListener("DOMContentLoaded", () => {
    const bidButton = document.querySelector(".auction-status-btn");
    const bidForm = document.getElementById("bid-form");

    // cookie 
    const bidderName = getCookie('bidder_name');
    if (bidderName) {
        // populate the bidder_name field if the cookie exists
        document.querySelector('input[name="bidder_name"]').value = bidderName;
    }

    // function to get the value of a cookie by name
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    // Event listener for the bid button
    bidButton.addEventListener("click", () => {
        if (bidForm.style.display === "none" || !bidForm.style.display) {
            bidForm.style.display = "block";
            bidButton.textContent = "Cancel Bid";
        } else {
            bidForm.style.display = "none";
            bidButton.textContent = "Place Bid";
        }
    });

    // Bid form submission handler
    bidForm.addEventListener("submit", (event) => {
        event.preventDefault(); // Prevent form submission
        const listingId = bidForm.querySelector('input[name="listing_id"]').value;
        const bidderName = bidForm.querySelector('input[name="bidder_name"]').value;
        const bidAmount = parseFloat(bidForm.querySelector('input[name="bid_amount"]').value);
        const comment = bidForm.querySelector('textarea[name="comment"]').value;

        // Create bid data object
        const bidData = {
            listing_id: parseInt(listingId, 10),
            bidder_name: bidderName,
            bid_amount: bidAmount,
            comment: comment || null,
        };

        // Post bid data to the server
        fetch("/api/place_bid", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(bidData),
        })
            .then((response) => {
                if (response.status === 201) {
                    return response.json().then((updatedBids) => {
                        updateBidList(updatedBids); // Update the displayed bids
                        resetBidForm(bidButton, bidForm);
                    });
                } else if (response.status === 409) {
                    return response.json().then((errorData) => {
                        alert(errorData.error || "Your bid is too low.");
                    });
                } else {
                    throw new Error("Failed to place bid. Please try again.");
                }
            })
            .catch((error) => {
                alert("An error occurred: " + error.message);
            });
    });

    // Function to reset the bid form
    function resetBidForm(button, form) {
        form.reset();
        form.style.display = "none";
        button.textContent = "Place Bid";
        const bidderName = getCookie('bidder_name');
        if(bidderName) {
            // Populate the bidder_name field if the cookie exists
            document.querySelector('input[name="bidder_name"]').value = bidderName;
        }
    }

    // Function to update the displayed list of bids
    function updateBidList(bids) {
        const bidsContainer = document.querySelector(".bids-section");
        const bidCards = document.querySelectorAll(".bids-section .bid-card");
        for (let bid of bidCards){
            bidsContainer.removeChild(bid)
        }

        bids.forEach((bid) => {
            const bidElement = document.createElement("div");
            bidElement.className = "bid-card";
            bidElement.innerHTML = `
                <p class="bidder-name"> ${bid.bidder_name}</p>
                <p class="bid-amount">$${parseFloat(bid.bid_amount).toFixed(2)}</p>
                <p class="bid-comment">${bid.comment || ""}</p>
            `;
            bidsContainer.appendChild(bidElement);
        });
    }
});
