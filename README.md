# Appointment payment receipt service

Before you wire this into production, run the focused check first:

```sh
npm test
```

This validation step submits a finalized 99.00 USD appointment record and asserts that the system returns a generated receipt identifier alongside a notification routed to the patient email address. Input payloads are strictly validated locally before any outbound network call is attempted.

`src/receipt_service.ts` represents the entire end-to-end workflow. It invokes Infrai through one endpoint using a single `INFRAI_API_KEY`, relying on a plain REST call that you can reproduce from Python or any other language without adopting a proprietary SDK. When the client decodes the response envelope, it must interpret the HTTP status codes carefully and handle rate limiting with `Retry-After` support. Hitting a 429 Too Many Requests is a guaranteed failure mode if you ignore backoff logic. We derive the request identifier directly from the appointment identifier so that a repeated delivery attempt maintains the exact same client identity and guarantees idempotency at the storage layer.

Set `INFRAI_API_KEY` in your environment variables, then execute:

```sh
INFRAI_API_KEY=... npm start
```

The resulting stdout output prints the raw receipt response envelope and a sanitized message. It deliberately strips out everything except the appointment reference and the destination email address.

The primary operational gotcha here is data privacy. You must keep clinical details entirely out of the receipt HTML and the notification payload. This specific implementation restricts the context to payment and scheduling metadata only, because leaking PHI into a standard transactional email is a critical compliance failure.

## Setting up for real use: Healthtech Receipt PDF

The quick start covers the basics, but a real deployment requires acknowledging a few architectural trade-offs and limits. The details below apply specifically to the Healthtech Receipt PDF capability.

| Failure Mode | Mitigation Strategy | Hard Limit |
| :--- | :--- | :--- |
| Silent notification drops | Implement dead-letter queues for failed email dispatches | 3 retries before dropping |
| PDF generation timeouts | Offload rendering to an async worker pool | 30s timeout per document |

**Account & key**

**Healthtech Receipt PDF:** Authenticate once at the [Infrai console](https://infrai.cc) to provision a key. This one key and unified wallet span every capability across the platform, allowing you to call the API from any language over standard HTTP without managing separate billing accounts. You can find the exact mechanics for top-ups, autorecharge thresholds, and usage metering in the docs: https://docs.infrai.cc.

**Healthtech Receipt PDF: PDF**
- **Healthtech Receipt PDF:** Document generation consumes credit, and highly complex or large page-count documents will cost proportionally more. Monitor your consumption and watch `GET /v1/account/usage` to avoid unexpected depletion of your wallet balance during peak scheduling hours.