// One-time sign-in to Garmin from your own computer, for when Garmin blocks
// sign-ins from GitHub's servers. Run `npm run garmin-login`: it asks for your
// Garmin email and password (the password isn't shown or saved), signs in,
// and copies session tokens to the clipboard on macOS (otherwise it writes
// garmin-tokens.json). Paste them into a GARMIN_TOKENS repository secret.
//
// The tokens let the nightly job read your Garmin data without your password
// for about a year. Treat them like a password.

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import readline from "node:readline";
import { GarminConnect } from "garmin-connect";

function ask(question: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) {
    // Echo nothing while the password is typed.
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
      if (s.startsWith(question)) process.stdout.write(question);
    };
  }
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer.trim());
    }),
  );
}

async function main() {
  const username = process.env.GARMIN_EMAIL || (await ask("Garmin email: "));
  const password = process.env.GARMIN_PASSWORD || (await ask("Garmin password (hidden): ", true));
  const client = new GarminConnect({ username, password });
  await client.login();
  const { displayName } = await client.getUserProfile();
  const tokens = JSON.stringify(client.exportToken());

  if (process.platform === "darwin") {
    execFileSync("pbcopy", { input: tokens });
    console.log(`Signed in as ${displayName}. The token is on your clipboard:`);
    console.log("paste it into a new GitHub secret named GARMIN_TOKENS, then copy something else to clear it.");
  } else {
    writeFileSync("garmin-tokens.json", tokens, { mode: 0o600 });
    console.log(`Signed in as ${displayName}. Paste the contents of garmin-tokens.json into a GARMIN_TOKENS secret, then delete the file.`);
  }
}

main().catch((err) => {
  console.error(`Garmin sign-in failed: ${err instanceof Error ? err.message : "unknown error"}`);
  process.exit(1);
});
