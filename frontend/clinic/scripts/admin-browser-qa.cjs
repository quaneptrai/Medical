const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.resolve(root, '../../artifacts/admin-qa');
fs.mkdirSync(out,{recursive:true});
const wait = ms => new Promise(resolve=>setTimeout(resolve,ms));
async function main() {
  const targets=await (await fetch('http://127.0.0.1:9222/json')).json();
  const socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
  const pending=new Map(); let id=0; const errors=[]; const checks=[];
  socket.addEventListener('message', event=>{
    const message=JSON.parse(event.data);
    if(message.id && pending.has(message.id)) {const p=pending.get(message.id); pending.delete(message.id); message.error?p.reject(new Error(message.error.message)):p.resolve(message.result);}
    if(message.method==='Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
  });
  const call=(method,params={})=>new Promise((resolve,reject)=>{const current=++id;pending.set(current,{resolve,reject});socket.send(JSON.stringify({id:current,method,params}));});
  const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error('Browser evaluation failed: '+result.exceptionDetails.text);return result.result?.value;};
  const until=async expression=>{for(let i=0;i<60;i++){if(await evaluate(`Boolean(${expression})`))return;await wait(150);}throw new Error('Timed out: '+expression);};
  const screenshot=async name=>{const shot=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.writeFileSync(`${out}/${name}.png`,Buffer.from(shot.data,'base64'));};
  const viewport=async(width,height,mobile)=>call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile});
  const navigate=async key=>{await evaluate(`location.hash=${JSON.stringify(key)}`);await until(`document.querySelector('.admin-sidebar [aria-current="page"]')?.textContent && location.hash==='#${key}' && !document.querySelector('.admin-module [aria-busy="true"]')`);await wait(400);};
  const input=async(selector,value)=>evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await call('Page.enable');await call('Runtime.enable');await viewport(1440,1000,false);
  await call('Page.navigate',{url:'http://localhost:3000/dang-nhap'});await until("document.querySelector('input')");
  assert.ok(process.env.BOTMED_ADMIN_EMAIL && process.env.BOTMED_ADMIN_PASSWORD, 'Set BOTMED_ADMIN_EMAIL and BOTMED_ADMIN_PASSWORD for local QA');
  const credentials = JSON.stringify({email:process.env.BOTMED_ADMIN_EMAIL,password:process.env.BOTMED_ADMIN_PASSWORD});
  const login = await evaluate(`(async()=>{const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(${credentials})});return {ok:response.ok};})()`);
  assert.ok(login?.ok,'Existing QA account login');
  await call('Page.navigate',{url:'http://localhost:3000/quan-tri'});await until("document.querySelector('.admin-sidebar')");
  const modules=['overview','appointments','patients','chat','doctors','specialties','services','triage','feedback','content','inventory','maintenance','invoices','reports','users','roles','tenants','audit'];
  for(const width of [1440,390]) {
    await viewport(width,width===390?844:1000,width===390);
    for(const key of modules) {
      await navigate(key);
      const info=await evaluate(`({overflow:document.documentElement.scrollWidth>innerWidth+1,errors:[...document.querySelectorAll('.admin-error')].filter(e=>e.textContent.trim()).length,heading:!!document.querySelector('.admin-page-heading h1')})`);
      checks.push({width,module:key,...info});
      if(['overview','users','doctors','content'].includes(key)) await screenshot(`admin-${key}-${width}`);
    }
  }
  await viewport(1440,1000,false);await navigate('overview');
  await input('[aria-label="Tìm chức năng quản lý"]','lich hen');await wait(200);
  assert.equal(await evaluate("document.querySelectorAll('.admin-sidebar nav button').length"),1);checks.push({check:'unaccented menu search',pass:true});
  await input('[aria-label="Tìm chức năng quản lý"]','zzzz');await wait(150);assert.ok(await evaluate("Boolean(document.querySelector('.admin-sidebar [role="+JSON.stringify('status')+"]'))"));
  await input('[aria-label="Tìm chức năng quản lý"]','');await wait(150);
  await navigate('doctors');
  const draftSelector='.admin-module input[type="text"]';
  const before=await evaluate(`document.querySelector('${draftSelector}')?.value`);
  if(before!==undefined){await input(draftSelector,before+' QA unsaved');await evaluate("[...document.querySelectorAll('.admin-page-heading button')].find(b=>b.textContent.includes('Làm mới')).click()");await wait(900);assert.equal(await evaluate(`document.querySelector('${draftSelector}').value`),before+' QA unsaved');checks.push({check:'refresh preserves unsaved draft',pass:true});}
  const keyboardCheck=async kind=>{
    await until("document.querySelector('[role=dialog]')");await wait(400);
    assert.ok(await evaluate("document.querySelector('[role=dialog]').contains(document.activeElement)"));
    for(let i=0;i<16;i++){await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});assert.ok(await evaluate("document.querySelector('[role=dialog]').contains(document.activeElement)"));}
    await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,modifiers:8});
    assert.ok(await evaluate("document.querySelector('[role=dialog]').contains(document.activeElement)"));
    await screenshot('admin-'+kind+'-dialog');
    await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await until("!document.querySelector('[role=dialog]')");
    assert.ok(await evaluate("document.activeElement?.textContent.trim()==='Chi tiết'"),'Focus returns to detail trigger');checks.push({check:kind+' keyboard trap, Escape and focus return',pass:true});
  };
  await navigate('users');await evaluate("(()=>{const button=[...document.querySelectorAll('.admin-module button')].find(b=>b.textContent.includes('Chi tiết'));button.focus();button.click();})()");await keyboardCheck('account');
  await navigate('appointments');
  const appointmentOpened=await evaluate("(()=>{const button=[...document.querySelectorAll('.admin-module button')].find(b=>b.textContent==='Chi tiết');button?.focus();button?.click();return !!button;})()");
  if(appointmentOpened)await keyboardCheck('appointment');else checks.push({check:'appointment keyboard check',skipped:'No live appointments'});
  await viewport(390,844,true);await navigate('users');await evaluate("[...document.querySelectorAll('.admin-module button')].find(b=>b.textContent.includes('Chi tiết')).click()");await until("document.querySelector('[role=dialog]')");await wait(300);await screenshot('admin-account-mobile');
  checks.push({check:'mobile drawer overflow',overflow:await evaluate("document.querySelector('[role=dialog]').scrollWidth>document.querySelector('[role=dialog]').clientWidth+1")});
  await call('Page.navigate',{url:'http://localhost:3000/co-the-nguoi'});await until("[...document.images].some(i=>i.src.includes('human-anatomy-model-v2')&&i.complete&&i.naturalWidth>0)");await screenshot('anatomy-mobile');
  checks.push({check:'anatomy image loaded',pass:true});
  const report={checks,runtimeErrors:errors};fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));await call('Browser.close');
  if(checks.some(c=>c.overflow||c.errors||c.heading===false)||errors.length)process.exitCode=1;
}
main().catch(error=>{console.error(error.message);process.exit(1);});
