// OpenTelemetry bootstrap: traces & metrics via OTLP HTTP to SigNoz
require('dotenv').config();
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');
const { Resource } = require('@opentelemetry/resources');
const { SemanticResourceAttributes } = require('@opentelemetry/semantic-conventions');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');
const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
const { PeriodicExportingMetricReader } = require('@opentelemetry/sdk-metrics'); // fixed import

const serviceName = process.env.OTEL_SERVICE_NAME || 'demo-node';
const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
const headers = process.env.OTEL_EXPORTER_OTLP_HEADERS || '';

// Helper to parse headers string into object
function parseHeaders(headerStr) {
  if (!headerStr) return undefined;
  return Object.fromEntries(
    headerStr.split(',').map(kv => {
      const [k, v] = kv.split('=');
      return [k.trim(), v.trim()];
    })
  );
}

const traceExporter = new OTLPTraceExporter({
  url: `${endpoint}/v1/traces`,
  headers: parseHeaders(headers),
});

const metricExporter = new OTLPMetricExporter({
  url: `${endpoint}/v1/metrics`,
  headers: parseHeaders(headers),
});

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  }),
  traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 10000, // 10s
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      // enable/disable auto-instrumentations here as needed
    }),
  ],
});

sdk.start();
// eslint-disable-next-line no-console
console.log(`[otel] OpenTelemetry started for service=${serviceName} endpoint=${endpoint}`);

// Graceful shutdown on SIGTERM and SIGINT
const shutdown = () => {
  sdk.shutdown()
    .then(() => console.log('[otel] shutdown complete'))
    .catch(console.error)
    .finally(() => process.exit(0));
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
