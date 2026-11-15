import type * as Monaco from "monaco-editor";

let registered = false;

export const AMPSCRIPT_FUNCTIONS = [
  "AttributeValue", "Lookup", "LookupRows", "LookupOrderedRows", "Row", "Field", "RowCount", "Set", "IIf", "Empty", "IsNull",
  "Concat", "Format", "FormatDate", "FormatCurrency", "FormatNumber", "Now", "DateAdd", "DateDiff", "DateParse", "Uppercase", "Lowercase",
  "ProperCase", "Length", "Substring", "IndexOf", "Replace", "Trim", "RedirectTo", "CloudPagesURL", "MicrositeURL", "RequestParameter",
  "QueryParameter", "Output", "OutputLine", "V", "ContentBlockByKey", "ContentBlockById", "ContentBlockByName", "TreatAsContent",
  "HTTPGet", "HTTPPost", "UpsertData", "InsertData", "UpdateData", "DeleteData", "UpsertDE", "InsertDE", "UpdateDE", "DeleteDE",
  "RaiseError", "Add", "Subtract", "Multiply", "Divide", "Mod", "Random", "GUID", "Domain", "BuildRowsetFromString", "BuildRowsetFromXML",
  "Base64Encode", "Base64Decode", "MD5", "SHA1", "SHA256", "EncryptSymmetric", "DecryptSymmetric", "URLEncode", "StringToDate",
  "SystemDateToLocalDate", "LocalDateToSystemDate", "ContentImageByKey", "Image", "ImageLink", "Char", "RegExMatch", "IsEmailAddress",
  "IsPhoneNumber", "ClaimRow", "ClaimRowValue", "Redirect", "WAT", "WATP", "GetPortfolioItem", "BeginImpressionRegion", "EndImpressionRegion",
];

/**
 * Registers an "html-ampscript" language: HTML highlighting plus AMPscript
 * blocks (%%[ ... ]%%), inline expressions (%%= ... =%%) and personalization
 * strings (%%FirstName%%). Also registers "ampscript" for standalone snippets.
 */
export function registerEmailLanguages(monaco: typeof Monaco) {
  if (registered) return;
  registered = true;

  const ampRoot: Monaco.languages.IMonarchLanguageRule[] = [
    [/\b(?:VAR|SET|IF|ELSEIF|ELSE|ENDIF|FOR|TO|DOWNTO|NEXT|DO|THEN|AND|OR|NOT)\b/i, "keyword"],
    [new RegExp(`\\b(?:${AMPSCRIPT_FUNCTIONS.join("|")})\\b(?=\\s*\\()`, "i"), "ampscript.function"],
    [/@[A-Za-z_][\w]*/, "ampscript.variable"],
    [/"(?:[^"\\]|\\.)*"/, "string"],
    [/'(?:[^'\\]|\\.)*'/, "string"],
    [/\/\*/, "comment", "@ampComment"],
    [/-?\d+(?:\.\d+)?/, "number"],
    [/[=<>!]=?|[(),]/, "delimiter"],
  ];

  monaco.languages.register({ id: "ampscript" });
  monaco.languages.setMonarchTokensProvider("ampscript", {
    ignoreCase: true,
    tokenizer: {
      root: [
        [/%%\[|\]%%|%%=|=%%/, "ampscript.delimiter"],
        [/%%[A-Za-z_][\w ]*%%/, "ampscript.personalization"],
        ...ampRoot,
      ],
      ampComment: [[/\*\//, "comment", "@pop"], [/./, "comment"]],
    },
  });

  monaco.languages.register({ id: "html-ampscript", extensions: [".amp.html"] });
  monaco.languages.setMonarchTokensProvider("html-ampscript", {
    ignoreCase: true,
    tokenizer: {
      root: [
        [/%%\[/, { token: "ampscript.delimiter", next: "@ampBlock" }],
        [/%%=/, { token: "ampscript.delimiter", next: "@ampInline" }],
        [/%%[A-Za-z_][\w ]*%%/, "ampscript.personalization"],
        [/<script[^>]*runat=["']?server["']?[^>]*>/, { token: "tag", next: "@ssjs", nextEmbedded: "javascript" }],
        [/<!--/, "comment", "@htmlComment"],
        [/<\/?[\w:-]+/, { token: "tag", next: "@tag" }],
        [/[^<%]+/, ""],
        [/[<%]/, ""],
      ],
      ampBlock: [[/\]%%/, { token: "ampscript.delimiter", next: "@pop" }], ...ampRoot, [/\s+/, ""], [/./, ""]],
      ampInline: [[/=%%/, { token: "ampscript.delimiter", next: "@pop" }], ...ampRoot, [/\s+/, ""], [/./, ""]],
      ampComment: [[/\*\//, "comment", "@pop"], [/./, "comment"]],
      htmlComment: [[/-->/, "comment", "@pop"], [/[^-]+/, "comment"], [/./, "comment"]],
      tag: [
        [/\/?>/, { token: "tag", next: "@pop" }],
        [/%%=/, { token: "ampscript.delimiter", next: "@ampInline" }],
        [/%%[A-Za-z_][\w ]*%%/, "ampscript.personalization"],
        [/[\w:-]+(?=\s*=)/, "attribute.name"],
        [/"[^"]*"/, "attribute.value"],
        [/'[^']*'/, "attribute.value"],
        [/=/, "delimiter"],
        [/\s+/, ""],
      ],
      ssjs: [[/<\/script\s*>/, { token: "tag", next: "@pop", nextEmbedded: "@pop" }]],
    },
  } as Monaco.languages.IMonarchLanguage);
}
