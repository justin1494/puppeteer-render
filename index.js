const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const { scrapeMatches } = require("./scrapeLogic");
const app = express();

const PORT = process.env.PORT || 4000;
const SCRAPE_INTERVAL = 3 * 60 * 1000; // 3 minutes in milliseconds

// Initialize SQLite database
const db = new sqlite3.Database("matches.db", (err) => {
  if (err) {
    console.error("Error opening database", err);
  } else {
    console.log("Database connected");
    db.run(`CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      timestamp INTEGER
    )`);
  }
});

const matchesTimeout = async () => {
  try {
    const matchIds = await scrapeMatches();
    const timestamp = Date.now();

    // Save to database
    const stmt = db.prepare(
      "INSERT OR REPLACE INTO matches (id, timestamp) VALUES (?, ?)"
    );
    matchIds.forEach((id) => {
      stmt.run(id, timestamp);
    });
    stmt.finalize();

    console.log("Matches updated in database");
  } catch (error) {
    console.error("Error in matchesTimeout:", error);
  }
};

// Start periodic scraping
setInterval(matchesTimeout, SCRAPE_INTERVAL);

app.get("/scrape", (req, res) => {
  db.all("SELECT id FROM matches", [], (err, rows) => {
    if (err) {
      console.error("Error querying database:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    if (rows.length > 0) {
      // Data exists in database, serve it
      res.json(rows.map((row) => row.id));
    } else {
      // No data in database, scrape and save
      scrapeMatches()
        .then((matchIds) => {
          const timestamp = Date.now();
          const stmt = db.prepare(
            "INSERT INTO matches (id, timestamp) VALUES (?, ?)"
          );
          matchIds.forEach((id) => {
            stmt.run(id, timestamp);
          });
          stmt.finalize();

          res.json(matchIds.map((id) => ({ id, timestamp })));
        })
        .catch((error) => {
          console.error("Error scraping matches:", error);
          res.status(500).json({ error: "Error scraping matches" });
        });
    }
  });
});

app.get("/", (req, res) => {
  res.send("Render Puppeteer server is up and running!");
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
  // Initial scrape on server start
  matchesTimeout();
});
