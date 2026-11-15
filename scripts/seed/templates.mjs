import { shell, header, hero, text, buttonRow, twoCol, divider, spacer, table, footer, img, FONT } from "./blocks.mjs";

export const CATEGORIES = [
  ["welcome", "Welcome & onboarding", "First emails after sign-up."],
  ["newsletter", "Newsletter", "Regular editorial and digest emails."],
  ["promotional", "Promotional", "Sales, offers and seasonal campaigns."],
  ["product-launch", "Product launch", "Announcing new products and features."],
  ["transactional", "Transactional", "Order confirmations and receipts."],
  ["shipping", "Shipping & delivery", "Dispatch and delivery updates."],
  ["account", "Account & security", "Password resets and verification."],
  ["event", "Events & webinars", "Invitations, reminders and follow-ups."],
  ["abandoned-cart", "Abandoned cart", "Recover carts and browsing sessions."],
  ["re-engagement", "Re-engagement", "Win back inactive subscribers."],
  ["feedback", "Surveys & feedback", "NPS, reviews and research."],
].map(([slug, name, description], i) => ({ slug, name, description, sort_order: i + 1 }));

const p = (t) => `<p style="margin:0 0 16px;">${t}</p>`;

export const TEMPLATES = [
  {
    slug: "welcome-classic", category: "welcome", name: "Welcome – classic", tags: ["welcome", "onboarding", "dark-mode"],
    description: "Single-column welcome email with hero, three getting-started steps and a bulletproof CTA.",
    html: shell({ title: "Welcome to Northwind", preheader: "Your account is ready. Here's how to get started in three steps.", body: [
      header({}),
      hero({ title: "Welcome aboard, %%FirstName%%", text: "Your Northwind account is ready. Here are three quick steps to get the most out of it in your first week.", img: img(600, 260, "Welcome"), alt: "Illustration of a team getting started", cta: { label: "Open your dashboard", href: "https://example.com/dashboard" } }),
      divider(),
      spacer(28),
      text({ html: `<h2 class="dm-text" style="margin:0 0 12px; font-size:20px; line-height:28px; color:#111827;">Get started</h2>
              <p style="margin:0 0 12px;"><strong>1. Complete your profile.</strong> Add your team and timezone so reminders arrive at the right time.</p>
              <p style="margin:0 0 12px;"><strong>2. Import your contacts.</strong> Upload a CSV or connect your CRM.</p>
              <p style="margin:0;"><strong>3. Send your first campaign.</strong> Start from a template and customise it in minutes.</p>` }),
      footer(),
    ].join("\n") }),
  },
  {
    slug: "newsletter-digest", category: "newsletter", name: "Newsletter – weekly digest", tags: ["newsletter", "two-column", "responsive"],
    description: "Editorial digest with a lead story and a two-column story grid that stacks on mobile.",
    html: shell({ title: "The Weekly Digest", preheader: "This week: design systems for email, dark mode tips and a new case study.", body: [
      header({ brand: "The Weekly Digest", color: "#0f766e" }),
      hero({ title: "Design systems for email, in practice", text: "How three teams cut build time in half by treating email components like product UI, and what they would do differently.", img: img(600, 280, "Lead story", "ccfbf1", "0f766e"), alt: "Lead story illustration", cta: { label: "Read the story", href: "https://example.com/story" }, color: "#0f766e" }),
      divider(), spacer(28),
      twoCol({ left: { title: "Dark mode, demystified", text: "Which clients invert colours, which respect your styles and how to test both.", img: img(260, 150, "Dark mode", "ccfbf1", "0f766e"), alt: "Dark mode article", link: { label: "Read", href: "https://example.com/dark-mode" } }, right: { title: "Case study: Fernhill", text: "A retailer moved to fluid-hybrid layouts and saw mobile clicks rise.", img: img(260, 150, "Case study", "ccfbf1", "0f766e"), alt: "Case study article", link: { label: "Read", href: "https://example.com/case-study" } } }),
      footer(),
    ].join("\n") }),
  },
  {
    slug: "promo-sale", category: "promotional", name: "Promotional – seasonal sale", tags: ["promotional", "sale", "coupon"],
    description: "Bold sale announcement with a coupon block, product pair and urgency line.",
    html: shell({ title: "Spring sale – 30% off", preheader: "30% off everything until Sunday. Use code SPRING30 at checkout.", bg: "#fff7ed", body: [
      header({ brand: "Fernhill", color: "#c2410c", align: "center" }),
      hero({ title: "The spring sale is on", text: "Take 30% off everything, including new arrivals. Ends Sunday at midnight.", img: img(600, 300, "30% off", "fed7aa", "9a3412"), alt: "Spring sale – 30% off everything", color: "#c2410c" }),
      text({ html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:18px; border:2px dashed #fb923c; border-radius:8px; font-family:${FONT};">
                <p class="dm-muted" style="margin:0 0 4px; font-size:13px; letter-spacing:1px; text-transform:uppercase; color:#9a3412;">Your code</p>
                <p class="dm-text" style="margin:0; font-size:28px; line-height:34px; font-weight:bold; letter-spacing:3px; color:#7c2d12;">SPRING30</p>
              </td></tr></table>` }),
      buttonRow({ label: "Shop the sale", href: "https://example.com/sale", color: "#c2410c", align: "center" }),
      twoCol({ left: { title: "Linen overshirt", text: "<s>$89</s> <strong>$62</strong>", img: img(260, 260, "Overshirt", "ffedd5", "9a3412"), alt: "Linen overshirt", link: { label: "Shop", href: "https://example.com/p/1" } }, right: { title: "Canvas tote", text: "<s>$45</s> <strong>$31</strong>", img: img(260, 260, "Tote", "ffedd5", "9a3412"), alt: "Canvas tote", link: { label: "Shop", href: "https://example.com/p/2" } } }),
      footer({ company: "Fernhill Ltd.", bg: "#fff7ed" }),
    ].join("\n") }),
  },
  {
    slug: "product-launch", category: "product-launch", name: "Product launch – feature announcement", tags: ["launch", "saas", "features"],
    description: "SaaS feature launch with hero, feature list and two CTAs.",
    html: shell({ title: "Introducing Insights", preheader: "Meet Insights: real-time analytics for every campaign.", bg: "#eef2ff", body: [
      header({}),
      hero({ title: "Introducing Insights", text: "Real-time analytics for every campaign, right where you build them. See opens, clicks and revenue update as they happen.", img: img(600, 320, "Insights", "c7d2fe", "3730a3"), alt: "Insights dashboard preview", cta: { label: "Try Insights", href: "https://example.com/insights" } }),
      text({ html: `<h2 class="dm-text" style="margin:0 0 12px; font-size:20px; line-height:28px; color:#111827;">What's new</h2>
              <ul style="margin:0; padding:0 0 0 20px;">
                <li style="margin:0 0 8px;">Live campaign metrics with five-minute freshness</li>
                <li style="margin:0 0 8px;">Revenue attribution by link and segment</li>
                <li style="margin:0;">Scheduled reports to Slack and email</li>
              </ul>` }),
      buttonRow({ label: "Read the release notes", href: "https://example.com/changelog", color: "#111827", width: 260 }),
      footer({ bg: "#eef2ff" }),
    ].join("\n") }),
  },
  {
    slug: "order-confirmation", category: "transactional", name: "Order confirmation", tags: ["transactional", "receipt", "ecommerce"],
    description: "Receipt with order summary table, totals and support link. No marketing content.",
    html: shell({ title: "Order confirmation", preheader: "Thanks for your order #10482. Here's your receipt.", body: [
      header({ brand: "Fernhill", color: "#111827" }),
      hero({ title: "Thanks for your order", text: "Order <strong>#10482</strong> placed on 15 November 2026. We'll email you again when it ships." }),
      table({ rows: [["Linen overshirt × 1", "$62.00"], ["Canvas tote × 2", "$62.00"], ["Shipping", "$4.95"], ["Tax", "$9.92"]], total: ["Total", "$138.87"] }),
      text({ html: `<p style="margin:0 0 8px;"><strong>Shipping to</strong><br>Alex Morgan<br>42 Harbour Road<br>Bristol BS1 5TY</p>` }),
      buttonRow({ label: "View your order", href: "https://example.com/orders/10482", color: "#111827" }),
      text({ html: p(`Questions? Reply to this email or visit our <a href="https://example.com/help" style="color:#4f46e5;">help centre</a>.`) }),
      footer({ company: "Fernhill Ltd." }),
    ].join("\n") }),
  },
  {
    slug: "shipping-update", category: "shipping", name: "Shipping update", tags: ["transactional", "shipping", "tracking"],
    description: "Dispatch notice with progress steps and a tracking button.",
    html: shell({ title: "Your order has shipped", preheader: "Order #10482 is on its way. Estimated delivery: Tuesday.", body: [
      header({ brand: "Fernhill", color: "#111827" }),
      hero({ title: "Your order is on its way", text: "Order #10482 left our warehouse today. Estimated delivery: <strong>Tuesday, 18 November</strong>.", cta: { label: "Track your parcel", href: "https://example.com/track/10482" }, color: "#111827" }),
      text({ html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                <td align="center" style="padding:8px; background-color:#16a34a; color:#ffffff; font-family:${FONT}; font-size:13px; font-weight:bold; border-radius:4px 0 0 4px;">Ordered</td>
                <td align="center" style="padding:8px; background-color:#16a34a; color:#ffffff; font-family:${FONT}; font-size:13px; font-weight:bold;">Shipped</td>
                <td align="center" style="padding:8px; background-color:#e5e7eb; color:#374151; font-family:${FONT}; font-size:13px;">Out for delivery</td>
                <td align="center" style="padding:8px; background-color:#e5e7eb; color:#374151; font-family:${FONT}; font-size:13px; border-radius:0 4px 4px 0;">Delivered</td>
              </tr></table>` }),
      footer({ company: "Fernhill Ltd." }),
    ].join("\n") }),
  },
  {
    slug: "password-reset", category: "account", name: "Password reset", tags: ["transactional", "security", "account"],
    description: "Minimal security email with one action, expiry notice and a fallback link.",
    html: shell({ title: "Reset your password", preheader: "Use this link to reset your password. It expires in 60 minutes.", body: [
      header({}),
      hero({ title: "Reset your password", text: "We received a request to reset the password for your account. This link expires in 60 minutes.", cta: { label: "Reset password", href: "https://example.com/reset?token=TOKEN" } }),
      text({ html: `<p class="dm-muted" style="margin:0 0 12px; font-size:14px; line-height:22px; color:#6b7280;">If the button doesn't work, copy this link into your browser:<br><a href="https://example.com/reset?token=TOKEN" style="color:#4f46e5; word-break:break-all;">https://example.com/reset?token=TOKEN</a></p>
              <p class="dm-muted" style="margin:0; font-size:14px; line-height:22px; color:#6b7280;">Didn't ask for this? You can ignore this email; your password won't change.</p>` }),
      footer(),
    ].join("\n") }),
  },
  {
    slug: "event-invite", category: "event", name: "Webinar invitation", tags: ["event", "webinar", "calendar"],
    description: "Event invite with date/time block, speaker pair and add-to-calendar link.",
    html: shell({ title: "You're invited: Email in 2027", preheader: "Live webinar on 3 December. Save your seat.", bg: "#0f172a", dark: false, body: [
      header({ brand: "Northwind Live", color: "#ffffff", bg: "#0f172a" }).replace("border-bottom:1px solid #eceef3;", "border-bottom:1px solid #1e293b;"),
      hero({ title: "<span style=\"color:#ffffff;\">Email in 2027: what changes</span>", text: "<span style=\"color:#cbd5e1;\">A live session on accessibility rules, new client support and AI-assisted workflows.</span>", bg: "#0f172a", cta: { label: "Save my seat", href: "https://example.com/register" }, color: "#38bdf8" }),
      text({ bg: "#0f172a", html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="padding:16px; background-color:#1e293b; border-radius:8px; font-family:${FONT}; color:#e2e8f0; font-size:15px; line-height:24px;">
                <strong>Wednesday, 3 December 2026</strong><br>17:00–18:00 GMT &middot; Online<br>
                <a href="https://example.com/event.ics" style="color:#38bdf8;">Add to calendar</a>
              </td></tr></table>` }),
      twoCol({ bg: "#0f172a", left: { title: "<span style=\"color:#ffffff;\">Priya Shah</span>", text: "<span style=\"color:#94a3b8;\">Head of Email, Fernhill</span>", img: img(260, 160, "Speaker", "1e293b", "38bdf8"), alt: "Priya Shah" }, right: { title: "<span style=\"color:#ffffff;\">Tom Becker</span>", text: "<span style=\"color:#94a3b8;\">Accessibility lead, Northwind</span>", img: img(260, 160, "Speaker", "1e293b", "38bdf8"), alt: "Tom Becker" } }),
      footer({ bg: "#0f172a" }),
    ].join("\n") }),
  },
  {
    slug: "abandoned-cart", category: "abandoned-cart", name: "Abandoned cart reminder", tags: ["ecommerce", "cart", "ampscript"],
    description: "Cart reminder with item row and AMPscript personalization fallback.",
    html: shell({ title: "You left something behind", preheader: "Your cart is saved. Complete your order before items sell out.", pre: `%%[\n    VAR @firstName\n    SET @firstName = AttributeValue("FirstName")\n    IF Empty(@firstName) THEN SET @firstName = "there" ENDIF\n  ]%%`, body: [
      header({ brand: "Fernhill", color: "#111827" }),
      hero({ title: "Still thinking it over, %%=v(@firstName)=%%?", text: "We saved your cart. Items in your size are selling fast." }),
      text({ html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                <td width="120" valign="top" style="padding:0 16px 0 0;"><img src="${img(120, 120, "Item", "f3f4f6", "374151")}" width="120" alt="Linen overshirt in sage" style="display:block; border-radius:6px;"></td>
                <td valign="top" style="font-family:${FONT}; font-size:15px; line-height:22px; color:#374151;"><strong class="dm-text" style="color:#111827;">Linen overshirt</strong><br>Sage &middot; Size M<br><strong class="dm-text" style="color:#111827;">$89.00</strong></td>
              </tr></table>` }),
      buttonRow({ label: "Return to cart", href: "https://example.com/cart", color: "#111827" }),
      footer({ company: "Fernhill Ltd." }),
    ].join("\n") }),
  },
  {
    slug: "win-back", category: "re-engagement", name: "Win-back – we miss you", tags: ["re-engagement", "retention"],
    description: "Re-engagement email with a simple choice: stay subscribed or update preferences.",
    html: shell({ title: "We miss you", preheader: "It's been a while. Want to keep hearing from us?", body: [
      header({}),
      hero({ title: "It's been a while", text: "We haven't seen you in a few months. Want to keep getting our emails? Pick what you'd like to hear about, or let us know you're done.", cta: { label: "Yes, keep me subscribed", href: "https://example.com/stay" } }),
      text({ html: p(`Prefer fewer emails? <a href="https://example.com/preferences" style="color:#4f46e5;">Choose your topics</a> or <a href="https://example.com/unsubscribe" style="color:#4f46e5;">unsubscribe</a>.`) }),
      footer(),
    ].join("\n") }),
  },
  {
    slug: "nps-survey", category: "feedback", name: "NPS survey", tags: ["feedback", "survey", "nps"],
    description: "One-click 0–10 rating row; each number links to the survey with the score prefilled.",
    html: shell({ title: "How are we doing?", preheader: "One question, one click. How likely are you to recommend us?", body: [
      header({}),
      hero({ title: "How likely are you to recommend us?", text: "Tap a number. It takes one click and helps us improve." }),
      text({ html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
${Array.from({ length: 11 }, (_, n) => `                <td align="center" style="padding:2px;"><a href="https://example.com/nps?score=${n}" style="display:block; padding:10px 0; font-family:${FONT}; font-size:15px; font-weight:bold; color:#ffffff; background-color:${n <= 6 ? "#dc2626" : n <= 8 ? "#d97706" : "#16a34a"}; border-radius:4px; text-decoration:none;">${n}</a></td>`).join("\n")}
              </tr></table>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
                <td class="dm-muted" style="padding:8px 0 0; font-family:${FONT}; font-size:12px; color:#6b7280;">Not likely</td>
                <td class="dm-muted" align="right" style="padding:8px 0 0; font-family:${FONT}; font-size:12px; color:#6b7280;">Very likely</td>
              </tr></table>` }),
      footer(),
    ].join("\n") }),
  },
  {
    slug: "newsletter-minimal", category: "newsletter", name: "Newsletter – minimal text", tags: ["newsletter", "plain", "accessible"],
    description: "Text-first newsletter: no images required, readable with images blocked.",
    html: shell({ title: "Notes from the team", preheader: "Three things we learned this month.", bg: "#ffffff", body: [
      text({ pad: "32px 40px 8px", html: `<p class="dm-muted" style="margin:0; font-size:13px; letter-spacing:1px; text-transform:uppercase; color:#6b7280;">Notes from the team &middot; November</p>` }),
      text({ html: `<h1 class="h1-m dm-text" style="margin:0 0 20px; font-size:28px; line-height:36px; color:#111827;">Three things we learned this month</h1>
              ${p("<strong>Shorter subject lines won.</strong> Under 40 characters improved opens across every segment we tested.")}
              ${p("<strong>Live text beats images.</strong> Emails that put key messages in HTML text kept working when images were blocked.")}
              ${p("<strong>Accessibility is everyone's job.</strong> Semantic headings and real alt text took ten minutes and helped every reader.")}
              <p style="margin:0;">— The Northwind team</p>` }),
      footer({ bg: "#ffffff" }),
    ].join("\n") }),
  },
];
