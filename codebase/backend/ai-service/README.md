# ai-service

OpenAI-powered Family Copilot service for Mom Super App.

## Main APIs

- `POST /api/copilot/chat`
- `GET /api/copilot/status`

Gateway routes:

- `POST /ai/copilot/chat`
- `GET /ai/copilot/status`

## Run locally

```bash
$env:OPENAI_API_KEY = "<your-openai-api-key>"
mvn spring-boot:run
```

Environment variables:

- `OPENAI_API_KEY` required to call OpenAI
- `OPENAI_MODEL` default `gpt-5.4-mini`
- `OPENAI_BASE_URL` default `https://api.openai.com`
- `OPENAI_RESPONSES_PATH` default `/v1/responses`
- `OPENAI_MAX_OUTPUT_TOKENS` default `900`
- `OPENAI_TIMEOUT` default `45s`
- `PORT` default `8104`
