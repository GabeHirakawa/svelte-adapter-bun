import { describe, expect, test } from "bun:test";
import { clientAddress } from "./src/client-address.ts";

const xff = (...addresses: string[]) =>
  new Request("http://localhost/", {
    headers: { "x-forwarded-for": addresses.join(", ") },
  });

describe("clientAddress", () => {
  test("uses requestIP when ADDRESS_HEADER is unset", () => {
    expect(
      clientAddress({
        request: new Request("http://localhost/"),
        addressHeader: "",
        xffDepth: 1,
        requestIP: "203.0.113.10",
      }),
    ).toBe("203.0.113.10");
  });

  test("returns empty when ADDRESS_HEADER is unset and requestIP is missing (unix socket)", () => {
    expect(
      clientAddress({
        request: new Request("http://localhost/"),
        addressHeader: "",
        xffDepth: 1,
      }),
    ).toBe("");
  });

  test("reads X-Forwarded-For from the right by XFF_DEPTH", () => {
    const request = xff("spoofed", "client", "proxy1", "proxy2");
    expect(
      clientAddress({ request, addressHeader: "x-forwarded-for", xffDepth: 3 }),
    ).toBe("client");
    expect(
      clientAddress({ request, addressHeader: "x-forwarded-for", xffDepth: 1 }),
    ).toBe("proxy2");
  });

  test("returns a non-XFF ADDRESS_HEADER value as-is", () => {
    const request = new Request("http://localhost/", {
      headers: { "true-client-ip": "198.51.100.7" },
    });
    expect(
      clientAddress({ request, addressHeader: "true-client-ip", xffDepth: 1 }),
    ).toBe("198.51.100.7");
  });

  test("throws when ADDRESS_HEADER is set but absent", () => {
    expect(() =>
      clientAddress({
        request: new Request("http://localhost/"),
        addressHeader: "x-forwarded-for",
        xffDepth: 1,
      }),
    ).toThrow(/absent from request/);
  });

  test("throws when XFF_DEPTH is deeper than the address list", () => {
    expect(() =>
      clientAddress({
        request: xff("client", "proxy"),
        addressHeader: "x-forwarded-for",
        xffDepth: 3,
      }),
    ).toThrow(/XFF_DEPTH is 3, but only found 2 addresses/);
  });

  test("throws when XFF_DEPTH is less than 1", () => {
    expect(() =>
      clientAddress({
        request: xff("client"),
        addressHeader: "x-forwarded-for",
        xffDepth: 0,
      }),
    ).toThrow(/positive integer/);
  });
});
