import { useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { addNotification } from "@/store/uiSlice";
import { buildGraphPdf, sanitizeGraphData } from "@/features/dashboard/components/utils/pdfGenerator";
import { useBoards } from "./useBoards";

export const useLandingPage = () => {
    const dispatch = useDispatch();
    const boardData = useBoards();

    const [boardToDelete, setBoardToDelete] = useState<string | null>(null);
    const [shareBoardId, setShareBoardId] = useState<string | null>(null);
    const importRef = useRef<HTMLInputElement>(null);

    const handleExport = (board: any) => {
        const chat = boardData.boardMessages[board.id] || [];
        const graphs = chat.filter(m => m.graphData).map(m => ({
            type: m.chartType || "pie",
            data: sanitizeGraphData(m.graphData)
        }));

        if (!graphs.length) {
            return dispatch(addNotification({ message: "No graph to export", type: "error" }));
        }

        const blob = buildGraphPdf(graphs as any);
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `board-${board.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const confirmDelete = () => {
        if (boardToDelete) {
            boardData.handleDeleteBoard(boardToDelete);
            setBoardToDelete(null);
        }
    };

    return {
        ...boardData,
        boardToDelete,
        setBoardToDelete,
        shareBoardId,
        setShareBoardId,
        importRef,
        handleExport,
        confirmDelete
    };
};
