export interface RidebookEmailTemplateOptions {
  eyebrow: string;
  title: string;
  intro: string;
  bodyHtml: string;
  actionHref?: string;
  actionLabel?: string;
}

export function buildRidebookEmailHtml(options: RidebookEmailTemplateOptions): string {
  const action = options.actionHref && options.actionLabel
    ? `<tr><td style="padding:8px 0 8px"><a href="${escapeHtml(options.actionHref)}" style="display:inline-block;padding:13px 18px;border-radius:10px;background:#277a6a;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px">${escapeHtml(options.actionLabel)}</a></td></tr>`
    : "";

  return `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:0;background:#f4f2ed;color:#252827;font-family:Inter,Arial,sans-serif">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f2ed;padding:32px 16px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;border:1px solid #dedbd4;border-radius:18px;background:#ffffff;overflow:hidden">
            <tr>
              <td style="padding:28px 30px 18px">
                <div style="font-size:20px;font-weight:800;letter-spacing:-0.02em;color:#252827">Ridebook</div>
                <div style="margin-top:22px;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#277a6a">${escapeHtml(options.eyebrow)}</div>
                <h1 style="margin:8px 0 12px;font-size:26px;line-height:1.2;color:#252827">${escapeHtml(options.title)}</h1>
                <p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:#666b68">${escapeHtml(options.intro)}</p>
                <table role="presentation" cellspacing="0" cellpadding="0">
                  ${action}
                </table>
                <div style="margin-top:16px;font-size:14px;line-height:1.65;color:#4e5350">${options.bodyHtml}</div>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 30px;border-top:1px solid #ece9e3;background:#faf9f6;font-size:12px;line-height:1.5;color:#8a8e8b">
                Message automatique envoyé par Ridebook.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
