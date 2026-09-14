const Database = require('better-sqlite3');
const path = require('path');
const { hash } = require('@node-rs/argon2');

async function main(){
  if (!process.env.BOTMED_DOCTOR_PASSWORD || process.env.BOTMED_DOCTOR_PASSWORD.length < 12) throw new Error('Set BOTMED_DOCTOR_PASSWORD (at least 12 characters) before explicitly creating demo doctor accounts.');
  const db=new Database(path.join(process.cwd(),'data','auth.db')); db.pragma('foreign_keys=ON');
  const passwordHash=await hash(process.env.BOTMED_DOCTOR_PASSWORD,{memoryCost:19456,timeCost:2,outputLen:32,parallelism:1}); const now=Math.floor(Date.now()/1000);
  const doctors=db.prepare('SELECT id,name,user_id FROM doctors ORDER BY id').all();
  const insertUser=db.prepare(`INSERT OR IGNORE INTO users (id,email,password_hash,display_name,is_verified,tenant_id,status,created_at,updated_at) VALUES (?,?,?,?,1,'yg-clinic-hn','active',?,?)`);
  const assignRole=db.prepare(`INSERT OR IGNORE INTO user_roles (user_id,role_id,tenant_id,assigned_at) VALUES (?,'role-doctor','yg-clinic-hn',?)`);
  const link=db.prepare('UPDATE doctors SET user_id=? WHERE id=?');
  db.transaction(()=>{for(const doctor of doctors){const userId=`user-${doctor.id}`;const email=`${doctor.id.replace(/^doc-/,'')}@bacsi.quangthanh.demo`;insertUser.run(userId,email,passwordHash,doctor.name,now,now);assignRole.run(userId,now);link.run(userId,doctor.id);}})();
  console.log({doctorAccounts:db.prepare("SELECT COUNT(*) total FROM users u JOIN user_roles ur ON ur.user_id=u.id WHERE ur.role_id='role-doctor'").get().total,linkedDoctors:db.prepare('SELECT COUNT(*) total FROM doctors WHERE user_id IS NOT NULL').get().total});db.close();
}
main().catch(error=>{console.error(error);process.exit(1);});
