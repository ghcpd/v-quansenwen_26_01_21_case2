/**
 * Job definitions for the background worker
 */

/**
 * Simulates sending an email
 */
export async function emailJob(payload) {
  const delay = Math.random() * 100 + 50;
  await new Promise(resolve => setTimeout(resolve, delay));
  return {
    status: 'sent',
    recipient: payload.recipient,
    timestamp: Date.now()
  };
}

/**
 * Simulates data processing that can fail
 */
export async function dataProcessJob(payload) {
  const delay = Math.random() * 100 + 50;
  await new Promise(resolve => setTimeout(resolve, delay));
  
  // Simulate intermittent failure condition
  if (payload.recordId && payload.recordId % 7 === 0) {
    throw new Error(`Data validation failed for record ${payload.recordId}`);
  }
  
  return {
    status: 'processed',
    recordId: payload.recordId,
    timestamp: Date.now()
  };
}

/**
 * Job registry mapping job types to handlers
 */
export const jobHandlers = {
  'email': emailJob,
  'dataProcess': dataProcessJob
};
