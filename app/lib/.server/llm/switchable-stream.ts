/**
 * SwitchableStream
 *
 * 日本語概要:
 * - 現在の読み取り元 ReadableStream を途中で別ストリームへ切り替え可能な TransformStream。
 * - LLM 応答がトークン上限で中断された際の「継続」ストリーム差し替えに利用する。
 */
export default class SwitchableStream extends TransformStream {
  private _controller: TransformStreamDefaultController | null = null;
  private _currentReader: ReadableStreamDefaultReader | null = null;
  private _switches = 0;

  constructor() {
    let controllerRef: TransformStreamDefaultController | undefined;

    super({
      start(controller) {
        controllerRef = controller;
      },
    });

    if (controllerRef === undefined) {
      throw new Error('Controller not properly initialized');
    }

    this._controller = controllerRef;
  }

  /**
   * 読み取り元ストリームを差し替える（前の reader は cancel）。
   */
  async switchSource(newStream: ReadableStream) {
    if (this._currentReader) {
      await this._currentReader.cancel();
    }

    this._currentReader = newStream.getReader();

    this._pumpStream();

    this._switches++;
  }

  /**
   * 現在の reader から読み取り、到着チャンクをそのまま下流へ enqueue。
   */
  private async _pumpStream() {
    if (!this._currentReader || !this._controller) {
      throw new Error('Stream is not properly initialized');
    }

    try {
      while (true) {
        const { done, value } = await this._currentReader.read();

        if (done) {
          break;
        }

        this._controller.enqueue(value);
      }
    } catch (error) {
      console.log(error);
      this._controller.error(error);
    }
  }

  /**
   * 現在の reader をキャンセルし、コントローラを terminate。
   */
  close() {
    if (this._currentReader) {
      this._currentReader.cancel();
    }

    this._controller?.terminate();
  }

  get switches() {
    return this._switches;
  }
}
