import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/api-auth';

const SYSTEM_PROMPT = `You are a JSXGraph JavaScript code completion assistant.
Output ONLY the code to insert at the cursor (marked by █). No explanation, no markdown fences.
Use board.create() style. Prefer concise, idiomatic JSXGraph API.
Maximum 6 lines. Output a single logical statement or short block.`;

export async function POST(request: NextRequest) {
  // Only authenticated users may use AI suggestions
  const auth = await getAuthUser(request);
  if (!auth) return NextResponse.json({ suggestion: '' }, { status: 401 });

  let code: string;
  try {
    ({ code } = await request.json() as { code: string });
  } catch {
    return NextResponse.json({ suggestion: '' }, { status: 400 });
  }

  if (!code || typeof code !== 'string' || code.trim().length < 20) {
    return NextResponse.json({ suggestion: '' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ suggestion: '' });

  // Send only the last 2000 chars to save tokens
  const context = code.slice(-2000);

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 120,
        temperature: 0.2,
        stream: false,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Complete this JSXGraph code at the cursor (marked by █):\n\`\`\`js\n${context}█\n\`\`\``,
          },
        ],
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!groqRes.ok) return NextResponse.json({ suggestion: '' });

    const json = await groqRes.json() as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content ?? '';

    // Strip markdown fences in case the model adds them despite instructions
    const cleaned = raw
      .replace(/^```(?:js|javascript)?\n?/, '')
      .replace(/\n?```$/, '')
      .trim();

    // Remove any prefix overlap: if the model repeats text already in the editor
    // (e.g. code ends with "var B = " and model returns "var B = board.create(...)"),
    // strip the repeated part so Tab only inserts what's genuinely new.
    const suggestion = stripOverlap(context, cleaned);

    return NextResponse.json({ suggestion: suggestion.trim() });
  } catch {
    return NextResponse.json({ suggestion: '' });
  }
}

/**
 * Strip the longest suffix of `code` that matches a prefix of `suggestion`.
 * Handles the common LLM failure mode of repeating context before the cursor.
 * Only strips if the overlap is >= 3 chars (avoids stripping single spaces/chars).
 */
function stripOverlap(code: string, suggestion: string): string {
  const maxLen = Math.min(code.length, suggestion.length);
  for (let len = maxLen; len >= 3; len--) {
    if (code.endsWith(suggestion.slice(0, len))) {
      return suggestion.slice(len);
    }
  }
  return suggestion;
}
