import { generateText, resolveModelRoute, getApiKeys } from '../shared/ai';

const AGENT_SYSTEM_PROMPT_BASE = [
  'You are the sour.ai Agent, an expert AI pair-programmer built directly into the sour.ai code workspace (IDE).',
  'You are given the current project file tree and, for files that are open or @-mentioned, their contents.',
  '',
  'LANGUAGE RESTRICTIONS: Only use languages supported by the IDE: HTML, CSS, JavaScript, Python, Java, C/C++, C#, Go, Rust, Ruby, PHP, SQL, YAML, TOML, JSON, Markdown, Bash/Shell, XML, SVG, and other languages exposed by CodeMirror. Do NOT generate TypeScript, JSX, TSX, Vue, Svelte, or any other framework-specific syntax.',
  '',
  'When you want to CREATE or MODIFY a file, output the entire resulting content of that file inside a fenced code block formatted EXACTLY like this, including the path attribute:',
  '',
  '```tsx path="src/components/Button.tsx"',
  'export default function Button() {',
  '  return <button>Click me</button>;',
  '}',
  '```',
  '',
  'Rules for file blocks:',
  '- Always include the COMPLETE file content, never a diff or a partial snippet with "..." placeholders.',
  '- Use forward-slash relative paths from the project root (e.g. "src/App.tsx"), never absolute paths.',
  '- You may output multiple file blocks in one response to change several files at once.',
  '- Pick a language tag that matches the file extension (js, css, html, json, py, md, etc).',
  '',
  'To DELETE a file, add a standalone line (outside any code block) exactly like:',
  '@@delete: path/to/file.ext',
  '',
  'SUB-AGENTS: For large or multi-part requests, you may delegate chunks to sub-agents:',
  '@@subagent: <a short, self-contained description of the sub-task>',
  '',
  'TOOL — Read file:',
  '@@readfile: path/to/file',
  'You may request multiple files at once, one line per file.',
  '',
  'TOOL — Find in all files:',
  '@@findall: search term or regex',
  'The workspace searches every loaded file and returns matching lines with file paths and line numbers.',
  '',
  'General guidelines:',
  '- Keep prose explanations brief, clear, and outside of code blocks.',
  '- Never invent file contents you were not shown.',
  '- Match the existing code style, language, and conventions.',
].join('\n');

function buildAgentContextBlock(
  projectFiles: string[],
  activeFile: { path: string; content: string } | null | undefined,
  mentionedFiles: { path: string; content: string }[]
): string {
  const lines: string[] = [];

  if (projectFiles.length > 0) {
    lines.push(`Project files (${projectFiles.length}):`);
    lines.push(projectFiles.slice(0, 300).map((p) => `- ${p}`).join('\n'));
  } else {
    lines.push('The project currently has no files yet.');
  }

  if (activeFile && activeFile.path) {
    lines.push('');
    lines.push(`Currently open file: ${activeFile.path}`);
    lines.push('```');
    lines.push(activeFile.content || '');
    lines.push('```');
  }

  for (const f of mentionedFiles) {
    if (!f || !f.path) continue;
    lines.push('');
    lines.push(`Referenced file: ${f.path}`);
    lines.push('```');
    lines.push(f.content || '');
    lines.push('```');
  }

  return lines.join('\n');
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
      model?: string;
      mode?: string;
      activeFile?: { path: string; content: string } | null;
      projectFiles?: string[];
      mentionedFiles?: { path: string; content: string }[];
    };

    const {
      messages = [],
      model,
      mode = 'ask',
      activeFile,
      projectFiles = [],
      mentionedFiles = [],
    } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Messages array is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const route = resolveModelRoute(model);

    // Build the context block with file information
    const contextBlock = buildAgentContextBlock(projectFiles, activeFile, mentionedFiles);

    // Build the full prompt with system instruction
    const systemInstruction = [
      AGENT_SYSTEM_PROMPT_BASE,
      mode === 'write'
        ? 'The user currently has "Write" mode selected: when changes are needed, output file blocks directly so they can be applied immediately.'
        : 'The user currently has "Ask" mode selected: it is fine to include file blocks when they help, as the user reviews every change.',
      '',
      'File context:',
      contextBlock,
    ].join('\n\n');

    // Prepare message content for Gemini format
    const contents = messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content || '' }],
    }));

    const plainMessages = messages.map((m: any) => ({
      role: m.role,
      content: m.content || '',
    }));

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
    console.error('Agent error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
