<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/tan7vir/tan7vir/profile-assets/hero-dark.svg">
  <img src="https://raw.githubusercontent.com/tan7vir/tan7vir/profile-assets/hero-light.svg" width="100%" alt="Tan Vir. AI engineer, product, full-stack. I build systems that read, reason, and hold up in production. The banner draws my last 12 months of GitHub contributions as a waveform, one bar per day.">
</picture>

I'm a software engineer at [Automata One](https://one.bd) in Dhaka. I build [ONE PBX](https://portal.one.bd), a phone system for contact centres that runs an AI audit on every call. I work on all of it: the LLM pipeline, the backend, the web app, and the desktop softphone.

I build with coding agents. Claude and Codex write alongside me. The architecture, the review, and the consequences stay mine. Between July 2025 and October 2026, 899 of my pull requests were merged, 602 of them into ONE PBX.

### Inside ONE PBX

- Every call is transcribed, split into speaker turns, and audited by an LLM against that company's own rules.
- Each audit report is saved as a snapshot, so a later prompt change never rewrites past evidence.
- PostgreSQL row-level security keeps each company's data apart, with the tenant set inside each transaction.
- Transcription and audits run on Redis-backed arq workers, off the web request path.
- It meters usage, bills in Bangladeshi taka, runs in English and Bangla, and has a desktop softphone built in Rust with Tauri.

`Python` `FastAPI` `PostgreSQL` `Redis` `arq` `Next.js` `TypeScript` `Gemini` `Rust` `Tauri`

### Elsewhere

- [Physics Chatbot](https://github.com/tan7vir/Physics-Chatbot-using-Advanced-RAG) is an offline RAG tutor for the NCTB grade 9 and 10 physics textbook. It widens retrieval by generating related questions first, and it runs on a small local model through Ollama.
- Small fixes of mine are merged upstream: a docstring in [pandas](https://github.com/pandas-dev/pandas/pull/65766), a clearer bearer-auth error in [Hono](https://github.com/honojs/hono/pull/4987), and an error message in [Outlines](https://github.com/dottxt-ai/outlines/pull/1870).
- I'm an ICPC regionalist and a sports programmer with NSU Problem Solvers at North South University.

[Portfolio](https://tan7vir.vercel.app) · [LinkedIn](https://www.linkedin.com/in/tan7vir/) · [tanvirulislam.niloy@gmail.com](mailto:tanvirulislam.niloy@gmail.com) · Open to remote roles

<sub>A [GitHub Actions workflow](https://github.com/tan7vir/tan7vir/blob/main/.github/workflows/profile.yml) redraws the banner every day from my contribution data.</sub>
