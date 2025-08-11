export default class SwitchableStream {
  private controller: ReadableStreamDefaultController<Uint8Array> | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private source: ReadableStream<Uint8Array> | null = null;
  public switches = 0;

  public readable = new ReadableStream<Uint8Array>({
    start: (controller) => {
      this.controller = controller;
    },
    cancel: async () => {
      await this.reader?.cancel();
    },
  });

  switchSource(stream: ReadableStream<Uint8Array>) {
    this.switches += 1;
    this.source = stream;
    this.reader = stream.getReader();

    const pump = async () => {
      if (!this.reader || !this.controller) return;
      try {
        const { done, value } = await this.reader.read();
        if (done) {
          return;
        }
        this.controller.enqueue(value);
        pump();
      } catch (error) {
        this.controller?.error(error);
        await this.reader?.cancel();
      }
    };

    pump();
  }

  close() {
    this.controller?.close();
  }
}


