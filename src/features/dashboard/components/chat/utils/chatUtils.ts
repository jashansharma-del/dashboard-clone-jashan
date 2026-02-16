export function extractMentions(body: string): string[] {
    const matches = body.match(/@[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/g) || [];
    return matches.map((m) => m.slice(1).toLowerCase());
}
