/**
 * /api/enhancer
 *
 * 日本語概要:
 * - 入力されたプロンプト文を「改善」するエンドポイント。
 * - AI に対して、改善結果のみをストリーミングで返すよう指示し、
 *   受け取ったチャンクから AI SDK のパース情報を除去して、テキストだけを返す。
 */
import { type ActionFunctionArgs } from '@remix-run/cloudflare';
import { StreamingTextResponse, parseStreamPart } from 'ai';
import { streamText } from '~/lib/.server/llm/stream-text';
import { stripIndents } from '~/utils/stripIndent';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export async function action(args: ActionFunctionArgs) {
  return enhancerAction(args);
}

async function enhancerAction({ context, request }: ActionFunctionArgs) {
  const { message } = await request.json<{ message: string }>();

  try {
    const result = await streamText(
      [
        {
          role: 'user',
          content: stripIndents`
          次の \`<original_prompt>\` タグで囲まれたユーザープロンプトを、より明確で効果的な内容に改善してください。

          重要: 改善後のプロンプト「のみ」を返し、それ以外は一切出力しないでください。（前置き/説明/補足は禁止）

          <original_prompt>
            ${message}
          </original_prompt>
        `,
        },
      ],
      context.cloudflare.env,
    );

    const transformStream = new TransformStream({
      transform(chunk, controller) {
        const processedChunk = decoder
          .decode(chunk)
          .split('\n')
          .filter((line) => line !== '')
          .map(parseStreamPart)
          .map((part) => part.value)
          .join('');

        controller.enqueue(encoder.encode(processedChunk));
      },
    });

    const transformedStream = result.toAIStream().pipeThrough(transformStream);

    return new StreamingTextResponse(transformedStream);
  } catch (error) {
    console.log(error);

    throw new Response(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }
}
