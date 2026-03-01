// api/_lib/mailer.js
// Envoi d'emails transactionnels via Resend.
// Documentation : https://resend.com/docs
//
// Variables d'environnement requises :
//   RESEND_API_KEY  → clé API Resend
//   APP_URL         → https://nfbo.vercel.app
//   MAIL_FROM       → ex: NFBO <noreply@tondomaine.com>
//                     Sans domaine propre, utiliser : onboarding@resend.dev

const { Resend } = require('resend');

const resend  = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.APP_URL  || 'https://nfbo.vercel.app';
const FROM    = process.env.MAIL_FROM || 'NBFO <onboarding@resend.dev>';

// ─── Template HTML de base ────────────────────────────────────────────────────
function baseTemplate({ title, body, ctaUrl, ctaLabel }) {
  return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8"/>
      <meta name="viewport" content="width=device-width,initial-scale=1"/>
      <title>${title}</title>
    </head>
    <body style="margin:0;padding:0;background:#0f1f0f;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding:40px 16px;">
            <table width="100%" style="max-width:480px;background:#1e2d1e;border-radius:16px;overflow:hidden;">

              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#2d5a2d,#1a3a1a);padding:32px;text-align:center;">
                  <div style="font-size:48px;margin-bottom:8px;">📦</div>
                  <h1 style="margin:0;color:#4caf50;font-size:24px;font-weight:800;">NFBO</h1>
                  <p style="margin:4px 0 0;color:#a5d6a7;font-size:13px;">
                    Gestion Coopérative Agricole
                  </p>
                </td>
              </tr>

              <!-- Contenu -->
              <tr>
                <td style="padding:32px;">
                  <h2 style="margin:0 0 16px;color:#ffffff;font-size:18px;">${title}</h2>
                  <div style="color:#b0bfb0;font-size:14px;line-height:1.7;">
                    ${body}
                  </div>

                  ${ctaUrl ? `
                  <div style="text-align:center;margin:28px 0 8px;">
                    <a href="${ctaUrl}"
                       style="display:inline-block;padding:14px 32px;
                              background:linear-gradient(135deg,#4caf50,#2e7d32);
                              color:white;text-decoration:none;border-radius:10px;
                              font-weight:700;font-size:15px;">
                      ${ctaLabel || 'Continuer'}
                    </a>
                  </div>
                  <p style="text-align:center;color:#666;font-size:11px;margin-top:12px;">
                    Lien valable 8 heures. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
                  </p>
                  ` : ''}
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding:16px 32px;border-top:1px solid #2a3a2a;text-align:center;">
                  <p style="margin:0;color:#555;font-size:11px;">
                    © ${new Date().getFullYear()} NBFO — Gestion Coopérative •
                    <a href="${APP_URL}" style="color:#4caf50;text-decoration:none;">
                      ${APP_URL.replace('https://','')}
                    </a>
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// ─── Email de confirmation d'adresse ─────────────────────────────────────────
async function sendConfirmationEmail(email, prenom, confirmUrl) {
  const html = baseTemplate({
    title: `Confirmez votre adresse email`,
    body: `
      <p>Bonjour <strong style="color:#fff;">${prenom}</strong>,</p>
      <p>
        Votre compte NFBO a bien été créé. Pour activer votre adresse email
        et finaliser votre inscription, cliquez sur le bouton ci-dessous.
      </p>
      <p>
        Une fois votre email confirmé, un administrateur activera votre compte
        avant votre première connexion.
      </p>
    `,
    ctaUrl:   confirmUrl,
    ctaLabel: '✅ Confirmer mon email',
  });

  const { data, error } = await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: '📦 NFBO — Confirmez votre adresse email',
    html,
  });

  if (error) throw new Error(`Erreur envoi email : ${error.message}`);
  return data;
}

// ─── Email de bienvenue après activation par admin ───────────────────────────
async function sendWelcomeEmail(email, prenom) {
  const html = baseTemplate({
    title: `Votre compte est activé !`,
    body: `
      <p>Bonjour <strong style="color:#fff;">${prenom}</strong>,</p>
      <p>
        Bonne nouvelle — votre compte NFBO a été activé par un administrateur.
        Vous pouvez maintenant vous connecter.
      </p>
    `,
    ctaUrl:   `${APP_URL}/login`,
    ctaLabel: '🔐 Se connecter',
  });

  const { data, error } = await resend.emails.send({
    from:    FROM,
    to:      email,
    subject: '📦 NFBO — Votre compte est activé',
    html,
  });

  if (error) throw new Error(`Erreur envoi email : ${error.message}`);
  return data;
}

module.exports = { sendConfirmationEmail, sendWelcomeEmail };