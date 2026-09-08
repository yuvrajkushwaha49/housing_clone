import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../server/.env') });

async function seed() {
  const dbName = process.env.DB_NAME || 'hous_db';
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: dbName,
    multipleStatements: true,
  });

  const seedersDir = path.resolve(__dirname, '../seeders');
  const files = fs
    .readdirSync(seedersDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(seedersDir, file), 'utf8');
    console.log(`seed  ${file}`);
    await connection.query(sql);
  }

  const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@hous.local';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin@12345';
  const [existing] = await connection.query(
    'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1',
    [email]
  );

  if (!existing.length) {
    const [roles] = await connection.query(
      "SELECT id FROM roles WHERE code = 'SUPER_ADMIN' AND deleted_at IS NULL LIMIT 1"
    );
    if (!roles.length) {
      throw new Error('SUPER_ADMIN role missing. Run roles seeder first.');
    }

    const roleId = roles[0].id;
    const passwordHash = await bcrypt.hash(password, 12);
    const uuid = crypto.randomUUID();

    const [result] = await connection.query(
      `INSERT INTO users
        (uuid, email, password_hash, first_name, last_name, primary_role_id, email_verified_at, status)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), 'active')`,
      [uuid, email, passwordHash, 'Super', 'Admin', roleId]
    );

    await connection.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
      [result.insertId, roleId]
    );

    console.log(`Created Super Admin: ${email}`);
  } else {
    console.log(`Super Admin already exists: ${email}`);
  }

  await connection.query(
    `INSERT INTO settings (\`key\`, \`value\`, group_name)
     VALUES ('app_name', 'Workians', 'general'),
            ('app_url', ?, 'general'),
            ('support_email', ?, 'general'),
            ('support_phone', '+91-1800-000-000', 'general')
     ON DUPLICATE KEY UPDATE \`value\` = VALUES(\`value\`)`,
    [process.env.APP_URL || 'http://localhost:5173', process.env.MAIL_FROM || email]
  );

  const demoUsers = [
    { email: 'admin@hous.local', role: 'ADMIN', first: 'Platform', last: 'Admin' },
    { email: 'builder@hous.local', role: 'BUILDER', first: 'Bharat', last: 'Builder' },
    { email: 'agent@hous.local', role: 'AGENT', first: 'Anika', last: 'Agent' },
    { email: 'owner@hous.local', role: 'OWNER', first: 'Om', last: 'Owner' },
    { email: 'buyer@hous.local', role: 'BUYER', first: 'Bina', last: 'Buyer' },
    { email: 'support@hous.local', role: 'SUPPORT', first: 'Sam', last: 'Support' },
    { email: 'cms@hous.local', role: 'CMS_MANAGER', first: 'Cara', last: 'CMS' },
  ];
  const demoPassword = process.env.DEMO_USER_PASSWORD || 'Demo@12345';
  const demoHash = await bcrypt.hash(demoPassword, 12);

  for (const demo of demoUsers) {
    const [exists] = await connection.query(
      'SELECT id FROM users WHERE email = ? AND deleted_at IS NULL LIMIT 1',
      [demo.email]
    );
    if (exists.length) {
      console.log(`Demo user exists: ${demo.email}`);
      continue;
    }
    const [roles] = await connection.query(
      'SELECT id FROM roles WHERE code = ? AND deleted_at IS NULL LIMIT 1',
      [demo.role]
    );
    if (!roles.length) {
      console.warn(`Role missing for demo user ${demo.email}: ${demo.role}`);
      continue;
    }
    const uuid = crypto.randomUUID();
    const [result] = await connection.query(
      `INSERT INTO users
        (uuid, email, password_hash, first_name, last_name, primary_role_id, email_verified_at, status)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), 'active')`,
      [uuid, demo.email, demoHash, demo.first, demo.last, roles[0].id]
    );
    await connection.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', [
      result.insertId,
      roles[0].id,
    ]);
    console.log(`Created demo ${demo.role}: ${demo.email} / ${demoPassword}`);
  }

  await connection.end();
  console.log('Seeding complete.');
}

seed().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
