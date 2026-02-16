const IMPORTED_BOARD_IDS_STORAGE_KEY = "imported-board-ids";

export function loadImportedBoardIds(userId: string | null): string[] {
    if (!userId) return [];
    try {
        const raw = window.localStorage.getItem(`${IMPORTED_BOARD_IDS_STORAGE_KEY}:${userId}`);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((id) => typeof id === "string");
    } catch {
        return [];
    }
}

export function persistImportedBoardIds(userId: string | null, boardIds: string[]) {
    if (!userId) return;
    window.localStorage.setItem(
        `${IMPORTED_BOARD_IDS_STORAGE_KEY}:${userId}`,
        JSON.stringify(boardIds)
    );
}
