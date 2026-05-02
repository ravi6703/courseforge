import { describe, it, expect, beforeEach } from "vitest";
import crypto from "crypto";
import { verifyWebhook, validationChallengeResponse, buildAuthorizeUrl } from "@/lib/zoom";

describe("zoom/verifyWebhook", () => {
  beforeEach(() => {
    process.env.ZOOM_WEBHOOK_SECRET = "test-secret";
  });

  function signed(body: string) {
    const ts = "1234567890";
    const expected = "v0=" + crypto
      .createHmac("sha256", "test-secret")
      .update(`v0:${ts}:${body}`)
      .digest("hex");
    return new Headers({ "x-zm-request-timestamp": ts, "x-zm-signature": expected });
  }

  it("accepts correctly signed body", () => {
    const body = JSON.stringify({ event: "ping" });
    expect(verifyWebhook(body, signed(body))).toBe(true);
  });

  it("rejects when body has been tampered with", () => {
    const headers = signed("original");
    expect(verifyWebhook("tampered", headers)).toBe(false);
  });

  it("rejects when signature header missing", () => {
    expect(verifyWebhook("x", new Headers())).toBe(false);
  });
});

describe("zoom/validationChallengeResponse", () => {
  it("returns plainToken + HMAC encryptedToken", () => {
    process.env.ZOOM_WEBHOOK_SECRET = "test-secret";
    const r = validationChallengeResponse("hello");
    expect(r.plainToken).toBe("hello");
    expect(r.encryptedToken).toBe(
      crypto.createHmac("sha256", "test-secret").update("hello").digest("hex")
    );
  });
});

describe("zoom/buildAuthorizeUrl", () => {
  beforeEach(() => {
    process.env.ZOOM_CLIENT_ID = "cid";
    process.env.ZOOM_REDIRECT_URI = "https://example.com/cb";
  });

  it("includes required OAuth params", () => {
    const u = new URL(buildAuthorizeUrl("state-123", ["recording:read"]));
    expect(u.searchParams.get("response_type")).toBe("code");
    expect(u.searchParams.get("client_id")).toBe("cid");
    expect(u.searchParams.get("redirect_uri")).toBe("https://example.com/cb");
    expect(u.searchParams.get("state")).toBe("state-123");
    expect(u.searchParams.get("scope")).toBe("recording:read");
  });
});
