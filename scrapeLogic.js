const puppeteer = require("puppeteer");
require("dotenv").config();

async function waitForMatchesToLoad(page) {
  await page.waitForFunction(
    () => {
      const items = document.querySelectorAll("app-matches-list-item");
      return items.length > 0;
    },
    { timeout: 30000 }
  );
}


const scrapeLogic = async (res) => {
  const browser = await puppeteer.launch({
    args: [
      "--disable-setuid-sandbox",
      "--no-sandbox",
      "--single-process",
      "--no-zygote",
    ],
    executablePath:
      process.env.NODE_ENV === "production"
        ? process.env.PUPPETEER_EXECUTABLE_PATH
        : puppeteer.executablePath(),
  });
  try {
    const page = await browser.newPage();

    // Navigate to the Leetify login page
    await page.goto("https://leetify.com/login");

    // Wait for the email input field to be visible
    await page.waitForSelector('input[type="email"]');

    // Type in the email and password
    await page.type('input[type="email"]', "m.jaskolowski1994@gmail.com");
    await page.type('input[type="password"]', "Creative12345!");

    // Click the login button
    await page.click('button[type="submit"]');

    // Wait for navigation to complete
    await page.waitForNavigation();

    await page.goto("https://leetify.com/app/matches/list");

    // Wait for matches to load
    await waitForMatchesToLoad(page);

    const matchIds = await page.evaluate(() => {
      const matchElements = document.querySelectorAll(
        "app-matches-list-item a"
      );
      return Array.from(matchElements).map((element) => {
        const href = element.getAttribute("href");
        return href.split("/").pop();
      });
    });
    res.send(matchIds);
    return matchIds;
  } catch (e) {
    console.error(e);
    res.send(`Something went wrong while running Puppeteer: ${e}`);
  } finally {
    await browser.close();
  }
};

module.exports = { scrapeLogic };
