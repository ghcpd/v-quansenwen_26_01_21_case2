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
    this.results = [];
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
    
    this.processJob(job)
      .then((result) => {
        this.results.push({ jobId: job.id, status: 'success', result });
        this.activeJobs--;
      })
      .catch((error) => {
        console.error(`Job failed: ${job.type} (${job.id}) - ${error.message}`);
        this.results.push({ jobId: job.id, status: 'failed', error: error.message });
        this.activeJobs--;
      });
  }

  /**
   * Get results of all processed jobs
   */
  getResults() {
    return this.results;
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
