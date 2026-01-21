/**
 * Job runner demo entrypoint
 */
import { JobQueue } from './queue.js';
import { Worker } from './worker.js';

async function main() {
  console.log('Initializing job runner...\n');

  // Create queue and seed with jobs
  const queue = new JobQueue();

  // Add various jobs to the queue
  queue.enqueue({
    id: 'job-1',
    type: 'email',
    payload: { recipient: 'user@example.com', subject: 'Welcome' }
  });

  queue.enqueue({
    id: 'job-2',
    type: 'dataProcess',
    payload: { recordId: 101 }
  });

  queue.enqueue({
    id: 'job-3',
    type: 'email',
    payload: { recipient: 'admin@example.com', subject: 'Report' }
  });

  queue.enqueue({
    id: 'job-4',
    type: 'dataProcess',
    payload: { recordId: 14 }  // This will trigger failure (14 % 7 === 0)
  });

  queue.enqueue({
    id: 'job-5',
    type: 'email',
    payload: { recipient: 'support@example.com', subject: 'Update' }
  });

  console.log(`Queued ${queue.size()} jobs\n`);

  // Start worker
  const worker = new Worker(queue, { concurrency: 2 });
  await worker.start();

  console.log('\nJob runner completed');
}

main();
