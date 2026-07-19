const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    console.log('BROWSER CONSOLE:', msg.text());
  });
  
  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });
  
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle2' }).catch(e => console.log(e));
  
  // Inject fake token for a Student
  await page.evaluate(() => {
    const fakeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6InByYXRoaWtqb2VwYXVsQGdtYWlsLmNvbSIsInJvbGUiOiJTdHVkZW50IiwiZGVwYXJ0bWVudCI6IkNTRSIsImlhdCI6MTYyMDAwMDAwMCwiZXhwIjoxNzkwMDAwMDAwfQ.dummy';
    localStorage.setItem('token', fakeToken);
    localStorage.setItem('userRole', 'Student');
    sessionStorage.setItem('sessionActive', 'true');
  });
  
  console.log('Token injected, navigating to dashboard...');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' }).catch(e => console.log(e));
  
  await page.screenshot({ path: 'screenshot.png' });
  await browser.close();
})();
