const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

(async () => {
  const downloadPath = path.resolve('./downloads');
  if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath,
  });

  page.on('console', msg => console.log('BROWSER:', msg.text()));

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' });
  
  const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InByYXRoaWtqb2VwYXVsQGdtYWlsLmNvbSIsInJvbGUiOiJTdHVkZW50IiwiZGVwYXJ0bWVudCI6IkNTRSIsImlhdCI6MTYyMDAwMDAwMCwiZXhwIjoxNzkwMDAwMDAwfQ.dummy';
  
  await page.evaluate((token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userRole', 'Student');
    sessionStorage.setItem('sessionActive', 'true');
  }, fakeToken);
  
  await page.goto('http://localhost:5173/submission/new', { waitUntil: 'networkidle2' });
  
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const printBtn = buttons.find(b => b.textContent.includes('Print'));
    if (printBtn) printBtn.click();
  });
  
  await new Promise(r => setTimeout(r, 5000));
  
  const files = fs.readdirSync(downloadPath);
  console.log('Downloaded files:', files);
  
  if (files.length > 0) {
    const filePath = path.join(downloadPath, files[0]);
    const stat = fs.statSync(filePath);
    console.log(`File size: ${stat.size} bytes`);
  }
  
  await browser.close();
})();
