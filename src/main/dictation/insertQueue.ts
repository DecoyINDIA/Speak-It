export interface InsertTask {
  id: string;
  text: string;
  expectHwnd?: number;
  pressEnter?: boolean;
  execute: () => Promise<{ outcome: string; reason?: string }>;
  resolve: (res: { outcome: string; reason?: string }) => void;
  reject: (err: any) => void;
}

export class InsertQueue {
  private queue: InsertTask[] = [];
  private isProcessing = false;

  public enqueue(
    task: Omit<InsertTask, 'resolve' | 'reject'>
  ): Promise<{ outcome: string; reason?: string }> {
    return new Promise<{ outcome: string; reason?: string }>((resolve, reject) => {
      this.queue.push({
        ...task,
        resolve,
        reject,
      });
      this.processNext();
    });
  }

  private async processNext(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    const task = this.queue.shift()!;

    try {
      const result = await task.execute();
      task.resolve(result);
    } catch (err) {
      task.reject(err);
    } finally {
      this.isProcessing = false;
      this.processNext();
    }
  }

  public get pendingCount(): number {
    return this.queue.length;
  }
}
