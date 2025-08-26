// Simple Express app that emits traces, metrics, and logs
require('dotenv').config();
const express = require('express');
const { MeterProvider } = require('@opentelemetry/sdk-node').metrics;
const { info, error, warn } = require('./logger');
const { context, trace } = require('@opentelemetry/api');

const app = express();
const port = process.env.PORT || 3000;

// Custom metrics
const meterProvider = new MeterProvider();
const meter = meterProvider.getMeter('custom-meter');
const requestCounter = meter.createCounter('custom_request_count', {
  description: 'Count of handled requests by route',
});
const workHistogram = meter.createHistogram('custom_work_ms', {
  description: 'Simulated work latency in ms',
});

app.get('/', (req, res) => {
  requestCounter.add(1, { route: 'root' });
  info('Root route hit');
  res.json({ ok: true, message: 'Hello from demo app 👋' });
});

app.get('/work', async (req, res) => {
  requestCounter.add(1, { route: 'work' });
  const tracer = trace.getTracer('app-tracer');
  await tracer.startActiveSpan('simulate-work', async (span) => {
    try {
      const ms = Math.floor(100 + Math.random() * 400);
      await new Promise(r => setTimeout(r, ms));
      workHistogram.record(ms);
      info('Completed simulated work', { ms });
      res.json({ ok: true, took_ms: ms });
    } catch (e) {
      error('Work failed', { err: String(e) });
      res.status(500).json({ ok: false });
    } finally {
      span.end();
    }
  });
});

app.get('/ping', (req, res) => {
  info('Ping endpoint called');
  res.json({ ok: true, message: 'pong' });
});

app.get('/error', (req, res) => {
  requestCounter.add(1, { route: 'error' });
  warn('Intentional error route called');
  try {
    throw new Error('Boom! simulated error');
  } catch (e) {
    error('Caught simulated error', { err: e.message });
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('/complex', async (req, res) => {
  const tracer = trace.getTracer('app-tracer');
  const rootSpan = tracer.startSpan('complex-root');
  try {
    // Simulate DB call
    const dbSpan = tracer.startSpan('db-call', { parent: rootSpan });
    await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
    dbSpan.setAttribute('db.system', 'postgresql');
    dbSpan.setAttribute('db.statement', 'SELECT * FROM users WHERE id=1');
    dbSpan.end();
    // Simulate external API call
    const apiSpan = tracer.startSpan('external-api', { parent: rootSpan });
    await new Promise(r => setTimeout(r, 150 + Math.random() * 250));
    apiSpan.setAttribute('http.url', 'https://api.example.com/data');
    apiSpan.setAttribute('http.method', 'GET');
    apiSpan.end();
    // Simulate CPU work
    const cpuSpan = tracer.startSpan('cpu-work', { parent: rootSpan });
    let sum = 0;
    for (let i = 0; i < 1e6; i++) sum += i;
    cpuSpan.setAttribute('work.sum', sum);
    cpuSpan.end();
    info('Complex endpoint processed');
    res.json({ ok: true, message: 'Complex process complete' });
  } catch (e) {
    error('Complex endpoint failed', { err: String(e) });
    res.status(500).json({ ok: false });
  } finally {
    rootSpan.end();
  }
});

app.listen(port, () => {
  info(`App listening on http://localhost:${port}`);
});
