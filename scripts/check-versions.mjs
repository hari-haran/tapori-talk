import fs from "node:fs";

const packageJson = JSON.parse(fs.readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const pluginJson = JSON.parse(fs.readFileSync(new URL("../plugins/tapori-talk/.claude-plugin/plugin.json", import.meta.url), "utf8"));
const marketplaceJson = JSON.parse(fs.readFileSync(new URL("../.claude-plugin/marketplace.json", import.meta.url), "utf8"));
const marketplaceEntry = marketplaceJson.plugins.find((plugin) => plugin.name === "tapori-talk");

const versions = {
  package: packageJson.version,
  plugin: pluginJson.version,
  marketplace: marketplaceEntry?.version,
};

if (!versions.marketplace || new Set(Object.values(versions)).size !== 1) {
  console.error("Version mismatch:", versions);
  process.exit(1);
}

console.log(`Versions aligned: ${versions.package}`);
