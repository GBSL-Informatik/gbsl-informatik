// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

const PIP_PACKAGES = [
  "pylint",
  "flake8",
  "autopep8",
  "pytest",
  "matplotlib",
  "jupyter",
  "numpy",
  "scipy",
  "pandas",
];

interface PipPackage {
  package: string;
  version: string;
}

function configure() {
  vscode.window.showInformationMessage(`Configure vs code`);
  const configuration = vscode.workspace.getConfiguration();
  configuration
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
    }).then(() => {
      vscode.window.showInformationMessage(`configuration done`);
    });
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
                `install ${toInstall.join(" ")}`
              );
            }
            return new Promise((resolve) => resolve());
          }).then(() => {
            return configure();
          });
      }
    });
}

// this method is called when your extension is deactivated
export function deactivate() {}
