import BoardRow from "./BoardRow";

interface LandingPageGridProps {
    ownedBoards: any[];
    sharedBoards: any[];
    boardRoles: Record<string, string | null>;
    boardMessages: Record<string, any[]>;
    handleCreateBoard: () => void;
    handlePinToggle: (board: any) => void;
    handleArchiveToggle: (board: any) => void;
    setBoardToDelete: (id: string | null) => void;
    setShareBoardId: (id: string | null) => void;
    handleExport: (board: any) => void;
}

export default function LandingPageGrid({
    ownedBoards, sharedBoards, boardRoles, boardMessages,
    handleCreateBoard, handlePinToggle, handleArchiveToggle,
    setBoardToDelete, setShareBoardId, handleExport
}: LandingPageGridProps) {
    return (
        <>
            <BoardRow
                title="My Boards"
                boards={ownedBoards}
                boardRoles={boardRoles}
                boardMessages={boardMessages}
                onPrimaryAction={{ label: "Create Board", onClick: handleCreateBoard }}
                onPinToggle={handlePinToggle}
                onArchiveToggle={handleArchiveToggle}
                onDelete={setBoardToDelete}
                onShare={setShareBoardId}
                onExport={handleExport}
            />

            <BoardRow
                title="Shared with me"
                boards={sharedBoards}
                boardRoles={boardRoles}
                boardMessages={boardMessages}
                onPinToggle={handlePinToggle}
                onArchiveToggle={handleArchiveToggle}
                onDelete={setBoardToDelete}
                onShare={setShareBoardId}
                onExport={handleExport}
            />
        </>
    );
}
