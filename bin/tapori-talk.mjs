#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  installPlugin,
  installationStatus,
  pluginSource,
  uninstallPlugin,
} from "../src/installer.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"));

function usage() {
  return `Tapori Talk ${packageJson.version}

Usage:
  tapori-talk [install] [options]
  tapori-talk status [options]
  tapori-talk doctor
  tapori-talk uninstall [options]

Options:
  --scope <user|project>  Install for every project or only the current repo
  --minimal               Install without the Bash-output compression hook
  --on-demand             Do not force the compact output style automatically
  --dry-run               Print the action without changing files
  --force                 Replace or remove an unmanaged target directory
  --json                  Print machine-readable JSON
  -h, --help              Show help
  -v, --version           Show version

Examples:
  npx -y tapori-talk
  npx -y tapori-talk install --scope project
  npx -y tapori-talk install --minimal --on-demand
  npx -y tapori-talk status
  npx -y tapori-talk uninstall
`;
}

function parseArgs(argv) {
  const options = {
    command: "install",
    scope: "user",
    minimal: false,
    onDemand: false,
    dryRun: false,
    force: false,
    json: false,
  };
  const args = [...argv];
  if (args[0] && !args[0].startsWith("-")) {
    options.command = args.shift();
  }

  while (args.length > 0) {
    const argument = args.shift();
    switch (argument) {
      case "--scope":
        options.scope = args.shift();
        break;
      case "--minimal":
      case "--no-hooks":
        options.minimal = true;
        break;
      case "--on-demand":
        options.onDemand = true;
        break;
      case "--dry-run":
        options.dryRun = true;
        break;
      case "--force":
        options.force = true;
        break;
      case "--json":
        options.json = true;
        break;
      case "-h":
      case "--help":
        options.command = "help";
        break;
      case "-v":
      case "--version":
        options.command = "version";
        break;
      default:
        throw new Error(`Unknown option: ${argument}`);
    }
  }

  if (!new Set(["user", "project"]).has(options.scope)) {
    throw new Error(`Invalid scope: ${options.scope}. Use user or project.`);
  }
  return options;
}

function print(value, asJson) {
  if (asJson) {
    process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
    return;
  }
  process.stdout.write(`${value}\n`);
}

function commandVersion(command, args = ["--version"]) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error || result.status !== 0) {
    return null;
  }
  return (result.stdout || result.stderr || "").trim() || "installed";
}

function runDoctor(asJson) {
  const report = {
    node: process.version,
    supportedNode: Number.parseInt(process.versions.node.split(".")[0], 10) >= 18,
    claude: commandVersion("claude"),
    source: pluginSource(packageRoot),
    sourceExists: fs.existsSync(pluginSource(packageRoot)),
    userTarget: path.join(os.homedir(), ".claude", "skills", "tapori-talk"),
  };
  if (asJson) {
    print(report, true);
    return report.supportedNode && report.sourceExists ? 0 : 1;
  }
  print(`Node: ${report.node} (${report.supportedNode ? "ok" : "requires >=18"})`, false);
  print(`Claude CLI: ${report.claude ?? "not found; install still works, activation needs Claude Code"}`, false);
  print(`Plugin source: ${report.sourceExists ? "ok" : "missing"} - ${report.source}`, false);
  return report.supportedNode && report.sourceExists ? 0 : 1;
}

function formatInstallResult(result) {
  const prefix = result.dryRun ? "Would install" : result.action === "updated" ? "Updated" : "Installed";
  return `${prefix} Tapori Talk ${result.version}\nTarget: ${result.target}\nScope: ${result.scope}\nHooks: ${result.minimal ? "disabled" : "enabled"}\nActivation: ${result.activation}`;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  switch (options.command) {
    case "help":
      process.stdout.write(usage());
      return 0;
    case "version":
      print(packageJson.version, options.json);
      return 0;
    case "doctor":
      return runDoctor(options.json);
    case "status": {
      const status = installationStatus(options);
      if (options.json) {
        print(status, true);
      } else if (status.installed) {
        print(`Installed: ${status.target}\nVersion: ${status.pluginVersion ?? "unknown"}\nManaged: ${status.managed ? "yes" : "no"}\nHooks: ${status.minimal ? "disabled" : "enabled"}\nActivation: ${status.activation ?? "unknown"}`, false);
      } else {
        print(`Not installed for ${options.scope} scope. Expected: ${status.target}`, false);
      }
      return status.installed ? 0 : 1;
    }
    case "uninstall": {
      const result = uninstallPlugin(options);
      if (options.json) {
        print(result, true);
      } else {
        const verb = result.action === "not-installed" ? "Not installed" : result.dryRun ? "Would remove" : "Removed";
        print(`${verb}: ${result.target}`, false);
      }
      return 0;
    }
    case "install": {
      const result = installPlugin({ ...options, packageRoot });
      if (options.json) {
        print(result, true);
      } else {
        print(formatInstallResult(result), false);
        if (!result.dryRun) {
          print("Restart Claude Code or run /reload-plugins in an open session.", false);
          print("Try: abe auth ka jhol dekh, seedha bol", false);
        }
      }
      return 0;
    }
    default:
      throw new Error(`Unknown command: ${options.command}`);
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error) => {
    process.stderr.write(`Error: ${error.message}\n\n${usage()}`);
    process.exitCode = 1;
  });
