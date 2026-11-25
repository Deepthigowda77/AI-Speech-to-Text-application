# Speech to Text – Multilingual Transcription

A full-stack assignment starter using React, Node/Express, PostgreSQL and an open-source Whisper transcription service.

## Features
- Record microphone audio in the browser.
- Send short audio chunks to a Python faster-whisper service for transcription.
- Save, view, edit and delete transcripts.
- Store detected language and timestamps in PostgreSQL.

## Run locally (Docker Desktop required)
1. Install Docker Desktop and start it.
2. Open this folder in a terminal.
3. Run `docker compose up --build`.
4. Open http://localhost:5173

The first AI request downloads the Whisper `tiny` model. Allow time for this download.
The `tiny` model is selected to keep resource usage lower. For better Hindi/English accuracy, try `small` if your machine has enough RAM and CPU.

## Architecture
React records audio using MediaRecorder and posts audio chunks to Express. Express forwards each chunk to the Python faster-whisper service. The user can save the accumulated transcript; Express stores it in PostgreSQL.

## Important notes
- This is chunk-based near-real-time transcription, not token-by-token streaming. Whisper processes each audio chunk after it is received.
- Short chunks can reduce accuracy because speech may be cut mid-sentence. Speak in clear phrases and pause briefly.
- Browser microphone access requires localhost or HTTPS.
- The default database credentials are for local development only. Change them before public deployment.
- For production, add authentication, request size limits, rate limiting, secure secrets, HTTPS, and persistent database backups.
