/**
 * Gemini REST API client.
 * Uses fetch directly — no npm package required.
 * All calls are event-triggered and cached at the report layer.
 */

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_OUTPUT_TOKENS = 512;
const TEMPERATURE = 0.3; // Low temperature = consistent, professional output

export interface GeminiResponse {
  text: string;
  finishReason: string;
  tokenCount?: number;
}

export class GeminiError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

/** Send a single prompt to Gemini and return normalized text response. */
export async function generateCoachingInsight(
  systemPrompt: string,
  userPrompt: string,
  retries = 2
): Promise<GeminiResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new GeminiError("GEMINI_API_KEY not configured");
  }

  const url = `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const body = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: "user",
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      temperature: TEMPERATURE,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      candidateCount: 1,
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
    ],
  };

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });

      if (!response.ok) {
        if (response.status === 429 && attempt < retries) {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        const errorBody = await response.text().catch(() => "");
        throw new GeminiError(
          `Gemini API error ${response.status}: ${errorBody.slice(0, 200)}`,
          response.status
        );
      }

      const data = await response.json();
      const candidate = data?.candidates?.[0];
      const text: string = candidate?.content?.parts?.[0]?.text ?? "";
      const finishReason: string = candidate?.finishReason ?? "UNKNOWN";
      const tokenCount: number | undefined = data?.usageMetadata?.totalTokenCount;

      if (!text) {
        throw new GeminiError("Empty response from Gemini");
      }

      return { text: text.trim(), finishReason, tokenCount };
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
    }
  }

  throw new GeminiError("Gemini call failed after retries");
}

/** Parse Gemini text output into structured insight + recommendations. */
export function parseInsightResponse(text: string): {
  insights: string[];
  recommendations: string[];
  summary: string;
} {
  // Split on sentence boundaries, classify each sentence
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  const recommendations: string[] = [];
  const insights: string[] = [];

  const actionWords = /\b(reduce|increase|prioritize|add|remove|consider|focus|cut|deload|rest|adjust|switch|try)\b/i;

  for (const s of sentences) {
    if (actionWords.test(s)) {
      recommendations.push(s);
    } else {
      insights.push(s);
    }
  }

  // First insight sentence becomes the summary
  const summary = insights[0] ?? sentences[0] ?? text.slice(0, 120);

  return {
    summary,
    insights: insights.slice(0, 3),
    recommendations: recommendations.slice(0, 3),
  };
}
