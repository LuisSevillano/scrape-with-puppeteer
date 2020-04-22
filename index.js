const fetch = require("node-fetch");
const puppeteer = require("puppeteer");
const fs = require("fs");
const d3 = require("d3-dsv");

function getSteps(height) {
  const middle = height / 2;
  return [
    0,
    middle / 2,
    middle,
    middle / 2.5,
    height - middle / 2,
    height - height - middle / 2.5,
    height
  ];
}

function parse(file) {
  return d3.csvParse(file);
}

function removeDuplicates(arr) {
  var obj = {};

  for (var i = 0, len = arr.length; i < len; i++) {
    obj[arr[i]["Country_Region"]] = arr[i];
  }

  const output = new Array();
  for (var key in obj) {
    output.push(obj[key]);
  }
  return output;
}

// inside browser
function extractItems() {
  const rowSelector = "#dgrid_1 > div.dgrid-scroller .dgrid-row tr";
  const extractedElements = document.querySelectorAll(rowSelector);
  let items = [];
  const headers = [
    "Country_Region",
    "Last_Update",
    "Lat",
    "Long",
    "Confirmed",
    "Deaths",
    "Recovered",
    "Active"
  ];
  for (let element of extractedElements) {
    const tds = element.querySelectorAll("td");
    const row = {};
    headers.forEach(function(header, j) {
      row[header] = tds[j].textContent;
      if (header === "Country_Region" && row[header] === "Haiti") {
        console.log(row);
      }
    });
    items.push(row);
  }
  return items;
}

async function getScrollingItems(
  page,
  extractItems,
  itemTargetCount,
  scrollDelay = 2000
) {
  let items = [];
  let steps = [];
  let output = [];
  try {
    let previousHeight;

    let i = 0;

    while (items.length <= itemTargetCount) {
      console.log("...scrolling");
      if (removeDuplicates(output).length === itemTargetCount) break;
      const rowSelector = "#dgrid_1 > div.dgrid-scroller .dgrid-row tr";
      await page.waitForSelector(rowSelector);
      items = await page.evaluate(extractItems);
      output = removeDuplicates(output.concat(items));
      previousHeight = await page.evaluate(
        "document.querySelector('.dgrid-scroller').scrollHeight"
      );

      steps = getSteps(previousHeight);
      let to = steps[++i];
      const from = i == 0 ? 0 : steps[i - 1];
      if (to === undefined) {
        to = steps[steps.length - 1];
      }

      await page.evaluate(
        `document.querySelector('.dgrid-scroller').scrollTo(${from},${to})`
      );

      await page.waitForFunction(
        `document.querySelector('.dgrid-scroller').scrollHeight >= ${to}`
      );
      await page.waitForFunction(`${itemTargetCount}>=${items.length}`);
      await page.waitFor(scrollDelay);
    }
  } catch (e) {
    console.log(e);
  }
  return output;
}

(async () => {
  const url =
    "https://www.arcgis.com/home/item.html?id=c0b356e20b30490c8b8b4c7bb9554e7c#data";

  const totalItems = 185;
  const csv = [];

  const selectSelector = ".inline-block.leader-0";
  const optionSelector = ".inline-block.leader-0 > option:nth-child(3)";

  const browser = await puppeteer.launch({
    waitUntil: "load"
    // headless: false
  });
  const page = await browser.newPage({ devtools: true });

  await page.goto(url, {
    waitUntil: "networkidle2"
  });
  await page.waitForSelector(selectSelector);
  await page.select(selectSelector, "2");
  const items = await getScrollingItems(page, extractItems, totalItems);

  const output = removeDuplicates(items);

  if (output.length) {
    fs.writeFile("output.csv", d3.csvFormat(output), function(error) {
      if (error) return console.log("error", error);
      console.log(`${output.length - 1} items saved`);
    });
  }

  await browser.close();
})();

function format(n) {
  return +n.replace(/\./gi, "").replace(/,/gi, ".");
}
