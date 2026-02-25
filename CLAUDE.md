# CLAUDE.md — FBM Agent

## Project Overview

FBM Agent is a CLI tool that builds personalized marketing strategy documents using the **FBM (Functional Brand Methodology)** developed by David Popovitz. It runs a 5-step interactive pipeline: questionnaire → strategy document → niche discovery → pain analysis → video scripts. All user-facing text is in **Hebrew**. AI content is generated via the Anthropic Claude API.

## Repository Structure

```
FBM/
└── fbm-agent/                   # Main application directory
    ├── package.json             # Node.js dependencies and scripts
    ├── tsconfig.json            # TypeScript config (ES2020, strict, commonjs)
    ├── .env.example             # Template: ANTHROPIC_API_KEY=your_api_key_here
    ├── .gitignore               # Ignores node_modules/, dist/, .env, outputs/
    ├── outputs/                 # Runtime output directory (gitignored except .gitkeep)
    └── src/
        ├── index.ts             # CLI entry point — main() orchestrates all 5 steps
        ├── questionnaire/
        │   ├── questions.ts     # 10 FBM questionnaire questions (Hebrew) + types
        │   └── collector.ts     # QuestionnaireCollector class — inquirer-based CLI prompts
        └── ai/
            ├── claude-client.ts # ClaudeClient wrapper for Anthropic SDK
            └── prompts/
                ├── strategy.ts  # Step 2: Strategy document prompt (3000-4000 words)
                ├── niches.ts    # Step 3: Niche discovery prompt (returns JSON)
                ├── pains.ts     # Step 4: Deep pain analysis prompt
                └── scripts.ts   # Step 5: Video script generation prompt (3 scripts)
```

## Tech Stack

- **Language:** TypeScript (strict mode, ES2020 target, CommonJS modules)
- **Runtime:** Node.js
- **AI:** `@anthropic-ai/sdk` — uses `claude-opus-4-20250514` model
- **CLI UI:** `inquirer` (prompts/menus), `chalk` (colors), `ora` (spinners)
- **Config:** `dotenv` for `.env` loading

## Development Commands

All commands run from the `fbm-agent/` directory:

```bash
cd fbm-agent
npm install          # Install dependencies
npm run build        # Compile TypeScript → dist/
npm run dev          # Run directly via ts-node (development)
npm start            # Run compiled JS from dist/
```

## Architecture & Pipeline

The app follows a linear 5-step pipeline defined in `src/index.ts`:

1. **Questionnaire** (Step 1) — Collects 10 Hebrew questions via CLI using `inquirer` editor prompts. Saves `questionnaire.json`.
2. **Strategy Document** (Step 2) — Sends answers to Claude with a detailed system prompt. Generates a 3000-4000 word Hebrew marketing strategy document. Saves `strategy.txt`.
3. **Niche Discovery** (Step 3) — Analyzes the strategy document to find 3 specific market niches. Returns structured JSON. User selects one niche interactively. Saves `niches.json`.
4. **Pain Analysis** (Step 4) — Deep psychological analysis of the selected niche's pain points. Saves `pains.txt`.
5. **Video Scripts** (Step 5) — Generates 3 video scripts (pain, origin story, polarization) for social media. Saves `scripts.txt`.

**Resume support:** Progress is tracked via `progress.json` in each user's output directory. If a run is interrupted, the user can resume from the last completed step.

**Output directory:** `outputs/{sanitized_username}/` — contains all generated files for a user session.

## Key Conventions

### Language
- All user-facing strings, prompts, error messages, and AI system prompts are in **Hebrew**.
- Code comments are in Hebrew.
- Variable names, types, and code structure are in English.
- Hebrew-English mixed convention: keep Hebrew for content/UI, English for code identifiers.

### Prompt Engineering
- Each AI step has a dedicated file in `src/ai/prompts/` with:
  - A `SYSTEM_PROMPT` or `*_SYSTEM_PROMPT` constant (persona + methodology + output rules)
  - A `build*Prompt()` function that interpolates user data into the prompt
- Prompts use XML-style tags (`<Persona>`, `<Context>`, `<Instructions>`, `<Constraints>`, etc.)
- The niches prompt requires **pure JSON output** (no markdown wrapping); `parseJSONFromText()` in `index.ts` handles fallback extraction.

### Claude API Settings
- Model: `claude-opus-4-20250514`
- Max tokens: 8000
- Temperature: 0.7
- Configured in `src/ai/claude-client.ts`

### Error Handling
- Each pipeline step is wrapped in try/catch with Hebrew error messages.
- On failure, the user is told to re-run (resume will pick up from last completed step).
- Missing API key shows a specific setup instruction.

### Types
- `QuestionnaireAnswers` — user name, timestamp, answers map (question ID → string)
- `Question` — id, section, title, text
- `Niche` / `NichesResult` — structured niche data with fit scores
- `Progress` — tracks userName, completedSteps array, outputDir

### File I/O
- Helper functions in `index.ts`: `saveFile()`, `loadFile()`, `saveProgress()`, `loadProgress()`, `ensureDir()`, `sanitizeFileName()`
- File names support Hebrew characters in the sanitizer regex (`\u0590-\u05FF`)

## Environment Setup

1. Copy `.env.example` to `.env` in the `fbm-agent/` directory
2. Set `ANTHROPIC_API_KEY=sk-ant-...` with a valid Anthropic API key
3. Run `npm install` then `npm run dev`

## Git Conventions

- Commit messages use conventional format: `feat:`, `fix:`, `refactor:`, `chore:`, `enhance:`
- Single-purpose commits with descriptive messages
- Main branch: `master`
