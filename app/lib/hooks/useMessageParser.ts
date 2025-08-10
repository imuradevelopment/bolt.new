/**
 * useMessageParser
 *
 * 日本語概要:
 * - LLM のストリーミング出力を逐次パースし、
 *   <boltArtifact>/<boltAction> タグを検出して Workbench に反映するためのフック。
 * - 「表示用テキスト」と「制御タグ」を分離し、表示側にはタグ抜きのテキストを返す。
 * - 途中でストリームが区切られても継続可能なよう、パーサはメッセージ ID ごとに状態を保持する。
 */
import type { Message } from 'ai';
import { useCallback, useState } from 'react';
import { StreamingMessageParser } from '~/lib/runtime/message-parser';
import { workbenchStore } from '~/lib/stores/workbench';
import { createScopedLogger } from '~/utils/logger';

const logger = createScopedLogger('useMessageParser');

// パーサにイベントコールバックを登録し、アーティファクト/アクションの開始・終了を Workbench に通知
const messageParser = new StreamingMessageParser({
  callbacks: {
    onArtifactOpen: (data) => {
      logger.trace('onArtifactOpen', data);

      workbenchStore.showWorkbench.set(true);
      workbenchStore.addArtifact(data);
    },
    onArtifactClose: (data) => {
      logger.trace('onArtifactClose');

      workbenchStore.updateArtifact(data, { closed: true });
    },
    onActionOpen: (data) => {
      logger.trace('onActionOpen', data.action);

      // shell アクションはクローズ時に内容が確定するため、オープンでは追加しない
      if (data.action.type !== 'shell') {
        workbenchStore.addAction(data);
      }
    },
    onActionClose: (data) => {
      logger.trace('onActionClose', data.action);

      if (data.action.type === 'shell') {
        workbenchStore.addAction(data);
      }

      workbenchStore.runAction(data);
    },
  },
});

/**
 * 表示用メッセージの状態と、メッセージ配列のパース関数を提供する。
 * - isLoading=false かつ DEV の場合は、HMR に備えてパーサ状態をリセットして再構築する。
 */
export function useMessageParser() {
  const [parsedMessages, setParsedMessages] = useState<{ [key: number]: string }>({});

  const parseMessages = useCallback((messages: Message[], isLoading: boolean) => {
    let reset = false;

    if (import.meta.env.DEV && !isLoading) {
      reset = true;
      messageParser.reset();
    }

    for (const [index, message] of messages.entries()) {
      if (message.role === 'assistant') {
        const newParsedContent = messageParser.parse(message.id, message.content);

        setParsedMessages((prevParsed) => ({
          ...prevParsed,
          [index]: !reset ? (prevParsed[index] || '') + newParsedContent : newParsedContent,
        }));
      }
    }
  }, []);

  return { parsedMessages, parseMessages };
}
