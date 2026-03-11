# mindfulness-supervisor

A supervision-first mindfulness app. Not a teacher — a safety monitor.

The goal is not deeper meditation. The goal is to notice early when practice is becoming harmful: self-judgment, internal surveillance, forced acceptance, compulsive optimization, or performance framing.

## Setup

```bash
npm install
cp .env.example .env.local
# Edit .env.local — add API keys (both optional, see below)
npm run dev
```

Open http://localhost:3000.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | No | LLM-based supervisor + guidance (gpt-5.4). Without this, rule-based detection only. |
| `ELEVENLABS_API_KEY` | No | Voice playback. Without this, guidance is text-only. |
| `ELEVENLABS_VOICE_ID` | No | Voice to use. Defaults to a calm English voice. |

The app works without any API keys. Supervision uses keyword-based detection. Guidance uses preset scripts.

## What it does

1. **Check in** — a few questions about your current state
2. **Supervisor review** — evaluates whether practice is likely to help or harm today
3. **Session** — short guided practice (30s / 1min / 3min)
   - Includes a "this is making it worse" button at all times
4. **Post-session reflection** — did this help or add pressure?
5. **History** — compact view of past sessions with personalization notes

## Architecture

See `docs/architecture.md`.

## Safety model

See `docs/safety-model.md`.

## Data

Sessions stored locally in `data/mindfulness.db` (SQLite via LibSQL).
TTS audio cached in `data/tts-cache/` (SHA-256 hash-based filenames).
Neither directory is committed to git.
