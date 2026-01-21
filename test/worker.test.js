/**
 * Tests for the job worker
 */
import { test } from 'node:test';
import assert from 'node:assert';
import { JobQueue } from '../src/queue.js';
import { Worker } from '../src/worker.js';

test('Worker processes email jobs successfully', async () => {
  const queue = new JobQueue();
  
  queue.enqueue({
    id: 'test-1',
    type: 'email',
    payload: { recipient: 'test@example.com' }
  });

  const worker = new Worker(queue, { concurrency: 1 });
  await worker.start();

  assert.strictEqual(queue.isEmpty(), true, 'Queue should be empty after processing');
});

test('Worker processes multiple jobs with concurrency', async () => {
  const queue = new JobQueue();
  
  for (let i = 0; i < 5; i++) {
    queue.enqueue({
      id: `test-${i}`,
      type: 'email',
      payload: { recipient: `user${i}@example.com` }
    });
  }

  const worker = new Worker(queue, { concurrency: 3 });
  await worker.start();

  assert.strictEqual(queue.isEmpty(), true, 'All jobs should be processed');
});

test('Worker processes successful data jobs', async () => {
  const queue = new JobQueue();
  
  // Use recordId that won't trigger failure (not divisible by 7)
  queue.enqueue({
    id: 'data-1',
    type: 'dataProcess',
    payload: { recordId: 100 }
  });

  queue.enqueue({
    id: 'data-2',
    type: 'dataProcess',
    payload: { recordId: 102 }
  });

  const worker = new Worker(queue, { concurrency: 2 });
  await worker.start();

  assert.strictEqual(queue.isEmpty(), true, 'Data jobs should be processed');
});

test('Worker handles failing jobs without crashing and continues processing', async () => {
  const queue = new JobQueue();
  
  // Add a job that will succeed
  queue.enqueue({
    id: 'success-1',
    type: 'email',
    payload: { recipient: 'user@example.com' }
  });

  // Add a job that will fail (recordId divisible by 7)
  queue.enqueue({
    id: 'fail-1',
    type: 'dataProcess',
    payload: { recordId: 14 }
  });

  // Add another job that will succeed after the failing one
  queue.enqueue({
    id: 'success-2',
    type: 'email',
    payload: { recipient: 'admin@example.com' }
  });

  // Add another failing job
  queue.enqueue({
    id: 'fail-2',
    type: 'dataProcess',
    payload: { recordId: 21 }
  });

  // Add a final succeeding job
  queue.enqueue({
    id: 'success-3',
    type: 'dataProcess',
    payload: { recordId: 100 }
  });

  const worker = new Worker(queue, { concurrency: 1 });
  
  // This should not throw or crash the process
  await worker.start();

  // Queue should be empty - all jobs were processed
  assert.strictEqual(queue.isEmpty(), true, 'Queue should be empty after processing');

  // Check results
  const results = worker.getResults();
  
  // All 5 jobs should have results
  assert.strictEqual(results.length, 5, 'All jobs should have results');

  // Find the failed jobs
  const failedJobs = results.filter(r => r.status === 'failed');
  assert.strictEqual(failedJobs.length, 2, 'Two jobs should have failed');
  
  // Verify failures are properly recorded with error messages
  const fail1 = failedJobs.find(r => r.jobId === 'fail-1');
  assert.ok(fail1, 'Failed job fail-1 should be in results');
  assert.ok(fail1.error.includes('record 14'), 'Error message should mention the record ID');

  const fail2 = failedJobs.find(r => r.jobId === 'fail-2');
  assert.ok(fail2, 'Failed job fail-2 should be in results');
  assert.ok(fail2.error.includes('record 21'), 'Error message should mention the record ID');

  // Find the successful jobs
  const successJobs = results.filter(r => r.status === 'success');
  assert.strictEqual(successJobs.length, 3, 'Three jobs should have succeeded');
  
  // Verify succeeding jobs after failures were processed
  const success2 = successJobs.find(r => r.jobId === 'success-2');
  assert.ok(success2, 'Job success-2 should have been processed after fail-1');
  
  const success3 = successJobs.find(r => r.jobId === 'success-3');
  assert.ok(success3, 'Job success-3 should have been processed after fail-2');
});
