const APP_SHELL_PATH = "../components/shell.js";
let appShellModule;

async function getAppShellModule() {
  if (!appShellModule) appShellModule = import(APP_SHELL_PATH);
  return appShellModule;
}

export async function renderAppShell(...args) {
  const { renderShell } = await getAppShellModule();
  return renderShell(...args);
}

export async function applyAppImageLoadMotion(root) {
  const { applyImageLoadMotion } = await getAppShellModule();
  return applyImageLoadMotion(root);
}
