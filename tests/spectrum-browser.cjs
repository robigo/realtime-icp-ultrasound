const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({headless:true, args:['--no-sandbox']});
  let page;
  try {
    page = await browser.newPage({viewport:{width:1280,height:1000}, acceptDownloads:true});
    const errors=[];page.on('pageerror', e=>errors.push(e.message));
    await page.goto(pathToFileURL(path.resolve(__dirname,'../spectrum.html')).href);
    assert.equal(await page.locator('#count').textContent(),'600');
    assert.equal(await page.locator('#fs').textContent(),'50.0');
    assert.ok(await page.locator('#spectrum').isVisible());
    assert.match(await page.locator('#source').textContent(), /סינתטיות/);
    assert.match(await page.locator('.disclaimer').textContent(), /אינו כלי לאבחון רפואי/);
    const plot = () => page.locator('#spectrum').evaluate(canvas => canvas.toDataURL());
    assert.ok(await page.locator('#spectrum').evaluate(canvas =>
      Array.from(canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data)
        .some((value,index) => index % 4 === 3 && value > 0)), 'Canvas must contain drawn pixels');
    const initialPlot = await plot();
    await page.locator('#baseline').click();
    assert.ok(await page.locator('#baselineLegend').isVisible());
    assert.notEqual(await plot(), initialPlot, 'Baseline must be drawn');
    await page.selectOption('#segment','last');
    assert.equal(await page.locator('#count').textContent(),'300');
    assert.ok(await page.locator('#baselineLegend').isVisible());
    assert.notEqual(await plot(), initialPlot, 'Segment selection must redraw the plot');
    const segmentPlot = await plot();
    await page.selectOption('#signal','ppg_reference_0_1');
    assert.ok(await page.locator('#baselineLegend').isHidden());
    assert.notEqual(await plot(), segmentPlot, 'Signal selection must redraw the plot');
    const hannPlot = await plot();
    await page.selectOption('#window','rectangular');
    assert.notEqual(await plot(), hannPlot, 'Window selection must redraw the plot');
    const [download] = await Promise.all([page.waitForEvent('download'),page.locator('#export').click()]);
    const stream=await download.createReadStream();let csv='';for await(const chunk of stream)csv+=chunk;
    assert.ok(csv.includes('synthetic_demo,ppg_reference_0_1,last,rectangular'));
    assert.equal(csv.trim().split('\n').length,151);
    assert.ok(csv.trim().split('\n').slice(1).every(line => line.startsWith('synthetic_demo,')));
    await page.selectOption('#signal','icp_proxy_z');
    assert.ok(await page.locator('#baselineLegend').isVisible());
    await page.locator('#clear').click();
    assert.ok(await page.locator('#clear').isDisabled());
    assert.ok(await page.locator('#baselineLegend').isHidden());
    await page.selectOption('#signal','echo_displacement_samples');
    await page.selectOption('#segment','first');
    assert.equal(await page.locator('#count').textContent(),'300');
    assert.equal(await page.locator('#error').textContent(),'');
    for(const width of [1280,390]){
      await page.setViewportSize({width,height:1000});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    await page.screenshot({path:'/tmp/echo-spectrum-mobile.png',fullPage:true});
    assert.deepEqual(errors,[]);
    console.log('PASS: browser load, source/segment/window selection, baseline, CSV, mobile layout');
  } catch (error) {
    if (page) await page.screenshot({path:'/tmp/echo-spectrum-failure.png',fullPage:true}).catch(()=>{});
    throw error;
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

