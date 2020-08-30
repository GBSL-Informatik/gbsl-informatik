// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { join } from "path";
import { readFileSync } from "fs";

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
const PIP_PACKAGES: ToInstallPipPackage[] = [
  { package: "pylint", version: undefined },
  { package: "flake8", version: undefined },
  { package: "autopep8", version: undefined },
  { package: "pytest", version: undefined },
  { package: "ipython", version: undefined },
  { package: "matplotlib", version: undefined },
  { package: "jupyter", version: undefined },
  { package: "numpy", version: undefined },
  { package: "scipy", version: undefined },
  { package: "pandas", version: undefined },
  { package: "termcolor", version: undefined },
  { package: "smartphone-connector", version: "0.0.22" },
  { package: "pyfiglet", version: undefined },
  { package: "cowsay", version: undefined },
  { package: "inquirer", version: undefined },
  { package: "gTTS", version: undefined },
  { package: "playsound", version: undefined },
  { package: "pynput", version: undefined },
  { package: "gbsl-turtle", version: "0.0.9" },
];

const DEFAULT_USER_SETTINGS = {
  "workbench.colorTheme": "One Dark Pro",
  "editor.suggestSelection": "first",
  "vsintellicode.modify.editor.suggestSelection":
    "automaticallyOverrodeDefaultValue",
  "keyboard.dispatch": "keyCode",
  "editor.mouseWheelZoom": true,
  "workbench.activityBar.visible": true,
  "python.linting.pylintEnabled": true,
  "python.linting.enabled": true,
  "python.dataScience.alwaysTrustNotebooks": true,
  "python.dataScience.askForKernelRestart": false,
  "python.dataScience.stopOnFirstLineWhileDebugging": false,
  "python.formatting.autopep8Args": ["--select=E,W", "--max-line-length=120"],
  "editor.minimap.enabled": false,
  "workbench.settings.useSplitJSON": true,
  "python.languageServer": "Pylance",
  "breadcrumbs.enabled": false,
  "files.exclude": {
    "**/.git": true,
    "**/.svn": true,
    "**/.hg": true,
    "**/CVS": true,
    "**/.DS_Store": true,
    "**/.pytest_cache": true,
    "**/__pycache__": true,
    "**/.vscode": true,
  },
  "python.linting.pylintArgs": ["--load-plugin", "pylint_protobuf"],
  "editor.formatOnSave": true,
  "editor.formatOnPaste": true,
  "[python]": {
    "editor.tabSize": 4,
  },
  "python.analysis.autoImportCompletions": false,
  "python.showStartPage": false,
  "python.analysis.completeFunctionParens": true,
};

function setConfig() {
  const configuration = vscode.workspace.getConfiguration();
  return Object.entries(DEFAULT_USER_SETTINGS).map(async ([key, value]) => {
    try {
      return await configuration.update(
        key as any,
        value,
        vscode.ConfigurationTarget.Global
      );
    } catch (error) {
      return await setTimeout(() => {}, 0);
    }
  });
}

function configure(force: boolean = false) {
  const configuration = vscode.workspace.getConfiguration();
  const skip = configuration.get("gbsl.ignoreConfigurations", false);
  if (skip && !force) {
    vscode.window.showInformationMessage(
      "GBSL Configuration is ignored. Edit your settings"
    );
    return new Promise((resolve) => resolve());
  }
  vscode.window.showInformationMessage(`Configure vs code`);
  return Promise.all(setConfig()).then(() => {
    vscode.window.showInformationMessage(`configuration done`);
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
    .then((packages) => {
      const toUninstall = PIP_PACKAGES.filter((pkg) =>
        packages.some(
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
    .then(
      (packages): Thenable<boolean> => {
        const toInstall = PIP_PACKAGES.filter(
          (pkg) =>
            !packages.some((installed) => installed.package === pkg.package)
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
    const configVersion = (context.globalState.get("configVersion") ??
      "0.0.0") as string;
    if (configuration.get("gbsl.ignoreConfigurations", false)) {
      return;
    }
    const pluginVersion = extensionVersion(context);
    const updateConfig = pluginVersion > configVersion;

    if (updateConfig) {
      return configure(true)
        .then(() => {
          context.globalState.update("configVersion", pluginVersion);
        })
        .then(() => {
          return vscode.commands.executeCommand(
            "workbench.action.reloadWindow"
          );
        });
    } else if (reloadWindow) {
      return vscode.commands.executeCommand("workbench.action.reloadWindow");
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
