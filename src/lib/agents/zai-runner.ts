import ZAI from 'z-ai-web-dev-sdk';

const DEFAULT_TIMEOUT = 120_000;

export async function runZaiChat(
  systemPrompt: string,
  userPrompt: string,
  opts?: { temperature?: number; maxTokens?: number; timeoutMs?: number }
): Promise<string> {
  const zai = await ZAI.create();
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT;

  const completion = await Promise.race([
    zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: opts?.temperature ?? 0.4,
      max_tokens: opts?.maxTokens ?? 6000,
    }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Tiempo de espera del agente agotado')), timeoutMs)
    ),
  ]);

  const content = completion.choices?.[0]?.message?.content;
  if (!content) throw new Error('El agente no devolvió contenido');
  return content;
}

export function extractJsonBlock(text: string): unknown {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) return JSON.parse(fence[1].trim());
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(text.slice(start, end + 1));
  throw new Error('JSON no encontrado en respuesta del agente');
}
