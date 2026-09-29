import { generateKeyPairSync } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const projectRoot = process.cwd();
const envPath = path.join(projectRoot, ".env.local");

if (!fs.existsSync(envPath)) {
  console.error("Missing .env.local.");
  console.error(
    "Run `npx convex dev` once first so Convex creates the local deployment.",
  );
  process.exit(1);
}

function setConvexEnv(name, value) {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";

  const tempFile = path.join(
    os.tmpdir(),
    `convex-${name}-${process.pid}.txt`,
  );

  try {
    fs.writeFileSync(tempFile, value, "utf8");

    console.log(`Setting ${name}...`);

    const result = spawnSync(
      command,
      ["convex", "env", "set", name, "--from-file", tempFile],
      {
        cwd: projectRoot,
        stdio: "inherit",
        shell: true,
      },
    );

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      throw new Error(
        `Convex CLI exited with code ${result.status} while setting ${name}.`,
      );
    }
  } finally {
    try {
      fs.unlinkSync(tempFile);
    } catch {
      // Ignore cleanup errors.
    }
  }
}

// Generate a fresh RSA key pair for local Convex Auth.
const { privateKey, publicKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicExponent: 0x10001,
});

const privatePem = privateKey.export({
  type: "pkcs8",
  format: "pem",
});

const publicJwk = publicKey.export({
  format: "jwk",
});

const jwks = JSON.stringify({
  keys: [
    {
      ...publicJwk,
      use: "sig",
      alg: "RS256",
    },
  ],
});

console.log("");
console.log("Configuring local Convex Auth keys...");
console.log("");

setConvexEnv("JWT_PRIVATE_KEY", privatePem);
setConvexEnv("JWKS", jwks);
setConvexEnv("SITE_URL", "http://localhost:5173");

console.log("");
console.log("========================================");
console.log(" Local Convex Auth is configured");
console.log("========================================");
console.log("");
console.log("JWT_PRIVATE_KEY: configured");
console.log("JWKS: configured");
console.log("SITE_URL: http://localhost:5173");
console.log("");
console.log("Next steps:");
console.log("  1. Run: npx convex dev");
console.log("  2. In another terminal run: npm run dev");
console.log("  3. Open: http://localhost:5173");
console.log("");