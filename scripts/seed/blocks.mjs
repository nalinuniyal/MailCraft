// Email-safe building blocks used to generate the demo templates in seed.sql.
// Patterns: role="presentation" tables, inline styles, MSO ghost tables for the
// 600px container, VML bulletproof buttons, mobile stacking via media queries.

export const FONT = "Arial, Helvetica, sans-serif";

export function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function shell({ title, preheader, bg = "#f4f4f7", body, dark = true, pre = "" }) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no">${dark ? `
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">` : ""}
  <title>${esc(title)}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    body { margin: 0; padding: 0; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
    @media only screen and (max-width: 620px) {
      .container { width: 100% !important; }
      .px { padding-left: 20px !important; padding-right: 20px !important; }
      .stack { display: block !important; width: 100% !important; max-width: 100% !important; }
      .stack-pad { padding: 0 0 20px 0 !important; }
      .fluid { width: 100% !important; max-width: 100% !important; height: auto !important; }
      .center-m { text-align: center !important; }
      .h1-m { font-size: 26px !important; line-height: 34px !important; }
    }${dark ? `
    @media (prefers-color-scheme: dark) {
      .dm-bg { background-color: #16181d !important; }
      .dm-card { background-color: #1f2229 !important; }
      .dm-text { color: #e6e8ee !important; }
      .dm-muted { color: #a7adba !important; }
    }
    [data-ogsc] .dm-text { color: #e6e8ee !important; }` : ""}
  </style>
</head>
<body class="dm-bg" style="margin:0; padding:0; background-color:${bg};">
${pre ? `  ${pre}\n` : ""}  <div style="display:none; max-height:0; max-width:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:${bg};">${esc(preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="dm-bg" style="background-color:${bg};">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" align="center"><tr><td><![endif]-->
        <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">
${body}
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export function header({ brand = "Northwind", color = "#4f46e5", align = "left", bg = "#ffffff" }) {
  return `          <tr>
            <td class="px dm-card" align="${align}" style="padding:24px 40px; background-color:${bg}; border-bottom:1px solid #eceef3;">
              <span class="dm-text" style="font-family:${FONT}; font-size:20px; line-height:28px; font-weight:bold; color:${color}; letter-spacing:-0.3px;">${esc(brand)}</span>
            </td>
          </tr>`;
}

export function hero({ title, text, img, alt, bg = "#ffffff", cta, color = "#4f46e5" }) {
  return `${img ? `          <tr>
            <td style="background-color:${bg};">
              <img src="${img}" width="600" alt="${esc(alt ?? "")}" class="fluid" style="display:block; width:100%; max-width:600px; height:auto;">
            </td>
          </tr>
` : ""}          <tr>
            <td class="px dm-card" style="padding:40px 40px 32px; background-color:${bg}; font-family:${FONT};">
              <h1 class="h1-m dm-text" style="margin:0 0 16px; font-size:30px; line-height:38px; color:#111827; font-weight:bold;">${title}</h1>
              <p class="dm-muted" style="margin:0 0 ${cta ? 28 : 0}px; font-size:16px; line-height:26px; color:#4b5563;">${text}</p>${cta ? `\n${button({ ...cta, color })}` : ""}
            </td>
          </tr>`;
}

export function text({ html, bg = "#ffffff", pad = "0 40px 32px" }) {
  return `          <tr>
            <td class="px dm-card dm-text" style="padding:${pad}; background-color:${bg}; font-family:${FONT}; font-size:16px; line-height:26px; color:#374151;">
              ${html}
            </td>
          </tr>`;
}

/** Bulletproof button: VML roundrect for Outlook for Windows, padded <a> elsewhere. */
export function button({ label, href, color = "#4f46e5", textColor = "#ffffff", width = 220, align = "left" }) {
  const w = width;
  return `              <table role="presentation" cellpadding="0" cellspacing="0" border="0"${align === "center" ? ' align="center"' : ""}>
                <tr>
                  <td align="center" bgcolor="${color}" style="border-radius:6px;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${href}" style="height:48px; v-text-anchor:middle; width:${w}px;" arcsize="13%" stroke="f" fillcolor="${color}">
                      <w:anchorlock/>
                      <center style="color:${textColor}; font-family:${FONT}; font-size:16px; font-weight:bold;">${esc(label)}</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${href}" style="display:inline-block; padding:14px 28px; font-family:${FONT}; font-size:16px; line-height:20px; font-weight:bold; color:${textColor}; text-decoration:none; border-radius:6px; background-color:${color};">${esc(label)}</a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>`;
}

export function buttonRow(opts) {
  return `          <tr>
            <td class="px dm-card" align="${opts.align ?? "left"}" style="padding:0 40px 40px; background-color:${opts.bg ?? "#ffffff"};">
${button(opts)}
            </td>
          </tr>`;
}

/** Two columns that stack on mobile; Outlook gets a ghost table. */
export function twoCol({ left, right, bg = "#ffffff" }) {
  const col = (c) => `                <!--[if mso]><td width="260" valign="top"><![endif]-->
                <div class="stack" style="display:inline-block; width:100%; max-width:260px; vertical-align:top;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr><td class="stack-pad" style="padding:0 0 0 0; font-family:${FONT}; font-size:15px; line-height:23px; color:#374151;">
                      ${c.img ? `<img src="${c.img}" width="260" alt="${esc(c.alt ?? "")}" class="fluid" style="display:block; width:100%; max-width:260px; height:auto; border-radius:6px; margin:0 0 14px;">` : ""}
                      <h3 class="dm-text" style="margin:0 0 8px; font-size:18px; line-height:24px; color:#111827;">${c.title}</h3>
                      <p class="dm-muted" style="margin:0 0 12px; color:#4b5563;">${c.text}</p>
                      ${c.link ? `<a href="${c.link.href}" style="color:#4f46e5; font-weight:bold; text-decoration:none;">${esc(c.link.label)} &rarr;</a>` : ""}
                    </td></tr>
                  </table>
                </div>
                <!--[if mso]></td><![endif]-->`;
  return `          <tr>
            <td class="px dm-card" style="padding:0 40px 32px; background-color:${bg}; font-size:0; text-align:center;">
              <!--[if mso]><table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0"><tr><![endif]-->
${col(left)}
                <!--[if mso]><td width="0"><![endif]--><div class="stack" style="display:inline-block; width:0; max-width:0;"></div><!--[if mso]></td><![endif]-->
${col(right)}
              <!--[if mso]></tr></table><![endif]-->
            </td>
          </tr>`.replace(/max-width:260px; vertical-align:top;/g, "max-width:260px; vertical-align:top; text-align:left; margin:0 0 0 0;");
}

export function divider({ bg = "#ffffff" } = {}) {
  return `          <tr>
            <td class="px dm-card" style="padding:0 40px; background-color:${bg};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid #e5e7eb; font-size:0; line-height:0;">&nbsp;</td></tr></table>
            </td>
          </tr>`;
}

export function spacer(h = 24, bg = "#ffffff") {
  return `          <tr><td class="dm-card" style="height:${h}px; line-height:${h}px; font-size:0; background-color:${bg};">&nbsp;</td></tr>`;
}

export function table({ rows, total, bg = "#ffffff" }) {
  const tr = rows.map(([a, b]) => `                <tr>
                  <td class="dm-text" style="padding:10px 0; border-bottom:1px solid #eceef3; font-family:${FONT}; font-size:15px; line-height:22px; color:#374151;">${a}</td>
                  <td class="dm-text" align="right" style="padding:10px 0; border-bottom:1px solid #eceef3; font-family:${FONT}; font-size:15px; line-height:22px; color:#111827;">${b}</td>
                </tr>`).join("\n");
  return `          <tr>
            <td class="px dm-card" style="padding:0 40px 32px; background-color:${bg};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${tr}${total ? `
                <tr>
                  <td class="dm-text" style="padding:14px 0 0; font-family:${FONT}; font-size:16px; font-weight:bold; color:#111827;">${total[0]}</td>
                  <td class="dm-text" align="right" style="padding:14px 0 0; font-family:${FONT}; font-size:16px; font-weight:bold; color:#111827;">${total[1]}</td>
                </tr>` : ""}
              </table>
            </td>
          </tr>`;
}

export function footer({ company = "Northwind Inc.", address = "123 Market Street, San Francisco, CA 94105", bg = "#f4f4f7", unsubscribe = "https://example.com/unsubscribe" } = {}) {
  return `          <tr>
            <td class="px" align="center" style="padding:32px 40px; background-color:${bg}; font-family:${FONT}; font-size:12px; line-height:18px; color:#6b7280;">
              <p class="dm-muted" style="margin:0 0 8px;">${esc(company)} &middot; ${esc(address)}</p>
              <p class="dm-muted" style="margin:0;">You're receiving this email because you signed up at example.com.<br>
                <a href="${unsubscribe}" style="color:#6b7280; text-decoration:underline;">Unsubscribe</a> &middot; <a href="https://example.com/preferences" style="color:#6b7280; text-decoration:underline;">Email preferences</a></p>
            </td>
          </tr>`;
}

export const img = (w, h, label, bg = "e0e7ff", fg = "4338ca") => `https://placehold.co/${w}x${h}/${bg}/${fg}/png?text=${encodeURIComponent(label)}`;
