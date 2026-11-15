import { FONT } from "./blocks.mjs";

// Built-in components. Placeholders use {{key|default}}; the component library
// turns them into form fields before inserting. Each snippet is a set of <tr>
// rows meant to sit inside a 600px container table, unless noted.

const BTN = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="{{align|center}}">
  <tr>
    <td align="center" bgcolor="{{background|#4f46e5}}" style="border-radius:{{radius|6}}px;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="{{url|https://example.com}}" style="height:48px; v-text-anchor:middle; width:{{width|220}}px;" arcsize="13%" stroke="f" fillcolor="{{background|#4f46e5}}">
        <w:anchorlock/>
        <center style="color:{{text_color|#ffffff}}; font-family:${FONT}; font-size:16px; font-weight:bold;">{{label|Get started}}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="{{url|https://example.com}}" style="display:inline-block; padding:14px 28px; font-family:${FONT}; font-size:16px; line-height:20px; font-weight:bold; color:{{text_color|#ffffff}}; text-decoration:none; border-radius:{{radius|6}}px; background-color:{{background|#4f46e5}};">{{label|Get started}}</a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`;

export const COMPONENTS = [
  { slug: "button-bulletproof", kind: "button", name: "Bulletproof button", tags: ["outlook", "vml", "cta"],
    description: "VML roundrect for Outlook for Windows plus a padded link for every other client.", html: BTN },
  { slug: "button-ghost", kind: "button", name: "Outline button", tags: ["cta", "secondary"],
    description: "Secondary call to action with a border instead of a fill.",
    html: `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="{{align|center}}">
  <tr>
    <td align="center" style="border:2px solid {{color|#4f46e5}}; border-radius:6px;">
      <a href="{{url|https://example.com}}" style="display:inline-block; padding:12px 26px; font-family:${FONT}; font-size:16px; line-height:20px; font-weight:bold; color:{{color|#4f46e5}}; text-decoration:none;">{{label|Learn more}}</a>
    </td>
  </tr>
</table>` },
  { slug: "header-logo", kind: "header", name: "Header with logo", tags: ["header", "logo"],
    description: "Logo row with optional view-in-browser link.",
    html: `<tr>
  <td style="padding:24px 40px; background-color:{{background|#ffffff}};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td><a href="{{home_url|https://example.com}}"><img src="{{logo_url|https://placehold.co/140x40/png?text=Logo}}" width="140" height="40" alt="{{brand|Northwind}}" style="display:block;"></a></td>
      <td align="right" style="font-family:${FONT}; font-size:12px;"><a href="{{browser_url|https://example.com/view}}" style="color:#6b7280; text-decoration:underline;">View in browser</a></td>
    </tr></table>
  </td>
</tr>` },
  { slug: "hero-image", kind: "hero", name: "Hero with image", tags: ["hero", "image", "responsive"],
    description: "Full-width fluid image followed by heading, copy and a button.",
    html: `<tr>
  <td><img src="{{image_url|https://placehold.co/600x280/png?text=Hero}}" width="600" alt="{{image_alt|Describe the image}}" style="display:block; width:100%; max-width:600px; height:auto;"></td>
</tr>
<tr>
  <td style="padding:36px 40px; background-color:#ffffff; font-family:${FONT};">
    <h1 style="margin:0 0 14px; font-size:28px; line-height:36px; color:#111827;">{{heading|A headline that earns the click}}</h1>
    <p style="margin:0 0 24px; font-size:16px; line-height:26px; color:#4b5563;">{{body|One or two sentences that support the headline.}}</p>
    <a href="{{url|https://example.com}}" style="display:inline-block; padding:14px 28px; background-color:{{button_color|#4f46e5}}; color:#ffffff; font-family:${FONT}; font-size:16px; font-weight:bold; text-decoration:none; border-radius:6px;">{{button_label|Shop now}}</a>
  </td>
</tr>` },
  { slug: "hero-bg-vml", kind: "hero", name: "Hero with background image (VML)", tags: ["hero", "outlook", "vml", "background"],
    description: "Background image with live text on top; VML fill keeps the image in Outlook for Windows.",
    html: `<tr>
  <td background="{{image_url|https://placehold.co/600x320/png?text=Background}}" bgcolor="{{fallback_color|#312e81}}" width="600" height="320" valign="middle" style="background:url('{{image_url|https://placehold.co/600x320/png?text=Background}}') center / cover no-repeat {{fallback_color|#312e81}};">
    <!--[if gte mso 9]>
    <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:600px; height:320px;">
      <v:fill type="frame" src="{{image_url|https://placehold.co/600x320/png?text=Background}}" color="{{fallback_color|#312e81}}" />
      <v:textbox inset="0,0,0,0">
    <![endif]-->
    <div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td align="center" style="padding:80px 40px; font-family:${FONT}; color:#ffffff;">
          <h1 style="margin:0 0 12px; font-size:32px; line-height:40px; color:#ffffff;">{{heading|Live text on an image}}</h1>
          <p style="margin:0; font-size:16px; line-height:24px; color:#e0e7ff;">{{body|Readable even when images are blocked.}}</p>
        </td>
      </tr></table>
    </div>
    <!--[if gte mso 9]>
      </v:textbox>
    </v:rect>
    <![endif]-->
  </td>
</tr>` },
  { slug: "two-column", kind: "layout", name: "Two columns (fluid hybrid)", tags: ["layout", "responsive", "columns"],
    description: "Two 260px columns that stack on mobile without media queries; ghost table for Outlook.",
    html: `<tr>
  <td style="padding:0 40px 32px; background-color:#ffffff; font-size:0; text-align:center;">
    <!--[if mso]><table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0"><tr><td width="260" valign="top"><![endif]-->
    <div style="display:inline-block; width:100%; max-width:260px; vertical-align:top; text-align:left;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 10px 20px 0; font-family:${FONT}; font-size:15px; line-height:23px; color:#374151;">
        <h3 style="margin:0 0 8px; font-size:18px; color:#111827;">{{left_title|Left column}}</h3>
        <p style="margin:0;">{{left_body|Supporting copy for the left column.}}</p>
      </td></tr></table>
    </div>
    <!--[if mso]></td><td width="260" valign="top"><![endif]-->
    <div style="display:inline-block; width:100%; max-width:260px; vertical-align:top; text-align:left;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:0 0 20px 10px; font-family:${FONT}; font-size:15px; line-height:23px; color:#374151;">
        <h3 style="margin:0 0 8px; font-size:18px; color:#111827;">{{right_title|Right column}}</h3>
        <p style="margin:0;">{{right_body|Supporting copy for the right column.}}</p>
      </td></tr></table>
    </div>
    <!--[if mso]></td></tr></table><![endif]-->
  </td>
</tr>` },
  { slug: "three-column-icons", kind: "layout", name: "Three feature columns", tags: ["layout", "features", "responsive"],
    description: "Three 173px columns with icon, title and copy; stacks on mobile.",
    html: `<tr>
  <td style="padding:0 40px 32px; background-color:#ffffff; font-size:0; text-align:center;">
    <!--[if mso]><table role="presentation" width="520" cellpadding="0" cellspacing="0" border="0"><tr><![endif]-->
${[1, 2, 3].map((n) => `    <!--[if mso]><td width="173" valign="top"><![endif]-->
    <div style="display:inline-block; width:100%; max-width:173px; vertical-align:top;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:0 8px 20px; font-family:${FONT}; font-size:14px; line-height:21px; color:#4b5563;">
        <img src="https://placehold.co/48x48/png?text=${n}" width="48" height="48" alt="" style="display:block; margin:0 auto 10px;">
        <strong style="display:block; margin:0 0 4px; font-size:16px; color:#111827;">{{title_${n}|Feature ${n}}}</strong>
        {{body_${n}|A short benefit statement.}}
      </td></tr></table>
    </div>
    <!--[if mso]></td><![endif]-->`).join("\n")}
    <!--[if mso]></tr></table><![endif]-->
  </td>
</tr>` },
  { slug: "product-card", kind: "commerce", name: "Product card", tags: ["ecommerce", "product"],
    description: "Image, name, price and a buy link in a bordered card.",
    html: `<table role="presentation" width="260" cellpadding="0" cellspacing="0" border="0" style="width:260px; border:1px solid #e5e7eb; border-radius:8px;">
  <tr><td><img src="{{image_url|https://placehold.co/260x260/png?text=Product}}" width="260" alt="{{name|Product name}}" style="display:block; width:100%; height:auto; border-radius:8px 8px 0 0;"></td></tr>
  <tr><td style="padding:16px; font-family:${FONT};">
    <p style="margin:0 0 4px; font-size:16px; font-weight:bold; color:#111827;">{{name|Product name}}</p>
    <p style="margin:0 0 12px; font-size:15px; color:#4b5563;">{{price|$49.00}}</p>
    <a href="{{url|https://example.com/product}}" style="color:#4f46e5; font-weight:bold; text-decoration:none;">{{link_label|Shop now}} &rarr;</a>
  </td></tr>
</table>` },
  { slug: "testimonial", kind: "content", name: "Testimonial quote", tags: ["social-proof", "quote"],
    description: "Pull quote with attribution.",
    html: `<tr>
  <td style="padding:32px 40px; background-color:{{background|#f9fafb}}; font-family:${FONT};">
    <p style="margin:0 0 12px; font-size:20px; line-height:30px; font-style:italic; color:#111827;">&ldquo;{{quote|This changed how our team builds email.}}&rdquo;</p>
    <p style="margin:0; font-size:14px; color:#6b7280;">{{author|Alex Morgan}}, {{role|Head of CRM}}</p>
  </td>
</tr>` },
  { slug: "divider", kind: "spacing", name: "Divider", tags: ["spacing"],
    description: "1px rule that renders consistently, including Outlook.",
    html: `<tr>
  <td style="padding:{{spacing|24}}px 40px; background-color:#ffffff;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="border-top:1px solid {{color|#e5e7eb}}; font-size:0; line-height:0;">&nbsp;</td></tr></table>
  </td>
</tr>` },
  { slug: "spacer", kind: "spacing", name: "Spacer", tags: ["spacing"],
    description: "Fixed-height spacer row using height and line-height so Outlook respects it.",
    html: `<tr><td style="height:{{height|32}}px; line-height:{{height|32}}px; font-size:0;">&nbsp;</td></tr>` },
  { slug: "social-links", kind: "footer", name: "Social links", tags: ["footer", "social"],
    description: "Row of text-labelled social links (works with images blocked).",
    html: `<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center"><tr>
  <td style="padding:0 8px; font-family:${FONT}; font-size:13px;"><a href="{{linkedin|https://linkedin.com}}" style="color:#4b5563; text-decoration:none;">LinkedIn</a></td>
  <td style="padding:0 8px; font-family:${FONT}; font-size:13px;"><a href="{{instagram|https://instagram.com}}" style="color:#4b5563; text-decoration:none;">Instagram</a></td>
  <td style="padding:0 8px; font-family:${FONT}; font-size:13px;"><a href="{{youtube|https://youtube.com}}" style="color:#4b5563; text-decoration:none;">YouTube</a></td>
</tr></table>` },
  { slug: "footer-legal", kind: "footer", name: "Legal footer", tags: ["footer", "compliance", "unsubscribe"],
    description: "Company address, reason for receiving and unsubscribe/preferences links.",
    html: `<tr>
  <td align="center" style="padding:32px 40px; font-family:${FONT}; font-size:12px; line-height:18px; color:#6b7280;">
    <p style="margin:0 0 8px;">{{company|Northwind Inc.}} &middot; {{address|123 Market Street, San Francisco, CA 94105}}</p>
    <p style="margin:0;">{{reason|You're receiving this because you signed up at example.com.}}<br>
      <a href="{{unsubscribe_url|%%unsub_center_url%%}}" style="color:#6b7280; text-decoration:underline;">Unsubscribe</a> &middot; <a href="{{preferences_url|%%profile_center_url%%}}" style="color:#6b7280; text-decoration:underline;">Preferences</a></p>
  </td>
</tr>` },
  { slug: "preheader", kind: "head", name: "Hidden preheader", tags: ["preheader", "inbox"],
    description: "Hidden preview text with filler so the inbox doesn't pull in body copy.",
    html: `<div style="display:none; max-height:0; max-width:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px;">{{text|Preview text shown in the inbox.}}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>` },
  { slug: "dark-mode-styles", kind: "head", name: "Dark mode styles", tags: ["dark-mode", "head"],
    description: "Meta tags and a prefers-color-scheme block; paste inside <head>.",
    html: `<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<style>
  @media (prefers-color-scheme: dark) {
    .dm-bg { background-color: {{dark_bg|#16181d}} !important; }
    .dm-text { color: {{dark_text|#e6e8ee}} !important; }
  }
  [data-ogsc] .dm-text { color: {{dark_text|#e6e8ee}} !important; }
</style>` },
];
