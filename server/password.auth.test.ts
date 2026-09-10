import { beforeEach, describe, expect, it, vi } from "vitest";
import argon2 from "argon2";

const dbMock = vi.hoisted(() => ({
  createPasswordUser: vi.fn(),
  getPasswordCredentialByUsername: vi.fn(),
  getUserByIdentityKey: vi.fn(),
  updatePasswordLogin: vi.fn(),
}));

vi.mock("./db", () => dbMock);

import {
  authenticatePassword,
  normalizeUsername,
  registerPasswordAccount,
} from "./services/passwordAuthService";
import { clearCredentialRateLimits } from "./_core/rateLimit";

describe("password authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearCredentialRateLimits();
  });

  it("normalizes valid usernames and rejects reserved or invalid names", async () => {
    expect(normalizeUsername("  Farmer_01 ")).toBe("farmer_01");
    expect(() => normalizeUsername("admin")).toThrow("reserved");
    await expect(registerPasswordAccount({ username: "two words", password: "a secure password", confirmPassword: "a secure password" }, "invalid-username-test")).rejects.toThrow();
  });

  it("creates an Argon2id hash and never stores the plaintext", async () => {
    const user = { id: 1, identityKey: "user_test", openId: null, role: "user" };
    dbMock.createPasswordUser.mockResolvedValue(user);
    const created = await registerPasswordAccount({ username: "Asha_01", password: "a secure password", confirmPassword: "a secure password" }, "register-test");
    expect(created).toEqual(user);
    const hash = dbMock.createPasswordUser.mock.calls[0][0].passwordHash as string;
    expect(hash).not.toContain("a secure password");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    await expect(argon2.verify(hash, "a secure password")).resolves.toBe(true);
  });

  it("rejects mismatched confirmation and weak common passwords", async () => {
    await expect(registerPasswordAccount({ username: "Asha_02", password: "long enough password", confirmPassword: "different password" }, "mismatch-test")).rejects.toThrow("match");
    await expect(registerPasswordAccount({ username: "Asha_03", password: "password123", confirmPassword: "password123" }, "weak-test")).rejects.toThrow("common");
    expect(dbMock.createPasswordUser).not.toHaveBeenCalled();
  });

  it("authenticates valid credentials and updates login activity", async () => {
    const hash = await argon2.hash("a secure password", { type: argon2.argon2id });
    dbMock.getPasswordCredentialByUsername.mockResolvedValue({ id: 3, identityKey: "user_test", passwordHash: hash, disabledAt: null });
    dbMock.getUserByIdentityKey.mockResolvedValue({ id: 1, identityKey: "user_test", openId: null, role: "farmer" });
    await expect(authenticatePassword({ username: "Asha_01", password: "a secure password" }, "login-test")).resolves.toMatchObject({ identityKey: "user_test" });
    expect(dbMock.updatePasswordLogin).toHaveBeenCalledWith(3);
  });

  it("uses the same generic failure for missing and incorrect credentials", async () => {
    dbMock.getPasswordCredentialByUsername.mockResolvedValue(undefined);
    await expect(authenticatePassword({ username: "Missing_01", password: "wrong password" }, "missing-test")).rejects.toThrow("Invalid username or password.");
    const hash = await argon2.hash("different password", { type: argon2.argon2id });
    dbMock.getPasswordCredentialByUsername.mockResolvedValue({ id: 4, identityKey: "user_test", passwordHash: hash, disabledAt: null });
    await expect(authenticatePassword({ username: "Asha_01", password: "wrong password" }, "wrong-test")).rejects.toThrow("Invalid username or password.");
  });

  it("rate limits repeated credential attempts", async () => {
    dbMock.getPasswordCredentialByUsername.mockResolvedValue(undefined);
    for (let index = 0; index < 10; index += 1) {
      await expect(authenticatePassword({ username: "Rate_01", password: "wrong password" }, "rate-test")).rejects.toThrow("Invalid username or password.");
    }
    await expect(authenticatePassword({ username: "Rate_01", password: "wrong password" }, "rate-test")).rejects.toThrow("Too many authentication attempts");
  });
});
