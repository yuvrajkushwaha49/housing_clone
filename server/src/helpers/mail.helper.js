import nodemailer from 'nodemailer';
import config from '../config/index.js';
import { getPublicAppUrl } from './app-url.helper.js';
import logger from '../utils/logger.js';

let transporter;
let transporterMode = 'mock';

function isMailConfigured() {
  return Boolean(config.mail.host && config.mail.user && config.mail.pass);
}

function getTransporter() {
  if (transporter) return transporter;

  if (!isMailConfigured()) {
    transporterMode = 'mock';
    logger.warn(
      '[mail] SMTP not configured — emails are logged to console only. Set MAIL_HOST, MAIL_USER, and MAIL_PASS in .env'
    );
    transporter = {
      sendMail: async (options) => {
        logger.info(`[mail:dev] To=${options.to} Subject=${options.subject}`);
        logger.info(`[mail:dev] Verification/link text: ${options.text || '(see html in debug log)'}`);
        logger.debug(`[mail:dev] Body=${options.html || options.text}`);
        return { messageId: `dev-${Date.now()}` };
      },
    };
    return transporter;
  }

  transporterMode = 'smtp';
  transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.port === 465,
    auth: {
      user: config.mail.user,
      pass: config.mail.pass,
    },
  });

  return transporter;
}

export async function verifyMailTransport() {
  if (!isMailConfigured()) {
    return { ok: false, mode: 'mock', message: 'SMTP not configured' };
  }

  const transport = getTransporter();
  try {
    await transport.verify();
    logger.info(`[mail] SMTP ready (${config.mail.host}:${config.mail.port} as ${config.mail.user})`);
    return { ok: true, mode: 'smtp' };
  } catch (err) {
    logger.error(`[mail] SMTP verify failed: ${err.message}`);
    return { ok: false, mode: 'smtp', message: err.message };
  }
}

export async function sendMail({ to, subject, html, text }) {
  const transport = getTransporter();
  try {
    const result = await transport.sendMail({
      from: config.mail.from,
      to,
      subject,
      html,
      text,
    });
    if (transporterMode === 'smtp') {
      logger.info(`[mail] Sent to ${to} — ${subject} (${result.messageId})`);
    }
    return result;
  } catch (err) {
    logger.error(`[mail] Failed to send to ${to}: ${err.message}`);
    throw err;
  }
}

function verificationEmailHtml({ verifyUrl, expiresMinutes }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f6f5fa;font-family:Segoe UI,Trebuchet MS,sans-serif;color:#2d235f;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e4e0f0;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(145deg,#5d519b,#2d235f);padding:28px 32px;color:#ffffff;">
            <div style="font-size:22px;font-weight:700;">${config.appName}</div>
            <div style="font-size:14px;opacity:0.9;margin-top:4px;">Verify your email address</div>
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">Thanks for creating your account. Click the button below to verify your email and activate your profile.</p>
            <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#6b6490;">
              This link expires in <strong>${expiresMinutes} minutes</strong>. Open it on your phone or PC, then tap <strong>Verify my email</strong>.
            </p>
            <a href="${verifyUrl}" style="display:inline-block;background:#5d519b;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;">
              Verify email
            </a>
            <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#6b6490;word-break:break-all;">
              Or copy this link:<br><a href="${verifyUrl}" style="color:#5d519b;">${verifyUrl}</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendVerificationEmail(to, token, expiresMinutes = config.emailVerificationExpiresMinutes) {
  const base = getPublicAppUrl();
  const url = `${base}/verify-email?token=${encodeURIComponent(token)}`;
  logger.info(`[mail] Verification link → ${url}`);
  return sendMail({
    to,
    subject: `${config.appName} — Verify your email (${expiresMinutes} min)`,
    html: verificationEmailHtml({ verifyUrl: url, expiresMinutes }),
    text: `Verify your ${config.appName} email within ${expiresMinutes} minutes: ${url}`,
  });
}

export async function sendPasswordResetEmail(to, token) {
  const base = getPublicAppUrl();
  const url = `${base}/reset-password?token=${encodeURIComponent(token)}`;
  return sendMail({
    to,
    subject: `${config.appName} — Reset password`,
    html: `<p>Reset your password:</p><p><a href="${url}">Reset password</a></p>`,
    text: `Reset password: ${url}`,
  });
}

export async function sendOtpEmail(to, otp) {
  return sendMail({
    to,
    subject: `${config.appName} — Your login OTP`,
    html: `<p>Your OTP is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
    text: `Your OTP is ${otp}. It expires in 10 minutes.`,
  });
}
