import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../../../store";

import DragDropWrapper from "../../../shared/hooks/DragDropWrapper";
import { BoardCanvas } from "../components/canvas/NewBoardPage";
import { canEditBoard } from "../../../data/shareStorage";

export default function FeaturedCanvasPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const userId = useSelector((state: RootState) => state.auth.user?.$id || null);

  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkPermissions = async () => {
      if (!boardId || !userId) {
        setCanEdit(false);
        return;
      }

      try {
        const editable = await canEditBoard(boardId, userId);
        if (!cancelled) {
          setCanEdit(editable);
        }
      } catch {
        if (!cancelled) {
          setCanEdit(false);
        }
      }
    };

    checkPermissions();

    return () => {
      cancelled = true;
    };
  }, [boardId, userId]);

  if (!boardId) {
    return (
      <div className="h-[calc(100vh-4rem)] flex items-center justify-center bg-background text-foreground">
        <p className="text-sm text-muted-foreground">No board selected for featured canvas.</p>
      </div>
    );
  }

  return (
    <DragDropWrapper boardId={boardId}>
      <div className="h-[calc(100vh-4rem)] relative bg-background text-foreground min-h-[500px]">
        <BoardCanvas
          // Editor/owner: full editing experience
          // Viewers: read-only featured view (locked graph, no assistant)
          lockGraph={!canEdit}
          hideAssistant={!canEdit}
        />
      </div>
    </DragDropWrapper>
  );
}

