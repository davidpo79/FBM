// קליינט ל-Claude API באמצעות @anthropic-ai/sdk

import Anthropic from "@anthropic-ai/sdk";
import dotenv from "dotenv";

dotenv.config();

const MODEL = "claude-opus-4-20250514";
const MAX_TOKENS = 8000;
const TEMPERATURE = 0.7;

export class ClaudeClient {
  private client: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error(
        "חסר ANTHROPIC_API_KEY. הוסף אותו לקובץ .env או כמשתנה סביבה."
      );
    }

    this.client = new Anthropic({ apiKey });
  }

  async generateText(
    prompt: string,
    systemPrompt?: string
  ): Promise<string> {
    try {
      const message = await this.client.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        ...(systemPrompt && { system: systemPrompt }),
        messages: [{ role: "user", content: prompt }],
      });

      const block = message.content[0];
      if (block.type === "text") {
        return block.text;
      }

      throw new Error("תגובה לא צפויה מ-Claude API - לא התקבל טקסט.");
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        throw new Error(
          `שגיאת Claude API (${error.status}): ${error.message}`
        );
      }
      throw error;
    }
  }
}
