#!/usr/bin/env node

// FBM Agent - CLI Entry Point
// מריץ 5 שלבים: שאלון → אסטרטגיה → נישות → כאבים → תסריטים

import * as fs from "fs";
import * as path from "path";
import chalk from "chalk";
import ora from "ora";
import inquirer from "inquirer";

import { QuestionnaireCollector } from "./questionnaire/collector";
import { QuestionnaireAnswers } from "./questionnaire/questions";
import { ClaudeClient } from "./ai/claude-client";
import {
  buildStrategyPrompt,
  SYSTEM_PROMPT as STRATEGY_SYSTEM_PROMPT,
} from "./ai/prompts/strategy";
import {
  buildNichesPrompt,
  NICHES_SYSTEM_PROMPT,
  Niche,
  NichesResult,
} from "./ai/prompts/niches";
import { buildPainsPrompt, PAINS_SYSTEM_PROMPT } from "./ai/prompts/pains";
import {
  buildScriptsPrompt,
  SCRIPTS_SYSTEM_PROMPT,
} from "./ai/prompts/scripts";

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

interface Progress {
  userName: string;
  completedSteps: number[];
  outputDir: string;
}

// ═══════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════

function printStepHeader(step: number, title: string): void {
  console.log("\n");
  console.log(
    chalk.yellow("┌─────────────────────────────────────────────────┐")
  );
  console.log(
    chalk.yellow("│") +
      chalk.white.bold(`  שלב ${step}/5: ${title}`.padEnd(48)) +
      chalk.yellow("│")
  );
  console.log(
    chalk.yellow("└─────────────────────────────────────────────────┘")
  );
  console.log();
}

function printSuccess(message: string): void {
  console.log(chalk.green.bold(`  ✓ ${message}`));
}

function printFileSaved(filePath: string): void {
  console.log(chalk.gray(`  📄 נשמר: ${filePath}`));
}

function printError(step: number, error: unknown): void {
  const msg = error instanceof Error ? error.message : String(error);
  console.log(chalk.red.bold(`\n  ✗ שגיאה בשלב ${step}: ${msg}`));
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function saveFile(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, "utf-8");
}

function loadFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf-8");
}

function saveProgress(outputDir: string, progress: Progress): void {
  saveFile(path.join(outputDir, "progress.json"), JSON.stringify(progress, null, 2));
}

function loadProgress(outputDir: string): Progress | null {
  const progressPath = path.join(outputDir, "progress.json");
  if (fs.existsSync(progressPath)) {
    return JSON.parse(loadFile(progressPath));
  }
  return null;
}

function printPreview(text: string, maxChars: number = 500): void {
  const preview = text.length > maxChars ? text.slice(0, maxChars) + "..." : text;
  console.log(chalk.gray("\n  ── תצוגה מקדימה ──"));
  console.log(chalk.white(`  ${preview.split("\n").join("\n  ")}`));
  console.log(chalk.gray("  ── סוף תצוגה מקדימה ──\n"));
}

// ═══════════════════════════════════════════
// Steps
// ═══════════════════════════════════════════

async function step1Questionnaire(outputDir: string): Promise<QuestionnaireAnswers> {
  printStepHeader(1, "שאלון תדר");

  const collector = new QuestionnaireCollector();
  const answers = await collector.collect();

  const filePath = path.join(outputDir, "questionnaire.json");
  saveFile(filePath, JSON.stringify(answers, null, 2));
  printSuccess("השאלון הושלם בהצלחה!");
  printFileSaved(filePath);

  return answers;
}

async function step2Strategy(
  outputDir: string,
  answers: QuestionnaireAnswers,
  claude: ClaudeClient
): Promise<string> {
  printStepHeader(2, "בניית מסמך אסטרטגיה ותדר");

  const prompt = buildStrategyPrompt(answers);
  const spinner = ora({
    text: chalk.cyan("  Claude בונה את מסמך האסטרטגיה שלך..."),
    spinner: "dots",
  }).start();

  const strategyDoc = await claude.generateText(prompt, STRATEGY_SYSTEM_PROMPT);
  spinner.stop();

  const filePath = path.join(outputDir, "strategy.txt");
  saveFile(filePath, strategyDoc);
  printSuccess("מסמך האסטרטגיה נוצר בהצלחה!");
  printFileSaved(filePath);
  printPreview(strategyDoc);

  return strategyDoc;
}

