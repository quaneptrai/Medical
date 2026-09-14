const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const Database = require('better-sqlite3');
const { verify } = require('@node-rs/argon2');
const { main } = require('./bootstrap.cjs');

test('fresh bootstrap creates a usable admin and preserves edits/accounts on rerun', async () => {
  const previousCwd = process.cwd();
  const previousEmail = process.env.BOTMED_ADMIN_EMAIL;
  const previousPassword = process.env.BOTMED_ADMIN_PASSWORD;
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'botmedical-bootstrap-test-'));
  process.env.BOTMED_ADMIN_EMAIL='bootstrap@example.test';
  process.env.BOTMED_ADMIN_PASSWORD=crypto.randomBytes(24).toString('base64url');
  process.chdir(dir);
  try {
    await main();
    const credentials=JSON.parse(fs.readFileSync('data/bootstrap-admin.json','utf8'));
    const db=new Database('data/auth.db');
    const admin=db.prepare('SELECT * FROM users WHERE email=?').get(credentials.email);
    assert.ok(await verify(admin.password_hash,credentials.password));
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM doctors').get().n,40);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM appointments').get().n,0);
    const doctor=db.prepare('SELECT id FROM doctors LIMIT 1').get();
    db.prepare('UPDATE doctors SET name=? WHERE id=?').run('Edited after setup',doctor.id);
    db.close();
    const before=fs.readFileSync('data/bootstrap-admin.json','utf8');
    process.env.BOTMED_ADMIN_PASSWORD=crypto.randomBytes(24).toString('base64url');
    await main();
    const check=new Database('data/auth.db');
    assert.equal(check.prepare('SELECT password_hash FROM users WHERE id=?').get(admin.id).password_hash,admin.password_hash);
    assert.equal(check.prepare('SELECT COUNT(*) AS n FROM users').get().n,1);
    assert.equal(check.prepare('SELECT name FROM doctors WHERE id=?').get(doctor.id).name,'Edited after setup');
    assert.equal(check.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
    assert.deepEqual(check.prepare('PRAGMA foreign_key_check').all(),[]);
    check.close();
    assert.equal(fs.readFileSync('data/bootstrap-admin.json','utf8'),before);
  } finally {
    process.chdir(previousCwd);
    if(previousEmail===undefined)delete process.env.BOTMED_ADMIN_EMAIL;else process.env.BOTMED_ADMIN_EMAIL=previousEmail;
    if(previousPassword===undefined)delete process.env.BOTMED_ADMIN_PASSWORD;else process.env.BOTMED_ADMIN_PASSWORD=previousPassword;
    fs.rmSync(dir,{recursive:true,force:true});
  }
});
