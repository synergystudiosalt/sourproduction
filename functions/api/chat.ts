import { generateText, resolveModelRoute, getApiKeys } from '../shared/ai';

async function convertAttachmentsToGeminiContents(
  attachments: any[] = []
): Promise<any[]> {
  const contents: any[] = [];

  for (const att of attachments) {
    if (att.type === 'image') {
      if (att.dataUrl) {
        const [headerPart, dataPart] = att.dataUrl.split(',');
        const mimeMatch = headerPart.match(/data:([^;]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

        contents.push({
          type: 'image',
          source: {
            type: 'base64',
            mediaType: mimeType,
            data: dataPart,
          },
        });
      }
    } else if (att.type === 'pdf' && att.dataUrl) {
      const [, dataPart] = att.dataUrl.split(',');
      contents.push({
        type: 'document',
        source: {
          type: 'base64',
          mediaType: 'application/pdf',
          data: dataPart,
        },
      });
    }
  }

  return contents;
}

export const onRequest: PagesFunction = async (context) => {
  if (context.request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const env = context.env as Record<string, string>;
    const { geminiKeys, groqKeys } = getApiKeys(env);

    if (geminiKeys.length === 0 && groqKeys.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No API keys configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await context.request.json() as {
      messages?: any[];
      attachments?: any[];
      model?: string;
    };

    const { messages = [], attachments = [], model } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const route = resolveModelRoute(model);

    // Convert attachments to Gemini format
    const attachmentContents = await convertAttachmentsToGeminiContents(
      attachments
    );

    // Build contents for Gemini (multimodal support)
    const contents = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [
        { text: m.content || '' },
        ...(m.role === 'user' && attachmentContents.length > 0
          ? attachmentContents
          : []),
      ],
    }));

    const plainMessages = messages.map((m: any) => ({
      role: m.role,
      content: m.content || '',
    }));

    const systemInstruction =
      'You are a helpful AI assistant. Provide clear, concise, and accurate responses.';

    const text = await generateText({
      geminiKeys,
      groqKeys,
      contents,
      plainMessages,
      systemInstruction,
      route,
    });

    return new Response(JSON.stringify({ text }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Chat error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
