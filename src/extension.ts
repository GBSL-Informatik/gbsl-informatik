// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import { setGistConfig } from "./configFromGist";
import { Logger } from "./logger";

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
  return setGistConfig().then((settings) => {
    const successful = settings.filter(
      (s) => s.updated && s.name !== "files.exclude"
    );
    const err = settings.filter((s) => !s.updated);
    const errMsg =
      err.length < 5
        ? `could not update ${err.map((s) => s.name).join(", ")}`
        : `could not update ${err.length} settings`;
    if (successful.length > 5) {
      Logger.log(
        `configured ${successful.length} settings${
          err.length > 0 ? errMsg : ""
        }`
      );
    } else if (successful.length > 0) {
      Logger.log(
        `configured ${successful.map((s) => s.name).join(", ")} ${
          err.length > 0 ? errMsg : ""
        }`
      );
    } else if (err.length > 0) {
      Logger.log(errMsg);
    }
    return successful.length;
  });
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  Logger.configure("gsbl-informatik", "GBSL Informatik");
  const configuration = vscode.workspace.getConfiguration();

  if (!configuration.get("gbsl.ignoreConfigurations", false)) {
    configure(false, true);
  }

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
          Logger.log("Configured GBSL settings");
        });
    }
  );

  context.subscriptions.push(configureDisposer);
}

// this method is called when your extension is deactivated
export function deactivate() {}
