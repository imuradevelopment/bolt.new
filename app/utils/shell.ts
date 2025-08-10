/**
 * ターミナル（xterm）と WebContainer のシェル（jsh）を接続するユーティリティ
 *
 * 日本語概要:
 * - /bin/jsh を起動し、OSC (Operating System Command) を用いた "interactive" シグナルを待ってから
 *   ユーザー入力をパイプする。これにより、まだ描画前にキー入力が失われる問題を回避する。
 */
import type { WebContainer } from '@webcontainer/api';
import type { ITerminal } from '~/types/terminal';
import { withResolvers } from './promises';

export async function newShellProcess(webcontainer: WebContainer, terminal: ITerminal) {
  const args: string[] = [];

  // we spawn a JSH process with a fallback cols and rows in case the process is not attached yet to a visible terminal
  const process = await webcontainer.spawn('/bin/jsh', ['--osc', ...args], {
    terminal: {
      cols: terminal.cols ?? 80,
      rows: terminal.rows ?? 15,
    },
  });

  const input = process.input.getWriter();
  const output = process.output;

  // jsh から "interactive" が届くまで入力を抑止するための待機
  const jshReady = withResolvers<void>();

  let isInteractive = false;

  output.pipeTo(
    new WritableStream({
      write(data) {
        if (!isInteractive) {
          const [, osc] = data.match(/\x1b\]654;([^\x07]+)\x07/) || [];

          if (osc === 'interactive') {
            // interactive シグナルが来るまでは入力を送らない
            isInteractive = true;

            jshReady.resolve();
          }
        }

        terminal.write(data);
      },
    }),
  );

  terminal.onData((data) => {
    if (isInteractive) {
      input.write(data);
    }
  });

  await jshReady.promise;

  return process;
}
