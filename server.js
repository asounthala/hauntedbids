const express = require('express');     // Import the Express module
const app = express();                  // Create an instance of an Express application
const port = 4131;                      // Port for our class


/* ---------------------------- SET-UP ---------------------------- */
// const listings = require("./resources/js/listings.js");
const sql = require('./data');

// Set Pug as the view engine
app.set("view engine", "pug");
app.set("views", "templates");

// Middleware for static files (CSS, JS, Images)
app.use("/css", express.static("resources/css"));
app.use("/images", express.static("resources/images"));
app.use("/js", express.static("resources/js"))

// Middlware to parse URL-encoded data
app.use(express.urlencoded({ extended: true }));

// Middleware to parse body JSON
app.use(express.json());

// Middleware to parse Cookies
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Rate limiting setup
let rateLimitStore = [];
const RATE_LIMIT = 3; // requests per second
const RATE_LIMIT_WINDOW = 10; // seconds

const checkRateLimit = () => {
  const now = new Date();
  rateLimitStore = rateLimitStore.filter(time =>
    (now - time) <= RATE_LIMIT_WINDOW * 1000
  );

  if (rateLimitStore.length >= RATE_LIMIT) {
    const oldestRequest = rateLimitStore[0];
    const retryAfter = RATE_LIMIT_WINDOW - ((now - oldestRequest) / 1000);
    return { passed: false, retryAfter };
  }

  rateLimitStore.push(now);
  return { passed: true };
};

/* ---------------------------- Mainpage ---------------------------- */
app.get("/", (req, res) => {
  res.render("mainpage", { title: "Haunted Bids - Home" });
});

/* ---------------------------- Gallery ---------------------------- */
app.get("/gallery", async (req, res) => {
  try {
    const { query, category } = req.query; // Get query and category from the URL
    const listings = await sql.getGallery(query, category);
    for (let item of listings) {
      item.bids = await sql.getBids(item.id);
      item.topBid = await sql.getHighestBid(item.id);
    }

    res.render("gallery", {
      title: "Haunted Bids - Gallery",
      listings,
      query,
      category,
    });
  } catch (error) {
    console.error("Error fetching gallery:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

/* ---------------------------- Delete Listing ---------------------------- */
app.delete("/api/delete_listing", async (req, res) => {
  // Rate limiting
  if (checkRateLimit().passed == false) {
    res.setHeader("Retry-After", checkRateLimit().retryAfter);
    return res.status(429).send({ message: "Hold your horses!" });
  }

  // Check to make sure id exist
  const { listing_id } = req.body;
  if (!listing_id || typeof listing_id !== "number") {
    return res.status(400).send({ message: "Invalid or missing listing_id." });
  }

  try {
    const success = await sql.deleteListing(listing_id);

    if (success) {
      res.status(200).send({ message: "Listing deleted successfully." });
    } else {
      res.status(404).send({ message: "Listing not found." });
    }
  } catch (error) {
    console.error("Error in /api/delete_listing:", error.message);
    res.status(500).send({ message: "Internal Server Error." });
  }
});

/* ---------------------------- Listing ---------------------------- */
app.get("/listing/:id", async (req, res) => {
  //const id = parseInt(req.params.id, 10);


  try {
    const listing = await sql.getListing(req.params.id);

    if (!listing) {
      return res.status(404).render('404', { title: 'Page Not Found' });
    }
    res.render("listing", { listing });

  } catch (error) {
    console.error(`Error fetching listing for ID ${id}:`, error.message);
    res.status(500).send("Internal Server Error");
  }
});

/* ---------------------------- Create ---------------------------- */
app.get("/create", (req, res) => {
  res.render("create", { title: "Haunted Bids - Create" });
});

app.post("/create", async (req, res) => {
  const { title, image_url, description, category, other_category, sale_end_date } = req.body;

  // If "Other" is selected, use the "other_category" value
  const finalCategory = category === "Other" ? other_category : category;

  const newListing = {
    title,
    image_url,
    description,
    category: finalCategory,
    sale_end_date,
  };

  const newId = await sql.addListing(newListing);

  // redirect to the galery page after successful submission
  res.redirect("/gallery");
});

/* ---------------------------- Place Bid ---------------------------- */
app.post('/api/place_bid', async (req, res) => {
  // Rate limit
  if (checkRateLimit().passed == false) {
    res.setHeader("Retry-After", checkRateLimit().retryAfter());
    res.status(429).send({ message: "Hold your horses for!" });
  }

  try {
    // Extract only required fields from the request body
    const { listing_id, bid_amount, bidder_name: bodyBidderName } = req.body;
    const comment = req.body.comment ?? "";

    // Validate the required fields and their types
    if (
      typeof (listing_id) !== 'number' ||
      typeof (bid_amount) !== 'number' ||
      (comment !== undefined && typeof comment !== 'string') ||
      (bodyBidderName !== undefined && typeof bodyBidderName !== 'string')
    ) {
      return res.status(400).send(''); // Return empty body for 400 Bad Request
    }

    // Use bidder_name from cookie if available, otherwise from the request body
    const bidder_name = req.cookies.bidder_name || bodyBidderName;
    if (!bidder_name || typeof bidder_name !== 'string') {
      return res.status(400).send(''); // Return empty body for 400 Bad Request
    }

    // Fetch listing from the database
    const listing = await sql.getListing(listing_id);
    if (!listing) {
      return res.status(404).send({ error: 'Listing not found' });
    }

    // Check if the auction has ended
    const now = new Date();
    const auctionEndDate = new Date(`${listing.sale_end_date}T23:59:59`);
    if (now >= auctionEndDate) {
      return res.status(409).send({ error: 'Auction has ended' });
    }

    // Get the current highest bid
    const highestBid = await sql.getHighestBid(listing_id);

    // Validate that the new bid is higher
    if (highestBid && bid_amount <= highestBid) {
      return res.status(409).send({ error: 'Bid must be higher than the current highest bid' });
    }

    // Insert the new bid into the database
    const newBid = {
      listing_id: listing_id,
      bidder: bidder_name,
      amount: bid_amount,
      comment: comment || '',
    };

    await sql.placeBid(newBid);

    // Set the bidder_name cookie
    res.cookie('bidder_name', bidder_name, {
      secure: true,
      path: '/',
      sameSite: 'none',
      httpOnly: false,
    });

    // Fetch the updated bids for the listing
    const updatedBids = await sql.getBids(listing_id);

    // Return the updated bids
    return res.status(201).send(updatedBids);
  } catch (error) {
    console.error('Error placing bid:', error.message);
    res.status(500).send({ error: 'Internal Server Error' });
  }
});

/* ---------------------------- 404 ---------------------------- */

app.use((req, res) => {
  console.error(`404 Error - Page not found: ${req.originalUrl}`); //debugging
  res.status(404).render('404', { title: 'Page Not Found' });
});

/* ---------------------------- Start Server ---------------------------- */
app.listen(port, () => {
  console.log(`Server is listening on port ${port}: http://localhost:4131`)
});