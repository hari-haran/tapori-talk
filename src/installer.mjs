import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const PLUGIN_NAME = "tapori-talk";
export const MARKER_FILE = ".tapori-talk-install.json";

export function resolveTarget({ scope = "user", cwd = process.cwd(), home = os.homedir() } = {}) {
  if (scope === "user") {
    return path.join(home, ".claude", "skills", PLUGIN_NAME);
  }
  if (scope === "project") {
    return path.join(cwd, ".claude", "skills", PLUGIN_NAME);
  }
  throw new Error(`Unsupported scope: ${scope}. Use user or project.`);
}

export function pluginSource(packageRoot) {
  return path.join(packageRoot, "plugins", PLUGIN_NAME);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sourceVersion(packageRoot) {
  return readJson(path.join(packageRoot, "package.json")).version;
}

function ensureSource(packageRoot) {
  const source = pluginSource(packageRoot);
  const manifest = path.join(source, ".claude-plugin", "plugin.json");
  if (!fs.existsSync(manifest)) {
    throw new Error(`Plugin source is incomplete: ${manifest}`);
  }
  return source;
}

function markerPath(target) {
  return path.join(target, MARKER_FILE);
}

function ownsTarget(target) {
  return fs.existsSync(markerPath(target));
}

function setOnDemand(target) {
  const stylePath = path.join(target, "output-styles", "tapori-talk.md");
  const style = fs.readFileSync(stylePath, "utf8");
  fs.writeFileSync(stylePath, style.replace("force-for-plugin: true", "force-for-plugin: false"), "utf8");
}

function installMarker(target, metadata) {
  fs.writeFileSync(markerPath(target), `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
}

export function installPlugin({
  packageRoot,
  scope = "user",
  cwd = process.cwd(),
  home = os.homedir(),
  dryRun = false,
  force = false,
  minimal = false,
  onDemand = false,
} = {}) {
  if (!packageRoot) {
    throw new Error("packageRoot is required");
  }

  const source = ensureSource(packageRoot);
  const target = resolveTarget({ scope, cwd, home });
  const version = sourceVersion(packageRoot);

  if (fs.existsSync(target) && !ownsTarget(target) && !force) {
    throw new Error(`Refusing to overwrite an unmanaged directory: ${target}. Re-run with --force.`);
  }

  const result = {
    action: fs.existsSync(target) ? "updated" : "installed",
    source,
    target,
    scope,
    version,
    minimal,
    activation: onDemand ? "on-demand" : "always",
    dryRun,
  };

  if (dryRun) {
    return result;
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  const suffix = `${process.pid}-${Date.now()}`;
  const temporary = `${target}.tmp-${suffix}`;
  const backup = `${target}.backup-${suffix}`;

  fs.rmSync(temporary, { recursive: true, force: true });
  fs.cpSync(source, temporary, { recursive: true });

  if (minimal) {
    fs.rmSync(path.join(temporary, "hooks"), { recursive: true, force: true });
  }
  if (onDemand) {
    setOnDemand(temporary);
  }

  installMarker(temporary, {
    installedBy: "tapori-talk",
    packageVersion: version,
    installedAt: new Date().toISOString(),
    scope,
    minimal,
    activation: result.activation,
  });

  let movedExisting = false;
  try {
    if (fs.existsSync(target)) {
      fs.renameSync(target, backup);
      movedExisting = true;
    }
    fs.renameSync(temporary, target);
    if (movedExisting) {
      fs.rmSync(backup, { recursive: true, force: true });
    }
  } catch (error) {
    fs.rmSync(temporary, { recursive: true, force: true });
    if (movedExisting && !fs.existsSync(target) && fs.existsSync(backup)) {
      fs.renameSync(backup, target);
    }
    throw error;
  }

  return result;
}

export function uninstallPlugin({
  scope = "user",
  cwd = process.cwd(),
  home = os.homedir(),
  dryRun = false,
  force = false,
} = {}) {
  const target = resolveTarget({ scope, cwd, home });
  if (!fs.existsSync(target)) {
    return { action: "not-installed", target, scope, dryRun };
  }
  if (!ownsTarget(target) && !force) {
    throw new Error(`Refusing to remove an unmanaged directory: ${target}. Re-run with --force.`);
  }
  if (!dryRun) {
    fs.rmSync(target, { recursive: true, force: true });
  }
  return { action: "uninstalled", target, scope, dryRun };
}

export function installationStatus({ scope = "user", cwd = process.cwd(), home = os.homedir() } = {}) {
  const target = resolveTarget({ scope, cwd, home });
  if (!fs.existsSync(target)) {
    return { installed: false, target, scope };
  }

  let marker = null;
  let manifest = null;
  try {
    marker = readJson(markerPath(target));
  } catch {
    marker = null;
  }
  try {
    manifest = readJson(path.join(target, ".claude-plugin", "plugin.json"));
  } catch {
    manifest = null;
  }

  return {
    installed: true,
    managed: Boolean(marker),
    target,
    scope,
    packageVersion: marker?.packageVersion ?? null,
    pluginVersion: manifest?.version ?? null,
    minimal: marker?.minimal ?? null,
    activation: marker?.activation ?? null,
  };
}
