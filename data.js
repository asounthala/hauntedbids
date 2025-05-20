// this package behaves just like the mysql one, but uses async await instead of callbacks.
const mysql = require(`mysql-await`); // npm install mysql-await
const listings = require('./resources/js/listings');

// first -- I want a connection pool: https://www.npmjs.com/package/mysql#pooling-connections
// this is used a bit differently, but I think it's just better -- especially if server is doing heavy work.
var connPool = mysql.createPool({
  connectionLimit: 5, // it's a shared resource, let's not go nuts.
  host: "",// this will work
  user: "",
  database: "",
  password: "", // we really shouldn't be saving this here long-term -- and I probably shouldn't be sharing it with you...
  port: 3310
});

// later you can use connPool.awaitQuery(query, data) -- it will return a promise for the query results.

async function addListing(data) {
  const { title, image_url, description, category, other_category, sale_end_date } = data;

  // Replace "Other Console" with the value of `other_category`
  const finalCategory = category === "Other Console" ? other_category : category;


  // Define the SQL query
  const query = `
    INSERT INTO auction (title, image_url, description, category, sale_end_date)
    VALUES (?, ?, ?, ?, ?);
  `;

  try {
    // Execute the query and log the result
    const result = await connPool.awaitQuery(query, [
      title,
      image_url,
      description,
      finalCategory, 
      sale_end_date,
    ]);

    // Return the new listing ID
    return result.insertId;
  } catch (error) {
    console.error("Error adding listing:", error.message); // Log error
    throw error; 
  }
}

async function deleteListing(id) {
  // Define the SQL query
  const deleteBidsQuery = `DELETE FROM bid WHERE auction_id = ?`;
  const deleteListingQuery = `DELETE FROM auction WHERE id = ?`;

  try {
    await connPool.awaitQuery(deleteBidsQuery, [id]);
    const result = await connPool.awaitQuery(deleteListingQuery, [id]);
    // console.log("Delete Result: ", result); // Degugging output

    return result.affectedRows > 0; // Return true if deletion succeeded
  } catch (error) {
    console.error("Error deleting listing: ", error.message); // Log the error
    throw error; 
  }
}

async function getListing(id) {
  // Query to fetch the listing
  const listingQuery = `SELECT * FROM auction WHERE id = ?`;

  // Query to fetch bids 
  const bidsQuery = `
    SELECT * FROM bid
    WHERE auction_id = ?
    ORDER BY bid_amount DESC
  `;

  try {
    // Execute the first query to get the listing
    const listingResults = await connPool.awaitQuery(listingQuery, [id]);

    // If no listing is found, return null
    if(listingResults.length === 0) {
      return null;
    }

    // Execute the second query to get the bids
    const bidsResult = await connPool.awaitQuery(bidsQuery, [id]);

    // Combined the listing with its bids
    const listing = listingResults[0];
    listing.bids = bidsResult; // Add bids array to the listing 

    return listing;
  } catch (error) {
    console.error("Error fetching listing:", error.message); // Log the error
    throw error;
  }
}

async function getGallery(query, category) {
  let sql = `SELECT * FROM auction`; 
  const params = [];

  // Add query filter
  sql += ` WHERE LOWER(title) LIKE LOWER(?)`;
  if (query) {
    params.push(`%${query}%`);
  } else {
    params.push(`%%`);
  }

  // Add category filter
  sql += ` AND LOWER(category) LIKE LOWER(?)`;
  if (category && category !== "ALL") {
    params.push(`%${category}%`);
  } else {
    params.push(`%%`);
  }

  try {
    const results = await connPool.awaitQuery(sql, params);
    return results;
  } catch (error) {
    console.error("Error fetching gallery:", error.message);
    throw error;
  }
}

async function placeBid(data) {

  // you CAN change the parameters for this function.
  const { listing_id, bidder, amount, comment } = data;

  // Check to see if auction exist and hasn't ended yet
  const auctionQuery = `
    SELECT id, sale_end_date
    FROM auction
    WHERE id = ? AND sale_end_date > NOW()
  `;

  // Get the highest bids for the auction
  const highestBidQuery = `
    SELECT MAX(bid_amount) AS highest_bid
    FROM bid
    WHERE auction_id = ?
  `;

  // Insert the new bid
  const insertBidQuery = `
    INSERT INTO bid (auction_id, bidder_name, bid_amount, comment)
    VALUES (?, ?, ?, ?)
  `;

  try {
    // Check if auction exist and is still active
    const auctionResults = await connPool.awaitQuery(auctionQuery, [listing_id]);
    if (auctionResults.length === 0) {
      throw new Error(`Auction with ID ${listing_id} does not exist or has ended.`);
    }

    // Get highest bid
    const highestBidResult = await connPool.awaitQuery(highestBidQuery, [listing_id]);
    const highestBid = highestBidResult[0].highest_bid || 0;
    if (amount <= highestBid) {
      throw new Error(
        `Bid amount must be greater than the current highest bid of ${highestBid}.`
      );
    }
    
    // Insert new bid
    const result = await connPool.awaitQuery(insertBidQuery, [
      listing_id,
      bidder,
      amount,
      comment,
    ]);

    console.log("New Bid Result: ", result);
    return result.insertId;
  } catch (error) {
    console.error("Error placing bid:", error.message);
    throw error; 
  }
}

async function getBids(listing_id) {
  const query = `
    SELECT bidder_name, bid_amount, comment
    FROM bid
    WHERE auction_id = ?
    ORDER BY bid_amount DESC
  `;

  try {
    const results = await connPool.awaitQuery(query, [listing_id]);
    return results;
  } catch (error) {
    console.error(`Error fetching bids for listing ID ${listing_id}:`, error.message);
    throw error;
  }
}

async function getHighestBid(listing_id) {
  const query = `
    SELECT bidder_name, bid_amount, comment
    FROM bid 
    WHERE auction_id = ?
    ORDER BY bid_amount DESC
    LIMIT 1
  `;

  try {
    const results = await connPool.awaitQuery(query, [listing_id]);
    if (results.length === 0) {
      return null;
    }

    return results[0].bid_amount;
  } catch (error) {
    console.error(`Error fetching highest bid for listing ID ${listing_id}:`, error.message);
    throw error;
  }
}


module.exports = {
  addListing,
  deleteListing,
  getListing,
  getGallery,
  placeBid,
  getBids,
  getHighestBid,
};
