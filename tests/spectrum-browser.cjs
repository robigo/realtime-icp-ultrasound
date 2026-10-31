const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({headless:true, args:['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport:{width:1280,height:1000}, acceptDownloads:true});
    const errors=[];page.on('pageerror', e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../spectrum.html')).href);
    assert.equal(await page.locator('#count').textContent(),'600');
    assert.equal(await page.locator('#fs').textContent(),'50.0');
    await page.locator('#baseline').click();
    assert.ok(await page.locator('#baselineLegend').isVisible());
    await page.selectOption('#segment','last');
    assert.equal(await page.locator('#count').textContent(),'300');
    assert.ok(await page.locator('#baselineLegend').isVisible());
    await page.selectOption('#signal','ppg_reference_0_1');
    assert.ok(await page.locator('#baselineLegend').isHidden());
    await page.selectOption('#window','rectangular');
    const [download] = await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);
    const stream=await download.createReadStream();let csv='';for await(const chunk of stream)csv+=chunk;
    assert.ok(csv.includes('synthetic_demo,ppg_reference_0_1,last,rectangular'));
    assert.equal(csv.trim().split('\n').length,151);
    await page.locator('#clear').click();
    assert.ok(await page.locator('#clear').isDisabled());
    assert.equal(await page.locator('#error').textContent(),'');
    for(const width of [1280,390]){
      await page.setViewportSize({width,height:1000});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    await page.screenshot({path:'/tmp/echo-spectrum-mobile.png',fullPage:true});
    assert.deepEqual(errors,[]);
    console.log('PASS: browser load, source/segment/window selection, baseline, CSV, mobile layout');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
