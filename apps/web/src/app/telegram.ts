import { backButton, init, miniApp, retrieveRawInitData, themeParams, viewport } from '@tma.js/sdk-react';

export interface TelegramBootstrapResult {
  initData: string | null;
  sdkAvailable: boolean;
}

function setInsetVariables(): void {
  const safe = viewport.safeAreaInsets();
  const content = viewport.contentSafeAreaInsets();
  const root = document.documentElement;
  root.style.setProperty('--tg-safe-area-inset-top', `${safe.top}px`);
  root.style.setProperty('--tg-safe-area-inset-right', `${safe.right}px`);
  root.style.setProperty('--tg-safe-area-inset-bottom', `${safe.bottom}px`);
  root.style.setProperty('--tg-safe-area-inset-left', `${safe.left}px`);
  root.style.setProperty('--tg-content-safe-area-inset-top', `${content.top}px`);
  root.style.setProperty('--tg-content-safe-area-inset-right', `${content.right}px`);
  root.style.setProperty('--tg-content-safe-area-inset-bottom', `${content.bottom}px`);
  root.style.setProperty('--tg-content-safe-area-inset-left', `${content.left}px`);
}

export async function bootstrapTelegram(): Promise<TelegramBootstrapResult> {
  try {
    init();
    themeParams.mount();
    themeParams.bindCssVars();
    miniApp.mount();
    miniApp.bindCssVars();
    backButton.mount();
    await viewport.mount();
    viewport.bindCssVars();
    viewport.expand();
    setInsetVariables();
    viewport.safeAreaInsets.sub(setInsetVariables);
    viewport.contentSafeAreaInsets.sub(setInsetVariables);
    miniApp.ready();
    return { initData: retrieveRawInitData() ?? null, sdkAvailable: true };
  } catch {
    return { initData: null, sdkAvailable: false };
  }
}
