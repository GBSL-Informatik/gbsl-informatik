// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { join, resolve } from "path";
import { readFileSync } from "fs";

const PIP_PACKAGES = [
  "pylint",
  "flake8",
  "autopep8",
  "pytest",
  "matplotlib",
  "jupyter",
  "ipython",
  "numpy",
  "scipy",
  "pandas",
  "termcolor",
  "smartphone-connector",
  "pyfiglet",
  "cowsay",
  "inquirer",
  "gTTS",
  "playsound",
  "pynput",
];

const DEFAULT_USER_SETTINGS = {
  "workbench.colorTheme": "One Dark Pro",
  "editor.suggestSelection": "first",
  "vsintellicode.modify.editor.suggestSelection":
    "automaticallyOverrodeDefaultValue",
  "keyboard.dispatch": "keyCode",
  "editor.mouseWheelZoom": true,
  "python.languageServer": "Microsoft",
  "workbench.activityBar.visible": true,
  "python.linting.pylintEnabled": true,
  "python.linting.enabled": true,
  "python.dataScience.alwaysTrustNotebooks": true,
  "python.dataScience.askForKernelRestart": false,
  "python.dataScience.stopOnFirstLineWhileDebugging": false,
  "python.formatting.autopep8Args": ["--select=E,W", "--max-line-length=120"],
  "editor.minimap.enabled": false,
  "workbench.settings.useSplitJSON": true,
};

interface PipPackage {
  package: string;
  version: string;
}

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

function configure() {
  const configuration = vscode.workspace.getConfiguration();
  const skip = configuration.get('gbsl.ignore_configurations', false);
  if (skip) {
    vscode.window.showInformationMessage('GBSL Configuration is ignored. Edit your settings');
    return new Promise(resolve => resolve());
  }
  vscode.window.showInformationMessage(`Configure vs code`);
  return Promise.all(setConfig()).then(() => {
    vscode.window.showInformationMessage(`configuration done`);
  });
}

function extensionVersion(context: vscode.ExtensionContext) {
  var extensionPath = join(context.extensionPath, "package.json");
  var packageFile = JSON.parse(readFileSync(extensionPath, "utf8"));

  return packageFile?.version ?? "0.0.1";
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  const configuration = vscode.workspace.getConfiguration();
  vscode.commands
    .executeCommand("python2go.isPythonInstalled")
    .then((isInstalled) => {
      if (isInstalled) {
        vscode.commands
          .executeCommand("python2go.pipPackages")
          .then((pkgs: any) => {
            const packages = pkgs as PipPackage[];
            const toInstall = PIP_PACKAGES.filter(
              (pkg) => !packages.some((installed) => installed.package === pkg)
            );
            if (toInstall.length > 0) {
              return vscode.commands.executeCommand(
                "python2go.pip",
                `install --user ${toInstall.join(" ")}`
              );
            }
            return new Promise((resolve) => resolve());
          })
          .then(() => {
            if (configuration.get('gbsl.ignore_configurations', false)) {
              return;
            }
            const configVersion = context.globalState.get("configVersion");
            const pluginVersion = extensionVersion(context);
            if (configVersion !== pluginVersion) {
              return configure().then(() => {
                context.globalState.update("configVersion", pluginVersion);
              });
            }
          });
      }
    });

  let configureDisposer = vscode.commands.registerCommand(
    "gbsl.configure",
    () => {
      return configure().then(() => {
        vscode.window.showInformationMessage("Configured GBSL settings");
      });
    }
  );
  context.subscriptions.push(configureDisposer);
}

// this method is called when your extension is deactivated
export function deactivate() {}
