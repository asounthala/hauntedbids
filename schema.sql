CREATE TABLE auction (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    image_url VARCHAR(2048) NOT NULL, 
    item_description TEXT,
    category VARCHAR(100),
    sale_end_date DATETIME
);

CREATE TABLE bid (
    id INT AUTO_INCREMENT PRIMARY KEY,
    auction_id INT NOT NULL,
    bidder_name VARCHAR(100) NOT NULL,
    bid_amount DECIMAL(10, 2) NOT NULL,
    comment TEXT,
    FOREIGN KEY (auction_id) REFERENCES auction (id) ON DELETE CASCADE
);

CREATE TABLE author (
id INR PRIMARY KEY,
name VARCHAR(255)
);