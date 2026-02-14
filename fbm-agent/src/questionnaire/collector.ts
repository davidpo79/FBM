// מנגנון לאיסוף תשובות מהמשתמש דרך CLI

import chalk from "chalk";
import inquirer from "inquirer";
import { questions, QuestionnaireAnswers } from "./questions";

export class QuestionnaireCollector {
  private printHeader(): void {
    console.log("\n");
    console.log(
      chalk.cyan("╔══════════════════════════════════════════════════╗")
    );
    console.log(
      chalk.cyan("║") +
        chalk.white.bold(
          "        FBM Agent - בניית אסטרטגיה שיווקית        "
        ) +
        chalk.cyan("║")
    );
    console.log(
      chalk.cyan("║") +
        chalk.gray(
          "          שיטת Functional Brand Methodology        "
        ) +
        chalk.cyan("║")
    );
    console.log(
      chalk.cyan("╚══════════════════════════════════════════════════╝")
    );
    console.log();
    console.log(
      chalk.gray("  אני הולך לשאול אותך 10 שאלות שיעזרו לי לבנות")
    );
    console.log(
      chalk.gray("  עבורך מסמך אסטרטגיה שיווקית מותאם אישית.")
    );
    console.log(
      chalk.gray("  קח את הזמן, אין תשובות נכונות או לא נכונות.\n")
    );
  }

  private printSectionHeader(section: string): void {
    console.log("\n");
    console.log(
      chalk.blue.bold(`  ── ${section} ${"─".repeat(40 - section.length)}`)
    );
    console.log();
  }

  async collect(): Promise<QuestionnaireAnswers> {
    this.printHeader();

    // שאל את שם המשתמש
    const { userName } = await inquirer.prompt<{ userName: string }>([
      {
        type: "input",
        name: "userName",
        message: chalk.white.bold("מה השם שלך?"),
        validate: (input: string) =>
          input.trim().length >= 2 || "אנא הכנס שם (לפחות 2 תווים)",
      },
    ]);

    console.log(
      chalk.green(`\n  שלום ${userName}! בואנו נתחיל 🚀\n`)
    );

    const answers: { [questionId: number]: string } = {};
    let currentSection = "";

    for (const question of questions) {
      // הדפס כותרת סקשן חדש אם עברנו חלק
      if (question.section !== currentSection) {
        currentSection = question.section;
        this.printSectionHeader(currentSection);
      }

      // הצג מספר שאלה וכותרת
      console.log(
        chalk.yellow.bold(`  📝 שאלה ${question.id}/10: ${question.title}`)
      );
      console.log(chalk.gray(`  ${question.text}\n`));

      const { answer } = await inquirer.prompt<{ answer: string }>([
        {
          type: "editor",
          name: "answer",
          message: chalk.white("התשובה שלך:"),
          validate: (input: string) =>
            input.trim().length >= 10 ||
            "אנא כתוב תשובה מפורטת יותר (לפחות 10 תווים)",
        },
      ]);

      answers[question.id] = answer.trim();
      console.log(chalk.green("  ✓ נשמר\n"));
    }

    console.log(
      chalk.cyan.bold("\n  ══ סיום השאלון ══")
    );
    console.log(
      chalk.green(`  ✓ כל 10 התשובות נאספו בהצלחה!`)
    );
    console.log(
      chalk.gray("  מעבד את התשובות ובונה אסטרטגיה...\n")
    );

    return {
      userName,
      timestamp: new Date().toISOString(),
      answers,
    };
  }
}
