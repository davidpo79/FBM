# CLAUDE.md — FBM Agent

## Project Overview

FBM Agent is a TypeScript CLI tool that generates comprehensive marketing strategy documents using the **Functional Brand Methodology (FBM)** framework by David Pofowitz. It runs a 5-step pipeline powered by Claude AI:

**שאלון → אסטרטגיה → נישות → כאבים → תסריטים**
(Questionnaire → Strategy → Niches → Pains → Video Scripts)

All user-facing text, prompts, and generated content are in **Hebrew**.

## Repository Structure

```
FBM/
└── fbm-agent/                    # Main project directory
    ├── src/
    │   ├── index.ts              # CLI entry point & 5-step orchestrator
    │   ├── questionnaire/
    │   │   ├── collector.ts      # Interactive questionnaire flow (inquirer)
    │   │   └── questions.ts      # 10 FBM questions in Hebrew (5 sections)
    │   └── ai/
    │       ├── claude-client.ts  # Anthropic API wrapper (ClaudeClient class)
    │       └── prompts/
    │           ├── strategy.ts   # Step 2: Strategy document prompt
    │           ├── niches.ts     # Step 3: Niche discovery prompt
    │           ├── pains.ts      # Step 4: Pain analysis prompt
    │           └── scripts.ts    # Step 5: Video script prompt
    ├── dist/                     # Compiled JS output (generated, gitignored)
    ├── outputs/                  # Per-user output files (gitignored)
    ├── package.json
    ├── tsconfig.json
    └── .env.example              # ANTHROPIC_API_KEY template
```

## Build & Run Commands

All commands run from `fbm-agent/`:

```bash
cd fbm-agent

npm install          # Install dependencies
npm run build        # Compile TypeScript → dist/
npm run start        # Run compiled version (node dist/index.js)
npm run dev          # Run with ts-node (no build needed)
```

There are **no test or lint commands** configured.

## Tech Stack

- **TypeScript 5.7** (strict mode, ES2020 target, CommonJS modules)
- **@anthropic-ai/sdk** — Claude API client
- **inquirer 8.x** — Interactive CLI prompts
- **chalk 4.x** — Terminal colors (CJS-compatible version)
- **ora 5.x** — Loading spinners (CJS-compatible version)
- **dotenv** — Environment variable loading

## Environment Setup

Copy `.env.example` to `.env` and set your API key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

## Code Conventions

### Language
- All user-facing strings, comments, and AI prompts are in **Hebrew**
- Technical identifiers (variable names, class names) are in English

### Naming
- **PascalCase**: Classes (`ClaudeClient`, `QuestionnaireCollector`)
- **camelCase**: Functions, variables, properties
- **SCREAMING_SNAKE_CASE**: Constants (`MODEL`, `MAX_TOKENS`, `SYSTEM_PROMPT`)
- **kebab-case**: File names (`claude-client.ts`)

### Architecture
- Class-based for stateful components (API client, questionnaire)
- Function exports for prompt builders (`buildStrategyPrompt`, `buildNichesPrompt`)
- TypeScript interfaces for data shapes (`QuestionnaireAnswers`, `Niche`, `NichesResult`, `Progress`)
- Async/await throughout; no callbacks
- JSON for structured data exchange with AI; plain text for long-form documents

### AI Integration
- Model: `claude-opus-4-20250514`
- Max tokens: 8,000 per request
- Temperature: 0.7
- Each step has a dedicated system prompt constant and prompt builder function
- JSON responses are parsed with a regex fallback for robustness

### Error Handling
- API key validated at startup
- Try-catch around each pipeline step with chalk-colored error output
- `process.exit(1)` on critical failures
- Progress saved after each step for resume capability

## Pipeline Steps

1. **Questionnaire** — Collects 10 answers across 5 sections (identity, empathy, proof, polarization, vision)
2. **Strategy** — Generates a 3,000–4,000 word strategy document (12 sections)
3. **Niches** — Identifies 3 niches as JSON; user selects one interactively
4. **Pains** — Deep psychological pain analysis for the selected niche (1,500+ words)
5. **Scripts** — Generates 3 video scripts (pain, origin story, unpopular opinion)

## Output Files

Per-user outputs saved to `outputs/{userName}/`:
- `questionnaire.json` — Raw answers
- `strategy.txt` — Strategy document (Markdown)
- `niches.json` — 3 niches with fit scores + selected niche
- `pains.txt` — Pain analysis (Markdown)
- `scripts.txt` — 3 video scripts (Markdown)
- `progress.json` — Completed step tracking (enables resume)

## Git Conventions

### Commit Messages
Use conventional prefixes:
- `feat:` — New features
- `fix:` — Bug fixes
- `refactor:` — Code reorganization
- `enhance:` — Improvements to existing features
- `chore:` — Build/dependency/config changes

### Branch Naming
- `master` — Main branch
- `claude/` prefix for AI-assisted development branches

## Key Design Notes

- **FBM methodology** is deeply embedded in all prompts — changes to prompts should preserve the "Be → Do → Have" philosophy, functional empathy concepts, and polarization framework
- **chalk and ora** are pinned to CJS-compatible versions (4.x and 5.x) — do not upgrade to ESM-only versions
- **Progress persistence** allows interrupted sessions to resume from the last completed step
- Prompt files contain sophisticated Hebrew marketing methodology — treat prompt content changes with care
