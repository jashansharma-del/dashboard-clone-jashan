import ConfirmDeleteDialog from "@/features/dashboard/components/BoardList/ConfirmDeleteDialog";
import ShareBoardDialog from "@/features/dashboard/components/BoardList/ShareBoardDialog";

interface LandingPageDialogsProps {
    boardToDelete: string | null;
    setBoardToDelete: (id: string | null) => void;
    confirmDelete: () => void;
    shareBoardId: string | null;
    setShareBoardId: (id: string | null) => void;
    userId: string | null;
    handleImportBoard: (event: React.ChangeEvent<HTMLInputElement>) => void;
    importRef: React.RefObject<HTMLInputElement | null>;
}

export default function LandingPageDialogs({
    boardToDelete,
    setBoardToDelete,
    confirmDelete,
    shareBoardId,
    setShareBoardId,
    userId,
    handleImportBoard,
    importRef
}: LandingPageDialogsProps) {
    return (
        <>
            <input
                ref={importRef}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={handleImportBoard}
            />

            <ConfirmDeleteDialog
                isOpen={!!boardToDelete}
                onCancel={() => setBoardToDelete(null)}
                onConfirm={confirmDelete}
            />

            <ShareBoardDialog
                boardId={shareBoardId}
                onClose={() => setShareBoardId(null)}
                userId={userId || ""}
            />
        </>
    );
}
