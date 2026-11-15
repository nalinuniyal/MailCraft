export interface Snippet {
  id: string;
  title: string;
  description: string;
  code: string;
}

/** Common AMPscript patterns. Copy into your email; MailCraft does not execute them. */
export const AMPSCRIPT_SNIPPETS: Snippet[] = [
  {
    id: "first-name-fallback", title: "First name with fallback",
    description: "Read a subscriber attribute and fall back to a neutral greeting when it's empty.",
    code: `%%[
VAR @firstName
SET @firstName = AttributeValue("FirstName")
IF Empty(@firstName) THEN
  SET @firstName = "there"
ENDIF
]%%
<p>Hi %%=ProperCase(@firstName)=%%,</p>`,
  },
  {
    id: "lookup-de", title: "Lookup from a data extension",
    description: "Fetch one value from a data extension by subscriber key.",
    code: `%%[
VAR @tier
SET @tier = Lookup("Loyalty_Members", "Tier", "SubscriberKey", _subscriberkey)
IF Empty(@tier) THEN SET @tier = "Member" ENDIF
]%%
<p>Your status: %%=v(@tier)=%%</p>`,
  },
  {
    id: "lookup-rows-loop", title: "Loop over rows",
    description: "Render a list of products from a data extension with LookupOrderedRows.",
    code: `%%[
VAR @rows, @row, @i, @name, @price
SET @rows = LookupOrderedRows("Cart_Items", 3, "AddedDate DESC", "SubscriberKey", _subscriberkey)
IF RowCount(@rows) > 0 THEN
  FOR @i = 1 TO RowCount(@rows) DO
    SET @row = Row(@rows, @i)
    SET @name = Field(@row, "ProductName")
    SET @price = Field(@row, "Price")
]%%
<p>%%=v(@name)=%% – %%=FormatCurrency(@price, "en-US")=%%</p>
%%[
  NEXT @i
ENDIF
]%%`,
  },
  {
    id: "conditional-content", title: "Conditional content block",
    description: "Show different copy depending on an attribute.",
    code: `%%[
VAR @country
SET @country = AttributeValue("Country")
IF @country == "UK" THEN
]%%
<p>Free UK delivery on orders over £50.</p>
%%[ ELSEIF @country == "US" THEN ]%%
<p>Free US shipping on orders over $60.</p>
%%[ ELSE ]%%
<p>We ship to over 40 countries.</p>
%%[ ENDIF ]%%`,
  },
  {
    id: "date-format", title: "Formatted dates",
    description: "Show today's date and an expiry date seven days from now.",
    code: `%%[
VAR @expires
SET @expires = DateAdd(Now(), 7, "D")
]%%
<p>Offer ends %%=FormatDate(@expires, "MMMM d, yyyy")=%%.</p>`,
  },
  {
    id: "tracked-link", title: "Tracked link with parameters",
    description: "Build a URL with UTM parameters and keep click tracking via RedirectTo.",
    code: `%%[
VAR @url
SET @url = Concat("https://example.com/sale?utm_source=sfmc&utm_medium=email&utm_campaign=", AttributeValue("emailname_"))
]%%
<a href="%%=RedirectTo(@url)=%%" alias="Sale CTA">Shop the sale</a>`,
  },
  {
    id: "content-block", title: "Include a Content Builder block",
    description: "Pull in a shared header or footer by customer key.",
    code: `%%=ContentBlockByKey("global-footer")=%%`,
  },
  {
    id: "cloudpage-link", title: "Link to a CloudPage with parameters",
    description: "Pass the subscriber key securely to a CloudPage.",
    code: `<a href="%%=RedirectTo(CloudPagesURL(123, "source", "email"))=%%">Update your preferences</a>`,
  },
  {
    id: "safe-output", title: "Escape attribute values",
    description: "Use v() for output and avoid TreatAsContent on untrusted data.",
    code: `%%[ VAR @company SET @company = AttributeValue("Company") ]%%
<p>Thanks for choosing us at %%=v(@company)=%%.</p>`,
  },
];

export interface PersonalizationString {
  token: string;
  description: string;
}

/** Commonly used Marketing Cloud personalization strings. Verify availability for your account and send type. */
export const PERSONALIZATION_STRINGS: { group: string; items: PersonalizationString[] }[] = [
  { group: "Subscriber", items: [
    { token: "%%emailaddr%%", description: "Subscriber's email address" },
    { token: "%%_subscriberkey%%", description: "Subscriber key" },
    { token: "%%FirstName%%", description: "Any profile attribute or sendable data extension field, by name" },
  ] },
  { group: "Sender (CAN-SPAM footer)", items: [
    { token: "%%member_busname%%", description: "Account business name" },
    { token: "%%member_addr%%", description: "Account street address" },
    { token: "%%member_city%%", description: "Account city" },
    { token: "%%member_state%%", description: "Account state" },
    { token: "%%member_postalcode%%", description: "Account postal code" },
    { token: "%%member_country%%", description: "Account country" },
  ] },
  { group: "Links", items: [
    { token: "%%view_email_url%%", description: "View as web page" },
    { token: "%%unsub_center_url%%", description: "Unsubscribe centre" },
    { token: "%%profile_center_url%%", description: "Profile centre" },
    { token: "%%subscription_center_url%%", description: "Subscription centre" },
  ] },
  { group: "Send", items: [
    { token: "%%jobid%%", description: "Send job ID" },
    { token: "%%_emailid%%", description: "Email ID" },
    { token: "%%emailname_%%", description: "Email name" },
    { token: "%%_messagecontext%%", description: "Context the content is rendered in (e.g. SEND, PREVIEW)" },
  ] },
  { group: "Dates", items: [
    { token: "%%xtmonth%%", description: "Current month name" },
    { token: "%%xtday%%", description: "Current day of month" },
    { token: "%%xtyear%%", description: "Current year" },
    { token: "%%xtshortdate%%", description: "Short date" },
    { token: "%%xtlongdate%%", description: "Long date" },
  ] },
];
