/**
 * WebContainer 起動/共有モジュール
 *
 * 日本語概要:
 * - ブラウザ内の WebContainer（Node.js 実行環境）を 1 度だけ起動し、
 *   HMR（ホットリロード）間でも同じインスタンス/状態を共有する。
 * - SSR 中は何もしない（サーバ側レンダリング時はブラウザ環境がないため）。
 */
import { WebContainer } from '@webcontainer/api';
import { WORK_DIR_NAME } from '~/utils/constants';

// HMR 間で状態を保持するためのコンテキスト
interface WebContainerContext {
  loaded: boolean;
}

export const webcontainerContext: WebContainerContext = import.meta.hot?.data.webcontainerContext ?? {
  loaded: false,
};

if (import.meta.hot) {
  import.meta.hot.data.webcontainerContext = webcontainerContext;
}

// SSR 中はダミー Promise、クライアント側でのみ実体を代入
export let webcontainer: Promise<WebContainer> = new Promise(() => {});

if (!import.meta.env.SSR) {
  webcontainer =
    import.meta.hot?.data.webcontainer ??
    Promise.resolve()
      .then(() => {
        return WebContainer.boot({ workdirName: WORK_DIR_NAME });
      })
      .then((webcontainer) => {
        webcontainerContext.loaded = true;
        return webcontainer;
      });

  if (import.meta.hot) {
    import.meta.hot.data.webcontainer = webcontainer;
  }
}
