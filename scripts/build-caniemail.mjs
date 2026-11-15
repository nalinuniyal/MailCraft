// Builds src/data/caniemail.json from the MIT-licensed `caniemail` npm package
// (a packaged copy of https://www.caniemail.com data). Run: npm run data:caniemail
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
const root = process.cwd();
const pkg = JSON.parse(readFileSync(path.join(root, "node_modules/caniemail/package.json"), "utf8"));
const raw = JSON.parse(readFileSync(path.join(root, "node_modules/caniemail/data/caniemail.json"), "utf8"));
const out = {
  source: {
    name: "Can I Email",
    url: "https://www.caniemail.com",
    package: `caniemail@${pkg.version}`,
    license: "MIT (package); data © caniemail.com contributors",
    apiVersion: raw.api_version,
    lastUpdated: raw.last_update_date,
    featureCount: raw.data.length,
  },
  nicenames: raw.nicenames,
  features: raw.data.map((f) => ({
    slug: f.slug,
    title: f.title,
    category: f.category,
    url: f.url,
    lastTestDate: f.last_test_date,
    notes: f.notes ?? null,
    notesByNum: f.notes_by_num ?? {},
    stats: f.stats,
  })),
};
writeFileSync(path.join(root, "src/data/caniemail.json"), JSON.stringify(out));
console.log(`Wrote ${out.features.length} features (data updated ${out.source.lastUpdated})`);
