import { strict as assert } from "node:assert";
import { issueReceipt } from "./receipt_service";

const originalFetch = globalThis.fetch;
globalThis.fetch = (async (_input, init) => {
  const body = JSON.parse(String(init?.body));
  assert.equal(body.page_size, "A4");
  assert.equal(body.store, false);
  return new Response(JSON.stringify({ ok: true, data: { id: "pdf-1" } }), { status: 200, headers: { "content-type": "application/json" } });
}) as typeof fetch;
process.env.INFRAI_API_KEY = "test-key";
const result = await issueReceipt({ appointmentId: "apt-1", patientName: "Pat", patientEmail: "pat@example.org", clinicianName: "Dr K", amountCents: 9900, currency: "usd", occurredAt: "2026-01-15T09:30:00Z" });
assert.equal(result.receipt.data?.id, "pdf-1");
assert.match(result.notification, /apt-1/);
globalThis.fetch = originalFetch;
console.log("receipt decision test passed");
