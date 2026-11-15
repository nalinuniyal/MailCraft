import { describe, expect, it } from "vitest";
import { assertPublicUrl } from "@/lib/email/link-check";

describe("assertPublicUrl (SSRF guard)", () => {
  it.each([
    "http://127.0.0.1/admin",
    "http://localhost:3000",
    "http://10.0.0.5/",
    "http://192.168.1.1/",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]/",
    "http://172.16.0.1/",
    "ftp://example.com/file",
    "http://user:pass@example.com/",
    "http://example.com:8080/",
    "http://[::ffff:127.0.0.1]/",
  ])("rejects %s", async (url) => {
    await expect(assertPublicUrl(url)).rejects.toThrow();
  });

  it("accepts a public IP literal", async () => {
    await expect(assertPublicUrl("https://1.1.1.1/")).resolves.toBeInstanceOf(URL);
  });
});
