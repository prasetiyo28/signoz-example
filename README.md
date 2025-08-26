# SigNoz + Node.js (Express) Quickstart

This sample sends **traces**, **metrics**, and **logs** to a local SigNoz via **OTLP HTTP** on `:4318`.

## 0) Run SigNoz locally (Docker)

```bash
git clone https://github.com/SigNoz/signoz.git
cd signoz/deploy/docker
docker compose -f docker-compose.yaml -f docker-compose.dev.yaml up -d
# UI at http://localhost:3301
```

## 1) Setup this sample

```bash
cd signoz-node-sample
cp .env.example .env   # edit if needed
npm install
npm run dev            # or: npm start (uses .env)
```

The app runs on http://localhost:3000

## 2) Try some traffic

- `GET /` => basic response
- `GET /work` => simulates work (creates spans + histogram metrics)
- `GET /error` => throws on purpose (error log + span)

```bash
curl http://localhost:3000/
curl http://localhost:3000/work
curl http://localhost:3000/error
```

## 3) See data in SigNoz

- Open **Traces** and filter by service name `demo-node`
- Open **Metrics** and search for:
  - `custom_request_count`
  - `custom_work_ms`
- Open **Logs** and filter by service `demo-node`

## Notes

- Environment variables:
  - `OTEL_SERVICE_NAME` (defaults to `demo-node`)
  - `OTEL_EXPORTER_OTLP_ENDPOINT` (defaults to `http://localhost:4318`)
  - `OTEL_EXPORTER_OTLP_HEADERS` for optional headers (comma-separated `k=v` pairs)
  - `PORT` (defaults to `3000`)

- If the UI is empty:
  - Make sure Docker is running and SigNoz containers are healthy.
  - Ensure `:4318` is reachable and not blocked.
  - Confirm you started the app with `node -r ./otel.js app.js` (the `-r` preloads OpenTelemetry).
