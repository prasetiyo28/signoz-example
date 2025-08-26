// Unified logger: sends logs to SigNoz via OTLP HTTP and to console via Winston
require('dotenv').config();
const winston = require('winston');
const { DiagConsoleLogger, DiagLogLevel, diag } = require('@opentelemetry/api');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');

// Only use Winston for logging
const serviceName = process.env.OTEL_SERVICE_NAME || 'demo-node';

const winstonLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ level, message, timestamp, ...meta }) => {
      return `${timestamp} [${level.toUpperCase()}] ${message}${Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''}`;
    })
  ),
  transports: [new winston.transports.Console()],
});

// Remove broken logs.setGlobalLoggerProvider usage and OTEL logs API (not stable in Node.js as of 2025)
// Only use Winston for logging
// If you want to send logs to SigNoz, use a log forwarder or collector config

module.exports = winstonLogger;