async function step3Niches(
  outputDir: string,
  strategyDoc: string,
  claude: ClaudeClient
): Promise<Niche> {
  printStepHeader(3, "מציאת 3 נישות מותאמות");

  const prompt = buildNichesPrompt(strategyDoc);
  const spinner = ora({
    text: chalk.cyan("  Claude מנתח את התדר שלך ומחפש נישות מושלמות..."),
    spinner: "dots",
  }).start();

  const rawResponse = await claude.generateText(prompt, NICHES_SYSTEM_PROMPT);
  spinner.stop();

  // פרסור JSON - חילוץ מתוך התגובה
  let nichesResult: NichesResult;
  try {
    // נסה לפרסר ישירות
    nichesResult = JSON.parse(rawResponse);
  } catch {
    // נסה לחלץ JSON מתוך הטקסט
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("לא הצלחתי לחלץ JSON מתגובת Claude. נסה שוב.");
    }
    nichesResult = JSON.parse(jsonMatch[0]);
  }

  // שמור את כל הנישות
  const filePath = path.join(outputDir, "niches.json");
  saveFile(filePath, JSON.stringify(nichesResult, null, 2));
  printFileSaved(filePath);

  // הצג את 3 הנישות
  console.log(chalk.cyan.bold("\n  3 הנישות שנמצאו:\n"));
  for (const niche of nichesResult.niches) {
    console.log(
      chalk.white.bold(`  ${niche.id}. ${niche.name}`) +
        chalk.yellow(` (ציון התאמה: ${niche.fit_score}/100)`)
    );
    console.log(chalk.gray(`     ${niche.description}`));
    console.log();
  }

  if (nichesResult.recommendation) {
    console.log(chalk.magenta(`  💡 המלצה: ${nichesResult.recommendation}\n`));
  }

  // בחירת נישה
  const { selectedIndex } = await inquirer.prompt<{ selectedIndex: number }>([
    {
      type: "list",
      name: "selectedIndex",
      message: chalk.white.bold("באיזו נישה תרצה להתמקד?"),
      choices: nichesResult.niches.map((niche, idx) => ({
        name: `${niche.name} (ציון: ${niche.fit_score})`,
        value: idx,
      })),
    },
  ]);

  const selectedNiche = nichesResult.niches[selectedIndex];
  printSuccess(`נבחרה נישה: ${selectedNiche.name}`);

  // עדכן את הקובץ עם הבחירה
  const nichesWithSelection = { ...nichesResult, selectedNicheId: selectedNiche.id };
  saveFile(filePath, JSON.stringify(nichesWithSelection, null, 2));

  return selectedNiche;
}

async function step4Pains(
  outputDir: string,
  strategyDoc: string,
  selectedNiche: Niche,
  claude: ClaudeClient
): Promise<string> {
  printStepHeader(4, "ניתוח כאבים עמוקים");

  console.log(chalk.gray(`  מנתח כאבים עבור נישה: ${selectedNiche.name}\n`));

  const prompt = buildPainsPrompt(strategyDoc, selectedNiche);
  const spinner = ora({
    text: chalk.cyan("  Claude חופר לעומק הכאבים של הנישה..."),
    spinner: "dots",
  }).start();

  const painAnalysis = await claude.generateText(prompt, PAINS_SYSTEM_PROMPT);
  spinner.stop();

  const filePath = path.join(outputDir, "pains.txt");
  saveFile(filePath, painAnalysis);
  printSuccess("ניתוח הכאבים הושלם!");
  printFileSaved(filePath);
  printPreview(painAnalysis);

  return painAnalysis;
}

async function step5Scripts(
  outputDir: string,
  strategyDoc: string,
  painAnalysis: string,
  claude: ClaudeClient
): Promise<string> {
  printStepHeader(5, "יצירת 3 תסריטי וידאו");

  const prompt = buildScriptsPrompt(strategyDoc, painAnalysis);
  const spinner = ora({
    text: chalk.cyan("  Claude כותב 3 תסריטי וידאו מותאמים אישית..."),
    spinner: "dots",
  }).start();

  const scripts = await claude.generateText(prompt, SCRIPTS_SYSTEM_PROMPT);
  spinner.stop();

  const filePath = path.join(outputDir, "scripts.txt");
  saveFile(filePath, scripts);
  printSuccess("3 תסריטי הוידאו נוצרו בהצלחה!");
  printFileSaved(filePath);
  printPreview(scripts);

  return scripts;
}

// ═══════════════════════════════════════════
// Main
// ═══════════════════════════════════════════

