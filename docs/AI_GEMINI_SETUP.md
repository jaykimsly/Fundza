# Fundza Gemini AI deployment

Fundza AI must run through the server-side Google GenAI SDK. Never expose `GEMINI_API_KEY` to the browser.

## Required Vercel environment variables

Set this variable for the required Vercel environments:

```text
GEMINI_API_KEY=<Google AI Studio API key>
```

Optional model overrides:

```text
GEMINI_MODEL=gemini-3.7-flash
GEMINI_FALLBACK_MODEL=gemini-3.6-flash
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
AI_USE_GEMINI_EMBEDDINGS=true
```

The current application does not require `AI_GATEWAY_API_KEY` for the primary tutor, quiz, embeddings, or report-analysis paths. The gateway remains an optional fallback for structured text generation.

## Verification order

1. Open `/api/ai/health` on the deployed application.
2. Confirm the response reports `provider: "gemini"` and `gemini.configured: true`.
3. Sign in as a learner and submit a normal question through the AI tutor.
4. Generate a five-question practice quiz.
5. Upload a supported academic report and confirm the analysis job reaches `completed`.
6. With `AI_USE_GEMINI_EMBEDDINGS=true`, confirm semantic retrieval is reported by the health endpoint and that knowledge retrieval succeeds.

## Security requirements

- `GEMINI_API_KEY` must only exist in server-side environment configuration.
- Do not prefix the key with `NEXT_PUBLIC_`.
- Do not place the key in source code, GitHub Actions logs, client components, localStorage, cookies, or URL parameters.
- AI API routes require an authenticated learner where the endpoint handles learner data.
- Tutor and quiz requests enforce bounded input sizes before reaching the model.
- Report uploads are authenticated, ownership-checked, fingerprinted, size-limited, and stored in the private report bucket before analysis.

## Current Gemini implementation

- Tutor and quiz generation use Gemini as the primary structured-output provider.
- `gemini-3.7-flash` is the default generation model with a `gemini-3.6-flash` fallback for transient availability failures.
- Gemini uses the stable `v1` API through `@google/genai`.
- Structured JSON responses use Gemini response schemas.
- Gemini embeddings use `gemini-embedding-001` with 768 output dimensions.
- Academic report extraction uses direct Gemini multimodal input for supported PDF and image uploads.
- Server-side request timeouts and transient-model fallback are enabled.
