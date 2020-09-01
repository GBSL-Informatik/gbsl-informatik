// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { join } from "path";
import { readFileSync } from "fs";
import { default as axios } from "axios";
import { setGistConfig } from "./configFromGist";

let pip_packages_cached: ToInstallPipPackage[] = [];
/**
 *
 * @param gistUrl url to the gist (not the raw), e.g https://gist.github.com/lebalz/8224837c3e4238288bbf2bda5af17fdf
 */
function pip_packages(gistUrl: string): Promise<ToInstallPipPackage[]> {
  if (pip_packages_cached.length > 0) {
    return new Promise((resolve) => resolve(pip_packages_cached));
  }
  return axios
    .get(`${gistUrl}/raw`, { responseType: "json" })
    .then((data) => {
      pip_packages_cached = data.data;
      return data.data as ToInstallPipPackage[];
    })
    .then((error) => {
      return [] as ToInstallPipPackage[];
    });
}

interface PipPackage {
  package: string;
  version: string;
}

interface PyVersion {
  major: number;
  minor: number;
  release: number;
  version: string;
}

interface ToInstallPipPackage {
  package: string;
  version?: string;
}

function configure(
  force: boolean = false,
  silent: boolean = false
): Promise<number> {
  const configuration = vscode.workspace.getConfiguration();
  const skip = configuration.get("gbsl.ignoreConfigurations", false);
  if (skip && !force) {
    if (!silent) {
      vscode.window.showInformationMessage(
        "GBSL Configuration is ignored. Edit your settings"
      );
    }
    return new Promise((resolve) => resolve(0));
  }
  return setGistConfig().then((updatedPkgs) => {
    vscode.window.showInformationMessage(`configured ${updatedPkgs} settings`);
    return updatedPkgs;
  });
}

function extensionVersion(context: vscode.ExtensionContext): string {
  var extensionPath = join(context.extensionPath, "package.json");
  var packageFile = JSON.parse(readFileSync(extensionPath, "utf8"));

  return packageFile?.version ?? "0.0.1";
}

function uninstallWrongPipVersions() {
  return vscode.commands
    .executeCommand("python2go.pipPackages")
    .then((pkgs: any) => {
      return pkgs as PipPackage[];
    })
    .then((installed) => {
      return pip_packages(
        "https://gist.github.com/lebalz/8224837c3e4238288bbf2bda5af17fdf"
      ).then((toInstall) => {
        return {
          installed: installed,
          toInstall: toInstall,
        };
      });
    })
    .then((packages) => {
      const toUninstall = packages.toInstall.filter((pkg) =>
        packages.installed.some(
          (installed) =>
            installed.package === pkg.package &&
            pkg.version !== undefined &&
            installed.version !== pkg.version
        )
      );
      return new Promise((resolve) => {
        if (toUninstall.length === 0) {
          return resolve(true);
        }
        return resolve(
          vscode.commands.executeCommand(
            "python2go.pip",
            `uninstall -y ${toUninstall.map((p) => p.package).join(" ")}`
          )
        );
      });
    })
    .then(() => {
      return true;
    });
}

function isPythonInstalled(): Thenable<PyVersion | undefined | false> {
  return vscode.commands.executeCommand<PyVersion | false>(
    "python2go.isPythonInstalled"
  );
}

function installPipPackages(): Thenable<boolean> {
  if (vscode.workspace.getConfiguration().get("gbsl.ignorePipInstall", false)) {
    return new Promise((resolve) => resolve(false));
  }
  return isPythonInstalled()
    .then((isInstalled) => {
      if (!isInstalled) {
        throw new Error("Python not installed");
      }
    })
    .then(() => {
      return uninstallWrongPipVersions();
    })
    .then(() => {
      return vscode.commands.executeCommand("python2go.pipPackages");
    })
    .then((pkgs: any) => {
      return pkgs as PipPackage[];
    })
    .then((installed) => {
      return pip_packages(
        "https://gist.github.com/lebalz/8224837c3e4238288bbf2bda5af17fdf"
      ).then((toInstall) => {
        return {
          installed: installed,
          toInstall: toInstall,
        };
      });
    })
    .then(
      (packages): Thenable<boolean> => {
        const toInstall = packages.toInstall.filter(
          (pkg) =>
            !packages.installed.some(
              (installed) => installed.package === pkg.package
            )
        );
        if (toInstall.length > 0) {
          const target = process.platform === "win32" ? "--user" : "";
          const toInstallPkgs = toInstall.map((pkg) =>
            pkg.version ? `${pkg.package}==${pkg.version}` : pkg.package
          );
          return vscode.commands
            .executeCommand(
              "python2go.pip",
              `install ${target} ${toInstallPkgs.join(" ")}`
            )
            .then(() => new Promise((resolve) => resolve(true)));
        }
        return new Promise((resolve) => resolve(false));
      }
    )
    .then(
      (result) => {
        return result;
      },
      (err) => {
        console.log(err);
        return false;
      }
    );
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const configuration = vscode.workspace.getConfiguration();

  installPipPackages().then((reloadWindow) => {
    if (configuration.get("gbsl.ignoreConfigurations", false)) {
      if (reloadWindow) {
        vscode.commands.executeCommand("workbench.action.reloadWindow");
      }
      return;
    }

    return configure(false, true).then((updatedConfigs) => {
      if (updatedConfigs > 0 || reloadWindow) {
        return vscode.commands.executeCommand("workbench.action.reloadWindow");
      }
    });
  });

  vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration("gbsl.gistConfigurationUrl")) {
      configure();
    }
  });

  let configureDisposer = vscode.commands.registerCommand(
    "gbsl.configure",
    () => {
      return vscode.commands
        .executeCommand("python2go.configure")
        .then(
          () => {
            return configure(true);
          },
          /** configure gbsl settings anyway */
          () => {
            return configure(true);
          }
        )
        .then(() => {
          vscode.window.showInformationMessage("Configured GBSL settings");
        })
        .then(() => {
          return vscode.commands.executeCommand(
            "workbench.action.reloadWindow"
          );
        });
    }
  );

  context.subscriptions.push(configureDisposer);
}

// this method is called when your extension is deactivated
export function deactivate() {}
