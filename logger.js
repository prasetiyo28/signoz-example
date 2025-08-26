// Unified logger: sends logs to SigNoz via OTLP HTTP and to console via Pino
require('dotenv').config();
const pino = require('pino');
const { join } = require('path');

const serviceName = process.env.OTEL_SERVICE_NAME || 'demo-node';
const signozOtlpEndpoint = process.env.SIGNOZ_OTLP_ENDPOINT || 'http://localhost:4318/v1/logs';

const transport = pino.transport({
  targets: [
    {
      target: 'pino-opentelemetry-transport',
      options: {
        endpoint: signozOtlpEndpoint,
        serviceName: serviceName,
        // You can add resource attributes here if needed
      },
      level: 'info',
    },
    {
      target: 'pino-pretty',
      options: { colorize: true },
      level: 'info',
    }
  ]
});

const logger = pino(transport);

module.exports = logger;
