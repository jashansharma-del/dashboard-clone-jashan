import { NodeResizer, type NodeProps } from "reactflow";
import { Sparkles, X } from "lucide-react";
import { useDragDrop } from "@/shared/hooks/DragDropContext";

export type SummaryNodeData = {
    title: string;
    content: string;
};

const SummaryNode = ({ id, data, selected }: NodeProps<SummaryNodeData>) => {
    const { removeNode } = useDragDrop();

    return (
        <>
            <NodeResizer
                color="#8B5CF6"
                isVisible={selected}
                minWidth={200}
                minHeight={150}
                handleStyle={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '2px',
                }}
            />

            <div
                className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border-2 overflow-hidden transition-all duration-300 flex flex-col group"
                style={{
                    width: '100%',
                    height: '100%',
                    borderColor: selected ? "#8B5CF6" : "#E5E7EB",
                }}
            >
                <div className="bg-purple-50 dark:bg-purple-900/20 px-3 py-2 flex items-center justify-between border-b dark:border-purple-800/50">
                    <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-semibold text-xs uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>AI Insight</span>
                    </div>
                    <button
                        onClick={() => removeNode(id)}
                        className="p-1 hover:bg-purple-100 dark:hover:bg-purple-800 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <X className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    </button>
                </div>

                <div className="p-4 flex-1 overflow-y-auto">
                    <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-2 leading-tight">
                        {data.title || "Observation"}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                        {data.content}
                    </p>
                </div>

                <div className="h-1 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-purple-500 animate-pulse" />
            </div>
        </>
    );
};

export default SummaryNode;
