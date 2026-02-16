import { Home, MoreHorizontal, RotateCcw, Plus } from "lucide-react";
import { CanvasCard } from "@/features/dashboard/components";

interface CanvasHeaderProps {
    title: string | null;
    onAddStickyNote: () => void;
    onRestoreSnapshot: () => void;
}

export const CanvasHeader = ({ title, onAddStickyNote, onRestoreSnapshot }: CanvasHeaderProps) => {
    return (
        <div className="absolute top-4 left-6 z-1">
            <CanvasCard className="flex items-center gap-3 px-4 py-2 text-gray-900 dark:text-white">
                <Home className="cursor-pointer" onClick={() => window.location.assign("/")} />
                <span className="text-sm truncate">
                    {title ?? "New conversation"}
                </span>
                <button type="button" onClick={onAddStickyNote} title="Add sticky note">
                    <Plus className="w-4 h-4" />
                </button>
                <button type="button" onClick={onRestoreSnapshot} title="Restore latest snapshot">
                    <RotateCcw className="w-4 h-4" />
                </button>
                <MoreHorizontal />
            </CanvasCard>
        </div>
    );
};
