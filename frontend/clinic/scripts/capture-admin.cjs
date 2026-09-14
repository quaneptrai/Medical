const fs = require('fs');

const endpoint = 'http://127.0.0.1:9222';
const output = process.argv[2];
const mode = process.argv[3] || 'admin';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  if (!process.env.BOTMED_ADMIN_EMAIL || !process.env.BOTMED_ADMIN_PASSWORD) throw new Error('Set BOTMED_ADMIN_EMAIL and BOTMED_ADMIN_PASSWORD for local QA.');
  let targets;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try { targets = await (await fetch(`${endpoint}/json`)).json(); break; } catch { await wait(250); }
  }
  const target = targets?.find((item) => item.type === 'page');
  if (!target) throw new Error('Không tìm thấy Chrome DevTools page target.');
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let id = 0;
  const pending = new Map();
  socket.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) { const { resolve, reject } = pending.get(message.id); pending.delete(message.id); message.error ? reject(new Error(message.error.message)) : resolve(message.result); }
  });
  const call = (method, params = {}) => new Promise((resolve, reject) => { id += 1; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });

  await call('Page.enable');
  await call('Runtime.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  let role = null;
  if (mode === 'journey') {
    await call('Page.navigate', { url: 'http://localhost:3000/' });
    await wait(1800);
    await call('Runtime.evaluate', { expression: `document.getElementById('journey-heading').scrollIntoView({block:'center'})` });
    await wait(500);
  } else if (mode === 'doctors' || mode === 'doctor' || mode === 'booking' || mode === 'specialties' || mode === 'about') {
    const routes = { doctors: '/bac-si', doctor: '/bac-si/doc-le-thu-hang', booking: '/dat-lich?bacsi=doc-le-thu-hang', specialties: '/chuyen-khoa', about: '/gioi-thieu' };
    await call('Page.navigate', { url: `http://localhost:3000${routes[mode]}` });
    await wait(2200);
  } else if (mode === 'chat' || mode === 'footer') {
    await call('Page.navigate', { url: 'http://localhost:3000/' });
    await wait(1800);
    if (mode === 'chat') await call('Runtime.evaluate', { expression: `document.querySelector('[aria-label="Mở Live Chat"]').click()` });
    else await call('Runtime.evaluate', { expression: `window.scrollTo(0, document.documentElement.scrollHeight)` });
    await wait(500);
  } else {
    await call('Page.navigate', { url: 'http://localhost:3000/dang-nhap' });
    await wait(1000);
    const login = await call('Runtime.evaluate', {
      expression: `(async()=>{const response=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(${JSON.stringify({ email: process.env.BOTMED_ADMIN_EMAIL, password: process.env.BOTMED_ADMIN_PASSWORD })})});return {ok:response.ok,data:await response.json()};})()`,
      awaitPromise: true,
      returnByValue: true,
    });
    if (!login.result?.value?.ok) throw new Error(`Đăng nhập thất bại: ${JSON.stringify(login.result?.value)}`);
    role = login.result.value.data.roles?.[0];
    await call('Page.navigate', { url: 'http://localhost:3000/quan-tri' });
    await wait(2200);
    const adminTargets = { admincatalog: 'Danh mục y khoa', admininventory: 'Kho & nhập xuất', adminfeedback: 'Phản hồi & chất lượng', adminmaintenance: 'Bảo trì thiết bị' };
    if (adminTargets[mode]) {
      await call('Runtime.evaluate', { expression: `Array.from(document.querySelectorAll('button')).find(button=>button.textContent.includes(${JSON.stringify(adminTargets[mode])}))?.click()` });
      await wait(700);
      await call('Runtime.evaluate', { expression: `window.scrollTo(0, 780)` });
      await wait(400);
    }
  }
  const shot = await call('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false });
  fs.writeFileSync(output, Buffer.from(shot.data, 'base64'));
  await call('Browser.close');
  console.log(JSON.stringify({ output, role, bytes: fs.statSync(output).size }));
}

main().catch((error) => { console.error(error); process.exit(1); });
