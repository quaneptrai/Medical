// Run with node --test scripts/admin-routes.test.cjs. Uses only a temporary SQLite database.
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createRequire, Module } = require('node:module');
const root = process.env.ADMIN_TEST_ROOT || path.resolve(__dirname, '..');
const appRequire = createRequire(path.join(root, 'package.json'));
const ts = appRequire('typescript');
const originalCwd = process.cwd();
const isolated = fs.mkdtempSync(path.join(os.tmpdir(), 'botmedical-admin-test-'));
fs.mkdirSync(path.join(isolated, 'data'));
fs.copyFileSync(path.join(root, 'data/disease-library.json'), path.join(isolated, 'data/disease-library.json'));
process.chdir(isolated);
let viewer = null;
const cache = new Map();
function load(filename) {
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(root);
  cache.set(filename, mod);
  mod.require = spec => {
    if (spec === '@/lib/auth/session') return { getCurrentUser: async () => viewer };
    if (spec.startsWith('@/') || spec.startsWith('.')) {
      const candidate = spec.startsWith('@/') ? path.join(root, spec.slice(2)) : path.resolve(path.dirname(filename), spec);
      if (fs.existsSync(candidate + '.ts')) return load(candidate + '.ts');
    }
    return appRequire(spec);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename);
  return mod.exports;
}
const { getDb } = load(path.join(root, 'lib/auth/db.ts'));
const db = getDb();
assert.equal(path.resolve(db.name), path.join(isolated, 'data/auth.db'));
const admin = load(path.join(root, 'app/api/admin/route.ts'));
const operations = load(path.join(root, 'app/api/admin/operations/route.ts'));
const userDetail = load(path.join(root, 'app/api/admin/users/[id]/route.ts'));
const labels = load(path.join(root, 'lib/admin-labels.ts'));
const { NextRequest } = appRequire('next/server');
const req = (body, method = 'PATCH', query = '') => new NextRequest('http://localhost/api/admin' + query, {
  method, ...(method === 'GET' ? {} : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
});
db.prepare('INSERT INTO tenants(id,name,code,created_at,updated_at) VALUES (?,?,?,?,?)').run('yg-clinic-hn','Test clinic','TEST',1,1);
for (const id of ['admin', 'patient']) db.prepare('INSERT INTO users(id,email,password_hash,created_at,updated_at) VALUES (?,?,?,?,?)').run(id, id+'@example.test','unused',1,1);
db.prepare('INSERT INTO roles(id,name,code,created_at) VALUES (?,?,?,?)').run('role-admin','Admin','super_admin',1);
db.prepare('INSERT INTO user_roles(user_id,role_id,tenant_id,assigned_at) VALUES (?,?,?,?)').run('admin','role-admin','yg-clinic-hn',1);
after(() => { db.close(); process.chdir(originalCwd); fs.rmSync(isolated, { recursive: true, force: true }); });

test('authentication is required for every admin read/write endpoint', async () => {
  for (const [user, status] of [[null,401], [{id:'patient'},403]]) {
    viewer = user;
    for (const [route, method] of [[admin,'GET'],[admin,'PATCH'],[admin,'POST'],[operations,'GET'],[operations,'PATCH']]) {
      assert.equal((await route[method](req({},method))).status, status);
    }
    assert.equal((await userDetail.GET(req(null,'GET'),{params:Promise.resolve({id:'admin'})})).status,status);
  }
  viewer = { id: 'admin' };
});
test('invalid JSON and null mutation bodies return 400', async () => {
  for (const [route, method] of [[admin,'PATCH'],[admin,'POST'],[operations,'PATCH']]) {
    assert.equal((await route[method](req(null,method))).status,400);
    assert.equal((await route[method](new NextRequest('http://localhost/api/admin',{method,body:'{'}))).status,400);
  }
});
let specialtyId, inventoryId;
test('specialty creation writes correct fields and audit entry', async () => {
  const response = await admin.POST(req({entity:'specialty',name:'Test specialty',category:'test',shortDesc:'Short',fullDesc:'Full'},'POST'));
  assert.equal(response.status,201);
  specialtyId = (await response.json()).id;
  assert.equal(db.prepare('SELECT short_desc FROM specialties WHERE id=?').get(specialtyId).short_desc,'Short');
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM audit_logs WHERE resource_id=?').get(specialtyId).n,1);
});
test('inventory permits zero adjustment but rejects zero input, negative and excess output', async () => {
  const response = await admin.POST(req({entity:'inventory',name:'Test item',sku:'TEST'},'POST'));
  assert.equal(response.status,201); inventoryId = (await response.json()).id;
  for (const [movementType,quantity,status] of [['in',5,201],['out',6,409],['out',0,400],['in',0,400],['adjust',-1,400],['adjust',0,201]]) {
    assert.equal((await admin.POST(req({entity:'stock_movement',itemId:inventoryId,movementType,quantity},'POST'))).status,status);
  }
  assert.equal(db.prepare('SELECT current_quantity FROM inventory_items WHERE id=?').get(inventoryId).current_quantity,0);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM stock_movements WHERE item_id=?').get(inventoryId).n,2);
});
function appointment(id, status='pending') {
  db.prepare('INSERT INTO appointments(id,specialty_id,appointment_date,appointment_time,patient_name,patient_phone,status,created_at) VALUES (?,?,?,?,?,?,?,?)').run(id,specialtyId,labels.vietnamDate(),'09:00','Test Patient','0000000000',status,1);
}
const transition = (id,value,expectedStatus,reason) => admin.PATCH(req({entity:'appointment_status',id,value,expectedStatus,reason}));
test('appointment lifecycle prevents stale updates, records timestamps and terminal states', async () => {
  appointment('lifecycle');
  assert.equal((await transition('missing','confirmed','pending')).status,404);
  assert.equal((await transition('lifecycle','completed','pending')).status,409);
  const race = await Promise.all([transition('lifecycle','confirmed','pending'),transition('lifecycle','confirmed','pending')]);
  assert.deepEqual(race.map(r=>r.status).sort(),[200,409]);
  assert.equal((await transition('lifecycle','cancelled','pending','Stale')).status,409);
  assert.equal((await transition('lifecycle','checked_in','confirmed')).status,200);
  const checkin = db.prepare('SELECT checkin_at FROM appointments WHERE id=?').get('lifecycle').checkin_at;
  assert.ok(checkin > 0);
  assert.equal((await transition('lifecycle','completed','checked_in')).status,200);
  const row = db.prepare('SELECT * FROM appointments WHERE id=?').get('lifecycle');
  assert.equal(row.checkin_at,checkin); assert.ok(row.completed_at >= checkin);
  assert.equal((await transition('lifecycle','confirmed','completed')).status,409);
});
test('cancellation requires a bounded reason and is final', async () => {
  appointment('cancel');
  assert.equal((await transition('cancel','cancelled','pending',' ')).status,400);
  assert.equal((await transition('cancel','cancelled','pending','x'.repeat(1001))).status,400);
  assert.equal((await transition('cancel','cancelled','pending','  Test cancellation  ')).status,200);
  assert.equal(db.prepare('SELECT cancellation_reason FROM appointments WHERE id=?').get('cancel').cancellation_reason,'Test cancellation');
  assert.equal((await transition('cancel','confirmed','cancelled')).status,409);
});
test('appointment pagination clamps invalid and past-end pages and applies filters', async () => {
  for (let i=0;i<23;i++) appointment('page-'+i);
  const get = async query => (await operations.GET(req(null,'GET','?view=appointments&'+query))).json();
  const first = await get('page=1'); assert.equal(first.rows.length,20); assert.equal(first.total,25);
  const last = await get('page=999'); assert.equal(last.page,2); assert.equal(last.rows.length,5);
  assert.equal((await get('page=Infinity')).page,1);
  assert.equal((await get('status=cancelled')).total,1);
  assert.equal((await get('q=page-')).total,23);
  assert.equal((await get('specialty=missing')).total,0);
});
test('overview and directory reads work with real schema', async () => {
  assert.equal((await admin.GET()).status,200);
  const overview = await (await operations.GET(req(null,'GET'))).json();
  assert.equal(overview.daily.reduce((n,r)=>n+r.count,0),25);
  assert.equal(overview.upcoming.length,8);
  assert.equal((await userDetail.GET(req(null,'GET'),{params:Promise.resolve({id:'admin'})})).status,200);
});
test('editorial notes persist and update without duplicate rows', async () => {
  const entries = await (await operations.GET(req(null,'GET','?view=content'))).json();
  assert.ok(entries.rows.length > 600);
  const id=entries.rows[0].id;
  for (const status of ['in_progress','done']) assert.equal((await operations.PATCH(req({id,status,note:' Internal review '}))).status,200);
  const updated=await (await operations.GET(req(null,'GET','?view=content'))).json();
  assert.equal(updated.rows.find(r=>r.id===id).review.note,'Internal review');
  assert.equal(updated.rows.find(r=>r.id===id).review.status,'done');
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM system_settings WHERE category='editorial_review'").get().n,1);
  assert.equal((await operations.PATCH(req({id,status:'done',note:'x'.repeat(2001)}))).status,400);
});
test('Vietnam dates stay ISO formatted across local midnight; unaccented search works', () => {
  assert.equal(labels.vietnamDate(new Date('2026-09-14T16:59:59Z')),'2026-09-14');
  assert.equal(labels.vietnamDate(new Date('2026-09-14T17:00:00Z')),'2026-09-15');
  assert.equal(labels.normalizeSearch('ĐÁNH GIÁ người bệnh'),'danh gia nguoi benh');
});
