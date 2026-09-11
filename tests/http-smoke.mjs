import assert from "node:assert/strict";
const base = process.env.APP_URL || "http://localhost:3000";
const first = await fetch(`${base}/api/groups`);
assert.equal(first.status, 200);
assert.equal(first.headers.get("cache-control"), "no-store");
const body = await first.json();
assert.ok(["demo", "live"].includes(body.mode));
const cookie = first.headers.get("set-cookie");
assert.ok(cookie?.includes("HttpOnly"));
assert.ok(cookie?.includes("SameSite=lax"));
const second = await fetch(`${base}/api/groups`, {
  headers: { Cookie: cookie.split(";")[0] },
});
assert.equal((await second.json()).memberId, body.memberId);
const crossOrigin = await fetch(`${base}/api/groups`, {
  method: "POST",
  headers: {
    Origin: "https://unrelated.example",
    "Content-Type": "application/json",
  },
  body: "{}",
});
assert.equal(crossOrigin.status, 403);
const unsupported = await fetch(`${base}/api/groups`, { method: "DELETE" });
assert.equal(unsupported.status, 405);
console.log(
  `HTTP checks passed: ${body.mode} mode, stable HttpOnly identity, no-store, cross-origin rejection, unsupported method rejection.`,
);
