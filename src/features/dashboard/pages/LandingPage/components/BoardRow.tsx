import { useNavigate } from "react-router-dom";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import SectionHeader from "@/shared/components/ui/ui/SectionHeader";
import BoardCard from "@/shared/components/ui/ui/BoardCard";

interface BoardRowProps {
    title: string;
    boards: any[];
    boardRoles: Record<string, string | null>;
    boardMessages: Record<string, any[]>;
    onPrimaryAction?: { label: string; onClick: () => void };
    onPinToggle: (board: any) => void;
    onArchiveToggle: (board: any) => void;
    onDelete: (boardId: string) => void;
    onShare: (boardId: string) => void;
    onExport: (board: any) => void;
}

export default function BoardRow({
    title,
    boards,
    boardRoles,
    boardMessages,
    onPrimaryAction,
    onPinToggle,
    onArchiveToggle,
    onDelete,
    onShare,
    onExport
}: BoardRowProps) {
    const navigate = useNavigate();

    const getBoardWidgets = (board: any) => {
        const widgets: any[] = [];
        const chatMessages = boardMessages[board.id] || [];
        chatMessages.filter(msg => msg.role === "assistant" && msg.graphData).forEach((msg, i) => {
            widgets.push({ type: "chart", label: `Chart ${i + 1}`, data: msg.graphData });
        });
        return [...widgets, ...(board.widgets || [])];
    };

    const getBoardTitle = (boardId: string) => {
        const messages = boardMessages[boardId] || [];
        const firstUser = messages.find(m => m.role === "user" && m.text.trim());
        return firstUser ? (firstUser.text.length > 30 ? firstUser.text.slice(0, 30) + "..." : firstUser.text) : "Untitled Board";
    };

    return (
        <section className="max-w-full">
            <SectionHeader title={title} primaryAction={onPrimaryAction} />
            <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide px-2">
                {boards.map(board => {
                    const role = boardRoles[board.id];
                    const canEdit = role === "owner" || role === "editor";
                    return (
                        <div key={board.id} className="w-[380px] flex-shrink-0">
                            <BoardCard
                                title={getBoardTitle(board.id)}
                                widgets={getBoardWidgets(board)}
                                onClick={() => navigate(`/newboard/${board.id}`)}
                                showMenu
                                canMutate={canEdit}
                                isPinned={!!board.isPinned}
                                onPinToggle={() => onPinToggle(board)}
                                onDelete={() => onDelete(board.id)}
                                onShare={() => onShare(board.id)}
                            />
                            <div className="mt-2 flex gap-2">
                                {canEdit && (
                                    <Button variant="outline" size="sm" onClick={() => onArchiveToggle(board)}>
                                        {board.archived ? "Restore" : "Archive"}
                                    </Button>
                                )}
                                <Button variant="outline" size="sm" onClick={() => onExport(board)}>
                                    <Download className="w-3 h-3 mr-1" /> PDF
                                </Button>
                            </div>
                            {!canEdit && <div className="mt-2 text-xs text-muted-foreground italic">Role: {role || "viewer"}</div>}
                        </div>
                    );
                })}
                {!boards.length && <p className="text-muted-foreground italic px-2">No boards found here.</p>}
            </div>
        </section>
    );
}
