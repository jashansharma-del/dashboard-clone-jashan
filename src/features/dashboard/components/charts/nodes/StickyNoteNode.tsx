import { Handle, Position } from "reactflow";
import type { NodeProps } from "reactflow";
import { useState } from "react";
import { X } from "lucide-react";
import { CanvasCard } from "../../index";
import { cn } from "@/lib/utils";
import NodeChat from "./NodeChat";
import { useDragDrop } from "@/shared/hooks/DragDropContext";

export type StickyNoteData = {
    text: string;
    color?: string;
    onChange?: (text: string) => void;
};

export default function StickyNoteNode({ id, data, selected }: NodeProps<StickyNoteData>) {
    const [text, setText] = useState(data.text || "");
    const { removeNode, updateNode } = useDragDrop();

    const colors: Record<string, string> = {
        yellow: "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700",
        blue: "bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700",
        green: "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700",
        pink: "bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700",
    };

    const currentColor = data.color || "yellow";

    const handleEdit = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setText(val);
        updateNode(id, { data: { ...data, text: val } });
    };

    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        removeNode(id);
    };

    return (
        <CanvasCard
            className={cn(
                "p-4 w-[250px] min-h-[250px] flex flex-col shadow-sm transition-all relative group overflow-hidden",
                colors[currentColor],
                selected ? "ring-2 ring-blue-500 shadow-md" : "border-2"
            )}
        >
            <Handle type="target" position={Position.Top} className="opacity-0" />
            <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                <button
                    onClick={handleDelete}
                    className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-500"
                    title="Delete note"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
            <NodeChat nodeId={id} />
            <textarea
                value={text}
                onChange={handleEdit}
                placeholder="Type something..."
                className="flex-grow bg-transparent border-none resize-none focus:outline-none text-gray-800 dark:text-gray-100 placeholder:text-gray-400/50"
            />
            <div className="absolute top-2 right-2 opacity-10 font-bold text-4xl pointer-events-none select-none">
                #
            </div>
            <Handle type="source" position={Position.Bottom} className="opacity-0" />
        </CanvasCard>
    );
}
