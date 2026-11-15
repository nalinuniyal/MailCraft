/** Formats HTML with Prettier in the browser (lazy-loaded). */
export async function formatHtml(source: string): Promise<string> {
  const [prettier, html, postcss] = await Promise.all([
    import("prettier/standalone"),
    import("prettier/plugins/html"),
    import("prettier/plugins/postcss"),
  ]);
  return prettier.format(source, {
    parser: "html",
    plugins: [html, postcss],
    printWidth: 120,
    tabWidth: 2,
    htmlWhitespaceSensitivity: "css",
    bracketSameLine: false,
  });
}
