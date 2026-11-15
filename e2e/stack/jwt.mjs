// Mints HS256 anon/service JWTs for the local test stack.
import crypto from "node:crypto";
const secret = process.argv[2];
const role = process.argv[3];
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const header = b64({ alg: "HS256", typ: "JWT" });
const payload = b64({ role, iss: "supabase-local", iat: 1700000000, exp: 2000000000 });
const sig = crypto.createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
console.log(`${header}.${payload}.${sig}`);
