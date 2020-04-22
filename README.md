# Scraping with puppeteer

This example scrapes data from an Arcgis web. The use case has to select a dataset inside the `FeatureLayer` and sometimes this produces a `TimeoutError`. If this happens you have to relaunch the scrapper.

In essence, the scrape scrolls all over the table and captures all the rows, then remove the duplicates. This is because this Arcgis viewer does not allow to display all the rows of the table simultaneously.

This is the first project in which I use [puppeteer](https://github.com/puppeteer/puppeteer) so there may be better ways to achieve the same result. Any improvement or suggestion is welcome.
