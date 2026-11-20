// Invio email tramite Resend (solo lato server).
export const EMAIL_FROM = "Dalla Prof <info@dallaprof.food>";
type Mail = { to: string; subject: string; html: string; text?: string };
export async function sendEmails(mails: Mail[]) {
  const lk = process.env["LOVABLE_API_KEY"]; const rk = process.env["RESEND_API_KEY"];
  if (!lk || !rk) throw new Error("Servizio email non configurato");
  let sent = 0;
  for (let i = 0; i < mails.length; i += 100) {
    const batch = mails.slice(i, i + 100).map((m) => ({ from: EMAIL_FROM, ...m }));
    const r = await fetch("https://connector-gateway.lovable.dev/resend/emails/batch", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${lk}`, "X-Connection-Api-Key": rk }, body: JSON.stringify(batch),
    });
    if (!r.ok) { const b = await r.text(); console.error(`Resend [${r.status}]: ${b}`); throw new Error(`Invio non riuscito (${r.status}): ${b.slice(0, 200)}`); }
    sent += batch.length;
  }
  return sent;
}
export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
