/**
 * Background job worker with concurrent processing
 */
import { jobHandlers } from './jobs.js';

export class Worker {
  constructor(queue, options = {}) {
    this.queue = queue;
    this.concurrency = options.concurrency || 3;
    this.running = false;
    this.activeJobs = 0;
    // Track job outcomes for inspection/testing/logging
    this.jobResults = [];
  }

  /**
   * Process a single job
   */
  async processJob(job) {
    const handler = jobHandlers[job.type];
    if (!handler) {
      throw new Error(`Unknown job type: ${job.type}`);
    }
    
    console.log(`Processing job: ${job.type} (${job.id})`);
    const result = await handler(job.payload);
    console.log(`Completed job: ${job.type} (${job.id})`);
    return result;
  }

  /**
   * Execute a job and handle concurrency tracking
   */
  executeJob(job) {
    this.activeJobs++;

    // Wrap in async flow with explicit error handling to avoid unhandled rejections
    const p = (async () => {
      try {
        const result = await this.processJob(job);
        this.jobResults.push({ job, status: 'fulfilled', value: result });
        return result;
      } catch (error) {
        console.error(`Job failed: ${job.type} (${job.id})`, error);
        this.jobResults.push({ job, status: 'rejected', reason: error });
        // Do not rethrow here to prevent unhandled rejection; failure is recorded
        return null;
      } finally {
        this.activeJobs--;
      }
    })();

    return p;
  }

  /**
   * Main worker loop
   */
  async start() {
    this.running = true;
    console.log(`Worker started (concurrency: ${this.concurrency})`);

    while (this.running) {
      // Process jobs up to concurrency limit
      while (this.activeJobs < this.concurrency && !this.queue.isEmpty()) {
        const job = this.queue.dequeue();
        if (job) {
          this.executeJob(job);
        }
      }

      // Check if work is complete
      if (this.queue.isEmpty() && this.activeJobs === 0) {
        console.log('All jobs processed');
        this.running = false;
        break;
      }

      // Brief pause before next iteration
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  stop() {
    this.running = false;
  }
}
