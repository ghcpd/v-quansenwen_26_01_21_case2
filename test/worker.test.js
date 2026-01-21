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

test('Worker handles failing job without exiting and continues processing', async () => {
  const queue = new JobQueue();

  queue.enqueue({
    id: 'fail-1',
    type: 'dataProcess',
    payload: { recordId: 14 }
  });

  queue.enqueue({
    id: 'ok-email',
    type: 'email',
    payload: { recipient: 'ok@example.com' }
  });

  queue.enqueue({
    id: 'ok-data',
    type: 'dataProcess',
    payload: { recordId: 15 }
  });

  const worker = new Worker(queue, { concurrency: 2 });
  await worker.start();

  assert.strictEqual(queue.isEmpty(), true, 'Queue should drain even when a job fails');

  const statusMap = worker.results.reduce((acc, entry) => {
    acc[entry.jobId] = entry.status;
    return acc;
  }, {});

  assert.strictEqual(statusMap['fail-1'], 'rejected', 'Failing job should be recorded as rejected');
  assert.strictEqual(statusMap['ok-email'], 'fulfilled', 'Subsequent jobs should succeed');
  assert.strictEqual(statusMap['ok-data'], 'fulfilled', 'Worker should keep processing after a failure');
});
