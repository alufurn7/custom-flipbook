const { chromium } = require('playwright');
(async () => {
 const browser = await chromium.launch({headless:true});
 const page = await browser.newPage({viewport:{width:1280,height:900}});
 await page.goto('http://127.0.0.1:5173/');
 await page.waitForFunction(() => window.paperfold);
 await page.evaluate(() => {
  const e=window.paperfold; window.framesRead=[];
  const original=e.renderFold.bind(e);
  e.renderFold=(p)=> { const g=original(p); window.framesRead.push({t:performance.now(),phase:e.phase,p:{...p},crease:g.creasePoint,angle:g.angle,opacity:g.shadowOpacity});return g; };
  const idle=e.renderIdle.bind(e);
  e.renderIdle=()=>{window.lastPose={point:e.renderedPointer,origin:e.origin}; window.finishPending=idle;};
 });
 const b=await page.locator('.flipbook-book').boundingBox();
 await page.mouse.move(b.x+b.width-3,b.y+b.height-3); await page.mouse.down();
 await page.mouse.move(b.x+b.width-b.width*.4,b.y+b.height*.7,{steps:12});
 await page.waitForTimeout(300); await page.mouse.up();
 await page.waitForFunction(()=>window.finishPending);
 await page.screenshot({path:'outputs/landing-before-idle.png'});
 console.log(JSON.stringify(await page.evaluate(()=>({pose:window.lastPose,frames:window.framesRead.filter((_,i)=>i%12===0),last:window.framesRead.slice(-3)}))));
 await page.evaluate(()=>window.finishPending());
 await page.screenshot({path:'outputs/landing-after-idle.png'});
 await browser.close();
})();
