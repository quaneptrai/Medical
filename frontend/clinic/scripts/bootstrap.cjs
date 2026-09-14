// Fresh-clone bootstrap. Public catalog only; no copied users or patient history.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { Module } = require('node:module');
const ts = require('typescript');
const { hash } = require('@node-rs/argon2');

function schemaDb() {
  const filename = path.resolve(__dirname, '../lib/auth/db.ts');
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = module.paths;
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename);
  return mod.exports.getDb();
}

async function main() {
  const dataDir = path.resolve(process.cwd(), 'data');
  const credentialFile = path.join(dataDir, 'bootstrap-admin.json');
  const email = (process.env.BOTMED_ADMIN_EMAIL || 'admin@localhost.test').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('BOTMED_ADMIN_EMAIL is invalid.');
  const configuredPassword = process.env.BOTMED_ADMIN_PASSWORD;
  if (configuredPassword && configuredPassword.length < 12) throw new Error('BOTMED_ADMIN_PASSWORD must have at least 12 characters.');
  const catalog = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../data/bootstrap-catalog.json'), 'utf8'));
  const db = schemaDb();
  try {
    db.transaction(() => {
      for (const table of ['tenants','roles','permissions','role_permissions','specialties','doctors','services']) {
        for (const row of catalog[table]) {
          const columns = Object.keys(row);
          db.prepare(`INSERT OR IGNORE INTO ${table} (${columns.join(',')}) VALUES (${columns.map(()=>'?').join(',')})`).run(...columns.map(column=>row[column]));
        }
      }
    })();
    const existingAdmin = db.prepare("SELECT u.id FROM users u JOIN user_roles ur ON ur.user_id=u.id JOIN roles r ON r.id=ur.role_id WHERE r.code='super_admin' LIMIT 1").get();
    if (!existingAdmin) {
      if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) throw new Error('Bootstrap email belongs to an existing non-admin account. Choose another BOTMED_ADMIN_EMAIL; no account was promoted.');
      // Save once before creating the account so a filesystem failure cannot hide its password.
      // A retry after interrupted initialization reuses this credential instead of overwriting it.
      let credentials;
      if (fs.existsSync(credentialFile)) {
        credentials = JSON.parse(fs.readFileSync(credentialFile,'utf8'));
        if (credentials.email !== email || typeof credentials.password !== 'string' || credentials.password.length < 12) throw new Error('Existing bootstrap-admin.json does not match the requested account. Inspect it before retrying.');
      } else {
        credentials = {email,password:configuredPassword || crypto.randomBytes(24).toString('base64url')};
        fs.writeFileSync(credentialFile, JSON.stringify(credentials,null,2)+'\n', {flag:'wx',mode:0o600});
      }
      const passwordHash = await hash(credentials.password,{memoryCost:19456,timeCost:2,outputLen:32,parallelism:1});
      const id=crypto.randomUUID(), now=Math.floor(Date.now()/1000);
      db.transaction(() => {
        const role=db.prepare("SELECT id FROM roles WHERE code='super_admin'").get();
        db.prepare('INSERT INTO users(id,email,password_hash,display_name,is_verified,tenant_id,status,created_at,updated_at) VALUES (?,?,?,?,1,?,?,?,?)').run(id,email,passwordHash,'Quản trị hệ thống','yg-clinic-hn','active',now,now);
        db.prepare('INSERT INTO user_roles(user_id,role_id,tenant_id,assigned_at) VALUES (?,?,?,?)').run(id,role.id,'yg-clinic-hn',now);
      })();
      console.log('Created local administrator. Credentials: '+credentialFile);
    } else {
      console.log('Existing administrator preserved; password and roles unchanged.');
    }
    console.log('Clinic catalog ready: '+db.prepare('SELECT COUNT(*) AS n FROM doctors').get().n+' doctors.');
  } finally { db.close(); }
}
module.exports = { main };
if (require.main === module) main().catch(error=>{console.error(error.message);process.exitCode=1;});
