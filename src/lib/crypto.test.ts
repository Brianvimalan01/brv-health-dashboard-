import { describe, expect, it } from "vitest";
import { decryptJson, encryptJson, WrongPassphraseError } from "./crypto";

describe("encryptJson / decryptJson", () => {
  it("round-trips with the right passphrase and hides the content", async () => {
    const env = await encryptJson({ kcal: 2650 }, "correct horse", 1000);
    expect(env.ciphertext).not.toContain("2650");
    expect(await decryptJson(env, "correct horse")).toEqual({ kcal: 2650 });
  });

  it("rejects the wrong passphrase", async () => {
    const env = await encryptJson({ kcal: 2650 }, "correct horse", 1000);
    await expect(decryptJson(env, "wrong")).rejects.toBeInstanceOf(WrongPassphraseError);
  });

  it("uses a fresh salt and IV each time", async () => {
    const a = await encryptJson({}, "p", 1000);
    const b = await encryptJson({}, "p", 1000);
    expect(a.salt).not.toBe(b.salt);
    expect(a.iv).not.toBe(b.iv);
  });
});
