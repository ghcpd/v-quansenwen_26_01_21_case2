# Node.js Job Runner Demo

A lightweight background job runner that demonstrates concurrent job processing from an in-memory queue.

## Overview

This project simulates a service that processes background jobs. Jobs are pulled from a queue and executed with configurable concurrency. The implementation includes:

- In-memory job queue
- Concurrent job processing
- Simulated async operations (network calls, data processing)
- Multiple job types with varying execution patterns

## Project Structure

```
src/
  ├── index.js    - Main entrypoint
  ├── worker.js   - Job processing engine
  ├── jobs.js     - Job definitions
  └── queue.js    - In-memory queue implementation
test/
  └── worker.test.js - Test suite
```

## Running the Project

### Run Tests

```bash
npm test
```

The test suite validates successful job processing scenarios using Node's built-in test runner.

### Run the Demo

```bash
npm start
```

This starts the job runner and processes a sample batch of jobs. The service runs with strict unhandled-rejection behavior to match production environments where promise rejections must be properly managed.

## Job Types

- **Email Jobs**: Simulated email sending operations
- **Data Processing Jobs**: Simulated data transformation tasks

Jobs may complete successfully or fail based on runtime conditions, simulating real-world scenarios where external services or operations can be unreliable.
