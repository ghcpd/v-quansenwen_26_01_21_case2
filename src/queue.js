/**
 * Simple in-memory job queue
 */
export class JobQueue {
  constructor() {
    this.items = [];
  }

  enqueue(job) {
    this.items.push(job);
  }

  dequeue() {
    if (this.items.length === 0) {
      return null;
    }
    return this.items.shift();
  }

  size() {
    return this.items.length;
  }

  isEmpty() {
    return this.items.length === 0;
  }
}
