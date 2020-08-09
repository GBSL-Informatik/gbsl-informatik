// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { join } from "path";
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
  "pynput"
];

interface PipPackage {
  package: string;
  version: string;
}

function configure() {
  vscode.window.showInformationMessage(`Configure vs code`);
  const configuration = vscode.workspace.getConfiguration();
  return configuration
    .update(
      "python.languageServer",
      "Microsoft",
      vscode.ConfigurationTarget.Global
    )
    .then(() => {
      configuration.update(
        "editor.mouseWheelZoom",
        true,
        vscode.ConfigurationTarget.Global
      );
    })
    .then(() => {
      configuration.update(
        "python.linting.pylintEnabled",
        true,
        vscode.ConfigurationTarget.Global
      );
    })
    .then(() => {
      configuration.update(
        "python.linting.enabled",
        true,
        vscode.ConfigurationTarget.Global
      );
    })
    .then(() => {
      configuration.update(
        "python.dataScience.alwaysTrustNotebooks",
        true,
        vscode.ConfigurationTarget.Global
      );
    })
    .then(() => {
      vscode.window.showInformationMessage(`configuration done`);
    });
}

function extensionVersion(context: vscode.ExtensionContext) {
  var extensionPath = join(context.extensionPath, "package.json");
  var packageFile = JSON.parse(readFileSync(extensionPath, 'utf8'));

  return packageFile?.version ?? '0.0.1';
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
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
            const configVersion = context.globalState.get('configVersion');
            const pluginVersion = extensionVersion(context);
            if (configVersion !== pluginVersion) {
              return configure().then(() => {
                context.globalState.update('configVersion', pluginVersion);
              });
            }
          });
      }
    });
}

// this method is called when your extension is deactivated
export function deactivate() {}
