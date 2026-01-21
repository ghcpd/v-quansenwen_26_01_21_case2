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

// Regression: failing job must be handled without unhandled rejection and other jobs continue
test('Worker handles failing data job and continues processing', async () => {
  const queue = new JobQueue();

  // Failing job (14 % 7 === 0)
  queue.enqueue({
    id: 'fail-1',
    type: 'dataProcess',
    payload: { recordId: 14 }
  });

  // Successful jobs queued after the failure
  queue.enqueue({
    id: 'ok-1',
    type: 'dataProcess',
    payload: { recordId: 15 }
  });

  queue.enqueue({
    id: 'ok-2',
    type: 'email',
    payload: { recipient: 'after-failure@example.com' }
  });

  const worker = new Worker(queue, { concurrency: 2 });
  await worker.start();

  // Queue should be empty; worker should not crash under strict unhandled rejection behavior
  assert.strictEqual(queue.isEmpty(), true, 'All jobs (including failing one) should be attempted');

  const failed = worker.jobResults.filter(r => r.status === 'rejected');
  const succeeded = worker.jobResults.filter(r => r.status === 'fulfilled');

  assert.strictEqual(failed.length, 1, 'Exactly one job should fail');
  assert.strictEqual(failed[0].job.id, 'fail-1');
  assert.ok(failed[0].reason instanceof Error, 'Failure reason should be an Error');

  // Ensure subsequent jobs still ran
  const succeededIds = succeeded.map(r => r.job.id).sort();
  assert.deepStrictEqual(succeededIds, ['ok-1', 'ok-2'].sort());
});
