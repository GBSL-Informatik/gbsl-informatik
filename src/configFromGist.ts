import * as vscode from "vscode";
import { default as axios } from "axios";
import * as _ from "lodash";

function vscodeConfigFromGist(): Promise<Object> {
  const config = vscode.workspace.getConfiguration();
  const gistUrl = config.get("gbsl.gistConfigurationUrl");
  if (!gistUrl || gistUrl === "") {
    return new Promise((resolve) => resolve({}));
  }
  return axios
    .get(`${gistUrl}/raw`, { responseType: "json" })
    .then((data) => {
      if (typeof data.data !== "object") {
        throw new Error("Invalid JSON in configuration");
      }
      return data.data;
    })
    .catch((error) => {
      vscode.window.showErrorMessage(
        `Gist Content could not be downloaded from ${gistUrl}: ${error}`
      );
      return {};
    });
}

export function setGistConfig(): Promise<
  {
    name: string;
    value: any;
    updated: boolean;
  }[]
> {
  return vscodeConfigFromGist().then((config) => {
    const configuration = vscode.workspace.getConfiguration();
    const toUpdate = Object.entries(config).filter(([key, value]) => {
      if (!configuration.has(key)) {
        return true;
      }
      if (!_.isEqual(configuration.get(key), value)) {
        return true;
      }
      return false;
    });
    return Promise.all(
      toUpdate.map(async ([key, value]) => {
        try {
          return await configuration
            .update(key as any, value, vscode.ConfigurationTarget.Global)
            .then(() => ({ name: key, value: value, updated: true }));
        } catch (error) {
          return { name: key, value: value, updated: false };
        }
      })
    );
  });
}
