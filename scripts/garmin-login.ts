// One-time sign-in to Garmin from your own computer, for when Garmin blocks
// sign-ins from GitHub's servers. Prints session tokens to save as the
// GARMIN_TOKENS repository secret. Run:
//
//   GARMIN_EMAIL=you@example.com GARMIN_PASSWORD='...' npm run garmin-login
//
// The tokens let the nightly job read your Garmin data without your password
// for about a year. Treat them like a password: paste them only into GitHub's
// secret form, and delete garmin-tokens.json afterwards.

import { writeFileSync } from "node:fs";
import { GarminConnect } from "garmin-connect";

async function main() {
  const username = process.env.GARMIN_EMAIL;
  const password = process.env.GARMIN_PASSWORD;
  if (!username || !password) throw new Error("Set GARMIN_EMAIL and GARMIN_PASSWORD");
  const client = new GarminConnect({ username, password });
  await client.login();
  await client.getUserProfile();
  writeFileSync("garmin-tokens.json", JSON.stringify(client.exportToken()), { mode: 0o600 });
  console.log("Signed in. Copy the contents of garmin-tokens.json into a GARMIN_TOKENS secret, then delete the file.");
}

main().catch((err) => {
  console.error(`Garmin sign-in failed: ${err instanceof Error ? err.message : "unknown error"}`);
  process.exit(1);
});
