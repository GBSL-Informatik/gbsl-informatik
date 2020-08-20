// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { join } from "path";
import { readFileSync } from "fs";

interface PipPackage {
  package: string;
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
  { package: "smartphone-connector", version: undefined },
  { package: "pyfiglet", version: undefined },
  { package: "cowsay", version: undefined },
  { package: "inquirer", version: undefined },
  { package: "gTTS", version: undefined },
  { package: "playsound", version: undefined },
  { package: "pynput", version: undefined },
  { package: "gbsl-turtle", version: undefined },
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
  const skip = configuration.get("gbsl.ignore_configurations", false);
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

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const configuration = vscode.workspace.getConfiguration();
  // vscode.commands.executeCommand('setContext', 'python.showPlayIcon', false);
  vscode.commands
    .executeCommand("python2go.isPythonInstalled")
    .then((isInstalled) => {
      if (isInstalled) {
        vscode.commands
          .executeCommand("python2go.pipPackages")
          .then((pkgs: any) => {
            const packages = pkgs as PipPackage[];
            const toUninstall = PIP_PACKAGES.filter((pkg) =>
              packages.some(
                (installed) =>
                  installed.package === pkg.package &&
                  pkg.version !== undefined &&
                  installed.version !== pkg.version
              )
            );
            console.log(toUninstall);
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
            }).then(() => {
              const toInstall = PIP_PACKAGES.filter(
                (pkg) =>
                  !packages.some(
                    (installed) => installed.package === pkg.package
                  )
              );
              if (toInstall.length > 0) {
                const target = process.platform === "win32" ? "--user" : "";
                const toInstallPkgs = toInstall.map((pkg) =>
                  pkg.version ? `${pkg.package}==${pkg.version}` : pkg.package
                );
                return vscode.commands.executeCommand(
                  "python2go.pip",
                  `install ${target} ${toInstallPkgs.join(" ")}`
                );
              }
              return new Promise((resolve) => resolve());
            });
          })
          .then(() => {
            const configVersion = (context.globalState.get("configVersion") ??
              "0.0.0") as string;
            if (configuration.get("gbsl.ignore_configurations", false)) {
              return;
            }
            const pluginVersion = extensionVersion(context);
            const updateConfig = pluginVersion > configVersion;

            if (updateConfig) {
              return configure(true).then(() => {
                context.globalState.update("configVersion", pluginVersion);
              });
            }
          });
      }
    });

  let configureDisposer = vscode.commands.registerCommand(
    "gbsl.configure",
    () => {
      return configure(true).then(() => {
        vscode.window.showInformationMessage("Configured GBSL settings");
      });
    }
  );

  let runDebugDisposer = vscode.commands.registerCommand(
    "gbsl.run_debug",
    () => {
      return vscode.debug.startDebugging(undefined, {
        name: "Python: Aktuelle Datei",
        type: "python",
        request: "launch",
        program: "${file}",
        console: "integratedTerminal",
        internalConsoleOptions: "neverOpen",
        justMyCode: true,
        showReturnValue: true,
        stopOnEntry: false,
      });
    }
  );

  let runDebugAndStopDisposer = vscode.commands.registerCommand(
    "gbsl.run_and_stop",
    () => {
      return vscode.debug.startDebugging(undefined, {
        name: "Python: Aktuelle Datei und Stopp beim Start",
        type: "python",
        request: "launch",
        program: "${file}",
        console: "integratedTerminal",
        internalConsoleOptions: "neverOpen",
        justMyCode: true,
        showReturnValue: true,
        stopOnEntry: true,
      });
    }
  );
  context.subscriptions.push(configureDisposer);
  context.subscriptions.push(runDebugDisposer);
  context.subscriptions.push(runDebugAndStopDisposer);
}

// this method is called when your extension is deactivated
export function deactivate() {}
