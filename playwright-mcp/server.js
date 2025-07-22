const express = require('express');
const { chromium } = require('playwright');

const app = express();
app.use(express.json());

app.post('/screenshot', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).send('Missing URL');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(url);
  const screenshot = await page.screenshot({ encoding: 'base64' });
  await browser.close();
  res.json({ screenshot });
});

app.listen(4000, () => {
  console.log('Playwright MCP server running on http://localhost:4000');
});
