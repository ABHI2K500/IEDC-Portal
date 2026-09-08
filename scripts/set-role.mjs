#!/usr/bin/env node
/**
 * Assign a portal role from the command line.
 *
 *   npm run db:set-role -- <email> <role>
 *   npm run db:set-role -- nodal.officer@sjcetpalai.ac.in nodal_officer
 *
 * Inside the portal, roles are assigned by the Nodal Officer from
 * /nodal/users → Role Assignment. This script exists for two cases that page
 * cannot cover:
 *
 *   1. Bootstrapping the FIRST Nodal Officer (only a Nodal Officer can appoint
 *      another one).
 *   2. Recovery, if every Nodal Officer account is lost.
 *
 * It mirrors PATCH /api/users/role exactly: it writes `users.role` and keeps the
 * staff whitelist in sync so the proxy never reverts the change.
 */

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const EXECOM_ROLES = [
  "ceo", "cto", "to", "cfo", "fo", "cco", "co", "cio", "io", "cmo",
  "mo", "coo", "oo", "cso", "so", "cvo", "vo", "cwit", "wit",
];
const VALID_ROLES = ["student", "faculty", "nodal_officer", ...EXECOM_ROLES];
const STAFF_EMAIL_DOMAIN = "sjcetpalai.ac.in";

function readDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  // Next.js loads .env.local ahead of .env — match that precedence.
  for (const file of [".env.local", ".env"]) {
    const full = path.join(ROOT, file);
    if (!existsSync(full)) continue;
    const match = readFileSync(full, "utf8").match(/^\s*DATABASE_URL\s*=\s*"?([^"\n]+)"?/m);
    if (match) return match[1].trim();
  }
  return null;
}

function fail(message) {
  console.error(`\n  ✗ ${message}\n`);
  process.exit(1);
}

const [email, role] = process.argv.slice(2);

if (!email || !role) {
  fail("Usage: npm run db:set-role -- <email> <role>\n" +
    `    Roles: ${VALID_ROLES.join(", ")}`);
}
if (!VALID_ROLES.includes(role)) {
  fail(`"${role}" is not a valid role.\n    Roles: ${VALID_ROLES.join(", ")}`);
}

const databaseUrl = readDatabaseUrl();
if (!databaseUrl) fail("DATABASE_URL not found in the environment, .env.local or .env");

const normalizedEmail = email.trim().toLowerCase();
const sql = postgres(databaseUrl, { prepare: false, onnotice: () => { } });

try {
  const [user] = await sql`
    SELECT id, name, email, role FROM users WHERE lower(email) = ${normalizedEmail}
  `;

  if (!user) {
    fail(`No portal account found for ${normalizedEmail}.\n` +
      "    The user must sign in with Google once before a role can be assigned.");
  }

  if (user.role === role) {
    console.log(`\n  • ${user.email} already holds the "${role}" role. Nothing to do.\n`);
    process.exit(0);
  }

  const previousRole = user.role;
  await sql`UPDATE users SET role = ${role}, updated_at = now() WHERE id = ${user.id}`;

  // The whitelist only drives auto-promotion for bare-domain staff accounts.
  if (user.email.split("@")[1] === STAFF_EMAIL_DOMAIN) {
    if (role === "student") {
      await sql`DELETE FROM allowed_staff_emails WHERE email = ${user.email}`;
    } else {
      await sql`
        INSERT INTO allowed_staff_emails (email, role)
        VALUES (${user.email}, ${role})
        ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role
      `;
    }
  }

  console.log(`\n  ✓ ${user.name || user.email}: ${previousRole} → ${role}`);
  console.log("    The new role applies on their next request (sign out and back in to be sure).\n");
} finally {
  await sql.end();
}