// Simple Express app that emits traces, metrics, and logs
require('dotenv').config();
const express = require('express');
const { MeterProvider } = require('@opentelemetry/sdk-node').metrics;
const { info, error, warn } = require('./logger');
const { context, trace } = require('@opentelemetry/api');
const { log } = require('winston');
const { sequelize, User } = require('./models');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json()); // Add this line at the top after express()

// Custom metrics
const meterProvider = new MeterProvider();
const meter = meterProvider.getMeter('custom-meter');
const requestCounter = meter.createCounter('custom_request_count', {
  description: 'Count of handled requests by route',
});
const workHistogram = meter.createHistogram('custom_work_ms', {
  description: 'Simulated work latency in ms',
});

// Initialize DB
sequelize.sync();

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
  const rootSpan = tracer.startSpan('function inquiry');
  try {
    // Simulate DB call
    const dbSpan = tracer.startSpan('db-call', { parent: rootSpan });
    await new Promise(r => setTimeout(r, 100 + Math.random() * 200));
    // dbSpan.setAttribute('db.system', 'postgresql');
    // dbSpan.setAttribute('db.statement', 'SELECT * FROM users WHERE id=1');
    dbSpan.end();
    // Simulate external API call
    const apiSpan = tracer.startSpan('external-api', { parent: rootSpan });
    await new Promise(r => setTimeout(r, 150 + Math.random() * 250));
    apiSpan.setAttribute('http.url', 'https://api.example.com/data');
    apiSpan.setAttribute('http.method', 'GET');
    // Set email attribute from query param if present
    if (req.query.email) {
      apiSpan.setAttribute('email_pengguna', req.query.email);
    }

    const error = new Error('Simulated API failure')
    if (error) {
      apiSpan.setStatus({ code: 2, message: 'Simulated API error' }); // 2 = ERROR
      apiSpan.recordException(error);
       apiSpan.end();
       throw new Error("Simulated API failure");
    }
    
    apiSpan.end();
    // Simulate CPU work
    const cpuSpan = tracer.startSpan('cpu-work', { parent: rootSpan });
    let sum = 0;
    for (let i = 0; i < 1e6; i++) sum += i;
    cpuSpan.setAttribute('work.sum', sum);
    cpuSpan.recordException(new Error('Simulated CPU failure'));
    cpuSpan.end();
    throw new Error("Simulated CPU failure");
    info('Complex endpoint processed');
    res.json({ ok: true, message: 'Complex process complete' });
  } catch (e) {
    error('Complex endpoint failed', { err: String(e) });
    res.status(500).json({ ok: false });
  } finally {
    rootSpan.end();
  }
});

// CRUD API for User
app.post('/users', async (req, res) => {
  const tracer = trace.getTracer('app-tracer');
  const span = tracer.startSpan('create-user');
  span.addEvent('request.body', { ...req.body });
  try {
    const { name, email } = req.body;
    // Log the request body to SigNoz
     
    info('Create user request body', { body: req.body });
    const user = await User.create({ name, email });
    span.setAttribute('user.email', email);
    info('User created', { email });
    res.status(201).json(user);
  } catch (e) {
    span.setStatus({ code: 2, message: 'Create user error' });
    span.recordException(e);
    error('Create user failed', { err: String(e) });
    res.status(500).json({ error: e.message });
  } finally {
    span.end();
  }
});

app.get('/users', async (req, res) => {
  const tracer = trace.getTracer('app-tracer');
  const span = tracer.startSpan('list-users');
  try {
    const users = await User.findAll();
    info('Listed users');
    res.json(users);
  } catch (e) {
    span.setStatus({ code: 2, message: 'List users error' });
    span.recordException(e);
    error('List users failed', { err: String(e) });
    res.status(500).json({ error: e.message });
  } finally {
    span.end();
  }
});

app.get('/users/:id', async (req, res) => {
  const tracer = trace.getTracer('app-tracer');
  const span = tracer.startSpan('get-user');
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    info('Fetched user', { id: req.params.id });
    res.json(user);
  } catch (e) {
    span.setStatus({ code: 2, message: 'Get user error' });
    span.recordException(e);
    error('Get user failed', { err: String(e) });
    res.status(500).json({ error: e.message });
  } finally {
    span.end();
  }
});

app.put('/users/:id', async (req, res) => {
  const tracer = trace.getTracer('app-tracer');
  const span = tracer.startSpan('update-user');
  try {
    const { name, email } = req.query;
    const user = await User.findByPk(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    await user.update({ name, email });
    info('Updated user', { id: req.params.id });
    res.json(user);
  } catch (e) {
    span.setStatus({ code: 2, message: 'Update user error' });
    span.recordException(e);
    error('Update user failed', { err: String(e) });
    res.status(500).json({ error: e.message });
  } finally {
    span.end();
  }
});

app.delete('/users/:id', async (req, res) => {
  const tracer = trace.getTracer('app-tracer');
  const span = tracer.startSpan('delete-user');
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    await user.destroy();
    info('Deleted user', { id: req.params.id });
    res.json({ ok: true });
  } catch (e) {
    span.setStatus({ code: 2, message: 'Delete user error' });
    span.recordException(e);
    error('Delete user failed', { err: String(e) });
    res.status(500).json({ error: e.message });
  } finally {
    span.end();
  }
});

app.listen(port, () => {
  info(`App listening on http://localhost:${port}`);
});
