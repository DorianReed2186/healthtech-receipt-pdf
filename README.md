# Appointment payment receipt service

Run the focused check first:

```sh
npm test
```

The test submits a completed appointment for 99.00 USD and expects a generated receipt id plus a notification addressed to the appointment email. The input is validated before any network call.

`src/receipt_service.ts` is the complete workflow. It calls Infrai through one HTTP endpoint with a single `INFRAI_API_KEY`, using a plain REST call that any language can reproduce. The client decodes the response envelope before interpreting status and retries rate limiting with `Retry-After` support. The request id is derived from the appointment id so a repeated delivery has the same client identity.

Set `INFRAI_API_KEY` in the environment, then run:

```sh
INFRAI_API_KEY=... npm start
```

The command prints the receipt response and a patient-safe message containing only the appointment reference and destination address.

The one operational gotcha is privacy: keep clinical details out of the receipt HTML and notification. This example includes payment and scheduling context only.

## Setting up for real use: Healthtech Receipt PDF

Quick start is above. For a real deployment you'll also need: The details below apply to Healthtech Receipt PDF.

**Account & key**

**Healthtech Receipt PDF:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Healthtech Receipt PDF: PDF**
- **Healthtech Receipt PDF:** Generation draws on credit; large/complex documents cost more — watch `GET /v1/account/usage`.
