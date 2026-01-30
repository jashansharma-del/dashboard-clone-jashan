import { useParams } from "react-router-dom";

import DragDropWrapper from "../../../shared/hooks/DragDropWrapper";
import { BoardCanvas } from "../components/canvas/NewBoardPage";

export default function NewBoardPage() {
  const { boardId } = useParams<{ boardId: string }>();

  console.log("🏗️ NewBoardPage rendering with boardId:", boardId);

  return (
    <DragDropWrapper boardId={boardId}>
      <div className="h-[calc(100vh-4rem)] relative bg-background text-foreground min-h-[500px]">
        <BoardCanvas />
      </div>
    </DragDropWrapper>
  );
}