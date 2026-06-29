import { describe, expect, it, afterEach } from "vitest";
import { getSiteUrl } from "@/lib/site-url";

describe("getSiteUrl", () => {
  const original = {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    VERCEL_URL: process.env.VERCEL_URL,
  };

  afterEach(() => {
    process.env.NEXTAUTH_URL = original.NEXTAUTH_URL;
    process.env.NEXT_PUBLIC_SITE_URL = original.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_URL = original.VERCEL_URL;
  });

  it("prefers NEXTAUTH_URL without trailing slash", () => {
    process.env.NEXTAUTH_URL = "https://auto-centre.vercel.app/";
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_URL;
    expect(getSiteUrl()).toBe("https://auto-centre.vercel.app");
  });

  it("falls back to VERCEL_URL", () => {
    delete process.env.NEXTAUTH_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    process.env.VERCEL_URL = "autogalaxy.vercel.app";
    expect(getSiteUrl()).toBe("https://autogalaxy.vercel.app");
  });

  it("defaults to localhost", () => {
    delete process.env.NEXTAUTH_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.VERCEL_URL;
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });
});
