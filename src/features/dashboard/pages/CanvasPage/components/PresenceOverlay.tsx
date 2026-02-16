import type { PresenceRecord } from "@/data/presenceStorage";

interface PresenceOverlayProps {
    presence: PresenceRecord[];
}

export const PresenceOverlay = ({ presence }: PresenceOverlayProps) => {
    return (
        <>
            {presence.map((entry) => (
                <div
                    key={entry.id}
                    className="absolute pointer-events-none z-10"
                    style={{ left: entry.cursorX, top: entry.cursorY }}
                >
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                    <div className="text-[10px] bg-white/90 dark:bg-gray-900/90 border rounded px-1 mt-1">
                        {entry.userId.slice(0, 6)}
                    </div>
                </div>
            ))}
        </>
    );
};