async function main(): Promise<void> {
  console.log("\n");
  console.log(
    chalk.cyan.bold("  ╔══════════════════════════════════════════════════╗")
  );
  console.log(
    chalk.cyan.bold("  ║") +
      chalk.white.bold(
        "           FBM Agent - תהליך מלא                  "
      ) +
      chalk.cyan.bold("║")
  );
  console.log(
    chalk.cyan.bold("  ║") +
      chalk.gray(
        "     שאלון → אסטרטגיה → נישות → כאבים → תסריטים   "
      ) +
      chalk.cyan.bold("║")
  );
  console.log(
    chalk.cyan.bold("  ╚══════════════════════════════════════════════════╝")
  );
  console.log();

  // ── בדוק אם יש progress קיים ──
  const outputsBase = path.join(process.cwd(), "outputs");
  ensureDir(outputsBase);

  let outputDir = "";
  let startStep = 1;
  let answers: QuestionnaireAnswers | null = null;
  let strategyDoc = "";
  let selectedNiche: Niche | null = null;
  let painAnalysis = "";

  // חפש תיקיות קיימות עם progress
  if (fs.existsSync(outputsBase)) {
    const dirs = fs
      .readdirSync(outputsBase)
      .filter((d) =>
        fs.existsSync(path.join(outputsBase, d, "progress.json"))
      );

    if (dirs.length > 0) {
      const { resume } = await inquirer.prompt<{ resume: string }>([
        {
          type: "list",
          name: "resume",
          message: chalk.white.bold("נמצא תהליך קודם. מה תרצה לעשות?"),
          choices: [
            ...dirs.map((d) => {
              const prog = loadProgress(path.join(outputsBase, d));
              const completed = prog?.completedSteps.length ?? 0;
              return {
                name: `המשך עם ${d} (${completed}/5 שלבים הושלמו)`,
                value: d,
              };
            }),
            { name: "התחל תהליך חדש", value: "__new__" },
          ],
        },
      ]);

      if (resume !== "__new__") {
        outputDir = path.join(outputsBase, resume);
        const progress = loadProgress(outputDir)!;
        const maxCompleted = Math.max(...progress.completedSteps, 0);
        startStep = maxCompleted + 1;

        // טען נתונים קיימים
        if (progress.completedSteps.includes(1)) {
          answers = JSON.parse(loadFile(path.join(outputDir, "questionnaire.json")));
        }
        if (progress.completedSteps.includes(2)) {
          strategyDoc = loadFile(path.join(outputDir, "strategy.txt"));
        }
        if (progress.completedSteps.includes(3)) {
          const nichesData = JSON.parse(loadFile(path.join(outputDir, "niches.json")));
          const selectedId = nichesData.selectedNicheId;
          selectedNiche = nichesData.niches.find((n: Niche) => n.id === selectedId) ?? nichesData.niches[0];
        }
        if (progress.completedSteps.includes(4)) {
          painAnalysis = loadFile(path.join(outputDir, "pains.txt"));
        }

        console.log(
          chalk.green(`\n  ✓ ממשיך מ שלב ${startStep}/5\n`)
        );
      }
    }
  }

  // ── אתחול Claude Client ──
  let claude: ClaudeClient;
  try {
    claude = new ClaudeClient();
  } catch (error) {
    console.log(
      chalk.red.bold(
        "\n  ✗ " + (error instanceof Error ? error.message : String(error))
      )
    );
    console.log(
      chalk.yellow(
        "  💡 צור קובץ .env עם ANTHROPIC_API_KEY=sk-ant-...\n"
      )
    );
    process.exit(1);
  }

  // ═══════════════════════════════════════════
  // שלב 1: שאלון תדר
  // ═══════════════════════════════════════════

  if (startStep <= 1) {
    try {
      answers = await step1Questionnaire("");
      // יצירת תיקיית output לפי שם המשתמש
      const safeName = answers.userName.replace(/[^a-zA-Z0-9\u0590-\u05FF_-]/g, "_");
      outputDir = path.join(outputsBase, safeName);
      ensureDir(outputDir);

      // העתק את הקובץ לתיקייה הנכונה
      saveFile(
        path.join(outputDir, "questionnaire.json"),
        JSON.stringify(answers, null, 2)
      );

      saveProgress(outputDir, {
        userName: answers.userName,
        completedSteps: [1],
        outputDir,
      });
    } catch (error) {
      printError(1, error);
      process.exit(1);
    }
  }

  // ═══════════════════════════════════════════
  // שלב 2: מסמך אסטרטגיה
  // ═══════════════════════════════════════════

  if (startStep <= 2) {
    try {
      strategyDoc = await step2Strategy(outputDir, answers!, claude);

      const progress = loadProgress(outputDir)!;
      progress.completedSteps.push(2);
      saveProgress(outputDir, progress);
    } catch (error) {
      printError(2, error);
      console.log(chalk.yellow("  💡 הרץ שוב כדי להמשיך מהשלב האחרון שהושלם.\n"));
      process.exit(1);
    }
  }

  // ═══════════════════════════════════════════
  // שלב 3: מציאת נישות
  // ═══════════════════════════════════════════

  if (startStep <= 3) {
    try {
      selectedNiche = await step3Niches(outputDir, strategyDoc, claude);

      const progress = loadProgress(outputDir)!;
      progress.completedSteps.push(3);
      saveProgress(outputDir, progress);
    } catch (error) {
      printError(3, error);
      console.log(chalk.yellow("  💡 הרץ שוב כדי להמשיך מהשלב האחרון שהושלם.\n"));
      process.exit(1);
    }
  }

  // ═══════════════════════════════════════════
  // שלב 4: ניתוח כאבים
  // ═══════════════════════════════════════════

  if (startStep <= 4) {
    try {
      painAnalysis = await step4Pains(outputDir, strategyDoc, selectedNiche!, claude);

      const progress = loadProgress(outputDir)!;
      progress.completedSteps.push(4);
      saveProgress(outputDir, progress);
    } catch (error) {
      printError(4, error);
      console.log(chalk.yellow("  💡 הרץ שוב כדי להמשיך מהשלב האחרון שהושלם.\n"));
      process.exit(1);
    }
  }

  // ═══════════════════════════════════════════
  // שלב 5: תסריטי וידאו
  // ═══════════════════════════════════════════

  if (startStep <= 5) {
    try {
      await step5Scripts(outputDir, strategyDoc, painAnalysis, claude);

      const progress = loadProgress(outputDir)!;
      progress.completedSteps.push(5);
      saveProgress(outputDir, progress);
    } catch (error) {
      printError(5, error);
      console.log(chalk.yellow("  💡 הרץ שוב כדי להמשיך מהשלב האחרון שהושלם.\n"));
      process.exit(1);
    }
  }

  // ═══════════════════════════════════════════
  // סיכום
  // ═══════════════════════════════════════════

  console.log("\n");
  console.log(
    chalk.green.bold("  ╔══════════════════════════════════════════════════╗")
  );
  console.log(
    chalk.green.bold("  ║") +
      chalk.white.bold(
        "           ✓ התהליך הושלם בהצלחה!                  "
      ) +
      chalk.green.bold("║")
  );
  console.log(
    chalk.green.bold("  ╚══════════════════════════════════════════════════╝")
  );
  console.log();
  console.log(chalk.white.bold("  הקבצים שנוצרו:"));
  console.log();

  const files = [
    { name: "questionnaire.json", desc: "תשובות השאלון" },
    { name: "strategy.txt", desc: "מסמך אסטרטגיה ותדר" },
    { name: "niches.json", desc: "3 נישות + הנישה הנבחרת" },
    { name: "pains.txt", desc: "ניתוח כאבים עמוקים" },
    { name: "scripts.txt", desc: "3 תסריטי וידאו" },
  ];

  for (const file of files) {
    const filePath = path.join(outputDir, file.name);
    if (fs.existsSync(filePath)) {
      const size = fs.statSync(filePath).size;
      const sizeStr = size > 1024 ? `${(size / 1024).toFixed(1)}KB` : `${size}B`;
      console.log(
        chalk.green("  ✓ ") +
          chalk.white(file.name.padEnd(25)) +
          chalk.gray(file.desc) +
          chalk.yellow(` (${sizeStr})`)
      );
    }
  }

  console.log();
  console.log(chalk.gray(`  📂 תיקייה: ${outputDir}`));
  console.log();
  console.log(
    chalk.cyan("  🚀 עכשיו יש לך הכל - תדר, נישה, כאבים, ותסריטים.")
  );
  console.log(chalk.cyan("     הגיע הזמן לצלם את הוידאו הראשון!"));
  console.log();
}

main().catch((error) => {
  console.error(chalk.red("\n  שגיאה לא צפויה:"), error);
  process.exit(1);
});
