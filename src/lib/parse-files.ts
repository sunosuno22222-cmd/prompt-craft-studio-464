// Parse <file path="...">...</file> blocks out of a model response.

export interface ParsedFile {
  path: string;
  content: string;
}

const FILE_RE = /<file\s+path=["']([^"']+)["']\s*>([\s\S]*?)<\/file>/g;

export function parseFiles(text: string): ParsedFile[] {
  const out: ParsedFile[] = [];
  let m: RegExpExecArray | null;
  while ((m = FILE_RE.exec(text)) !== null) {
    const path = m[1].trim();
    const content = m[2].replace(/^\n/, "").replace(/\n\s*$/, "\n");
    out.push({ path, content });
  }
  return out;
}

// Strip file blocks from the text so we can show only the explanation in chat.
export function stripFileBlocks(text: string): string {
  return text.replace(FILE_RE, "").trim();
}
