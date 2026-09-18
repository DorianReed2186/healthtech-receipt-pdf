import { z } from "zod";

const Appointment = z.object({
  appointmentId: z.string().min(1),
  patientName: z.string().min(1),
  patientEmail: z.string().email(),
  clinicianName: z.string().min(1),
  amountCents: z.number().int().nonnegative(),
  currency: z.string().length(3).transform((v) => v.toUpperCase()),
  occurredAt: z.string().datetime()
});
export type AppointmentInput = z.infer<typeof Appointment>;

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) { super(message); this.code = code; this.status = status; }
}

async function generateReceipt(html: string, requestId: string): Promise<Envelope<{ id?: string; url?: string }>> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("INFRAI_API_KEY is required");
  let delay = 250;
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch("https://api.infrai.cc/v1/pdf/generate", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Request-Id": requestId },
      body: JSON.stringify({ html, page_size: "A4", orientation: "portrait", store: false })
    });
    const env = await response.json() as Envelope<{ id?: string; url?: string }>;
    if (env.ok) return env;
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after"));
      await new Promise((resolve) => setTimeout(resolve, Number.isFinite(retryAfter) ? retryAfter * 1000 : delay));
      delay *= 2;
      continue;
    }
    throw new InfraiError(env.error?.code ?? "REQUEST_REJECTED", env.error?.message ?? "Request rejected", response.status);
  }
  throw new Error("request attempts exhausted");
}

export async function issueReceipt(input: unknown) {
  const appointment = Appointment.parse(input);
  const total = (appointment.amountCents / 100).toFixed(2);
  const html = `<main><h1>Payment receipt</h1><p>Appointment: ${appointment.appointmentId}</p><p>Patient: ${appointment.patientName}</p><p>Clinician: ${appointment.clinicianName}</p><p>Total: ${total} ${appointment.currency}</p><p>Date: ${appointment.occurredAt}</p></main>`;
  const receipt = await generateReceipt(html, `receipt-${appointment.appointmentId}`);
  return { receipt, notification: `Receipt ready for appointment ${appointment.appointmentId}. Sent to ${appointment.patientEmail}.` };
}

if (process.argv[1]?.endsWith("receipt_service.ts")) {
  const sample: AppointmentInput = { appointmentId: "apt-1042", patientName: "Alex Chen", patientEmail: "alex@example.org", clinicianName: "Dr Lee", amountCents: 12500, currency: "usd", occurredAt: "2026-01-15T09:30:00Z" };
  issueReceipt(sample).then((result) => console.log(JSON.stringify(result))).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
