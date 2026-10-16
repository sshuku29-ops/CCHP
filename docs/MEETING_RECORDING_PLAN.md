# Meeting recording → transcript → notes: what we have to know before building it

Not built yet (on purpose). This is the brief for the next session.

## What it would do
1. In `/notes/new`, a "Record meeting" button records audio in the browser (MediaRecorder API, no app install).
2. When the meeting ends, the audio is uploaded to the platform (Supabase Storage, private).
3. A background job sends the audio to a speech-to-text API and stores the transcript on the note.
4. A second call to an LLM turns the transcript into: a summary, decisions, action items (with suggested owners from our user list), and open questions. The result is pre-filled into the note's editor for a human to review and save. Action items can be turned into tasks with one click.

## Decisions to make first
- **Consent.** Everyone in the room must know they are recorded; the recorder shows a banner and the note stores "Recording consent confirmed by [name]". Advisors/partners (MMHS staff) may decline — then no recording. Never record sessions at the shelter (residents).
- **Where audio lives and for how long.** Keep audio 30 days, then delete automatically; keep the transcript. Audio is the sensitive part.
- **Who can start a recording.** Admins only. Who can read transcripts: admins only (meeting notes are already admin-only).
- **Providers.** Transcription: Deepgram (YC credits, $15k) or OpenAI Whisper. Summaries: OpenAI or Anthropic (both have student credits). Pick one of each; both have simple REST APIs, no SDK needed.
- **Vercel limits.** A 60-minute meeting ≈ 60–100 MB of audio. Upload goes directly from the browser to Supabase Storage (signed upload URL), not through a Vercel function. The transcription call runs in a function with up to 300 s; for long recordings use the provider's async mode with a callback URL (`/api/transcribe/callback`) protected by a secret.
- **Cost at our scale.** ~2 meetings a week × 45 minutes: Deepgram ≈ $0.0043/min → under $2/month; LLM summaries → cents. Credits cover it entirely.
- **Accuracy and names.** Give the transcriber the list of board member and partner names as keywords so "Papa", "Sasha", "MMHS" come out right.

## Data model additions (when we build it)
`MeetingRecording { id, noteId, fileKey, durationSec, status: UPLOADED|TRANSCRIBING|DONE|FAILED, transcript, consentBy, createdAt, expiresAt }` and `MeetingNote.summary` already exists.

## Env vars it will need
`DEEPGRAM_API_KEY` (or `OPENAI_API_KEY`), `TRANSCRIBE_CALLBACK_SECRET`, `RECORDING_RETENTION_DAYS=30`.

## Time estimate
About one working session with the AI assistant: browser recorder + upload (1/3), transcription job + callback (1/3), summary + editor pre-fill + task creation (1/3).
