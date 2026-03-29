import nodemailer from 'nodemailer';

let transporterPromise = null;

function buildMailerConfig() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = String(process.env.SMTP_SECURE || 'true') === 'true';
  const user = process.env.GOOGLE_WORKSPACE_EMAIL || process.env.SMTP_USER;
  const pass = process.env.GOOGLE_WORKSPACE_APP_PASSWORD || process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || process.env.GOOGLE_WORKSPACE_FROM || user;

  if (!user || !pass || !from) {
    return null;
  }

  return {
    transport: { host, port, secure, auth: { user, pass } },
    from,
  };
}

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      const config = buildMailerConfig();
      if (!config) return null;
      const transporter = nodemailer.createTransport(config.transport);
      await transporter.verify();
      return { transporter, from: config.from };
    })();
  }
  return transporterPromise;
}

export async function sendAuthEmail({ to, subject, heading, intro, code, detail }) {
  const setup = await getTransporter();

  if (!setup) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email delivery is not configured.');
    }
    console.info(`[auth-email] ${subject} -> ${to} | code: ${code}`);
    return;
  }

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;background:#f4f5f8;color:#152c4a;padding:32px;">
      <div style="max-width:560px;margin:0 auto;background:#fafbfd;border:1px solid rgba(21,44,74,.1);padding:32px;border-radius:10px;">
        <div style="font-family:'Playfair Display',Georgia,serif;font-size:28px;letter-spacing:-0.02em;margin-bottom:18px;">Delphi Markets</div>
        <p style="margin:0 0 10px;font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#6b7380;">Account security</p>
        <h1 style="font-family:'Playfair Display',Georgia,serif;font-size:32px;line-height:1.08;margin:0 0 16px;">${heading}</h1>
        <p style="font-size:16px;line-height:1.7;margin:0 0 20px;color:#5c6578;">${intro}</p>
        <div style="font-size:34px;letter-spacing:.28em;font-weight:600;padding:18px 22px;border:1px solid rgba(21,44,74,.14);border-radius:8px;text-align:center;margin:0 0 18px;">
          ${code}
        </div>
        <p style="font-size:14px;line-height:1.7;color:#6b7380;margin:0;">${detail}</p>
      </div>
    </div>
  `;

  const text = `${heading}\n\n${intro}\n\nVerification code: ${code}\n\n${detail}`;

  await setup.transporter.sendMail({
    from: setup.from,
    to,
    subject,
    text,
    html,
  });
}
