import { useState, useEffect } from "react";
import { MessageSquare, Send, X } from "lucide-react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { createChatMessage, listChatMessages } from "@/data/chatStorage";
import type { Message } from "@/data/boardStorage";
import { useParams } from "react-router-dom";
import { cn } from "@/shared/utils/lib/utils";

export default function NodeChat({ nodeId }: { nodeId: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputText, setInputText] = useState("");
    const { boardId } = useParams<{ boardId: string }>();
    const userId = useSelector((state: RootState) => state.auth.user?.$id || "");

    useEffect(() => {
        if (!isOpen || !boardId) return;
        listChatMessages(boardId).then(setMessages);
    }, [isOpen, boardId]);

    const handleSend = async () => {
        if (!inputText.trim() || !boardId || !userId) return;
        const msg = await createChatMessage(boardId, {
            role: "user",
            text: `[Node ${nodeId}] ${inputText}`,
        }, userId);
        setMessages((prev) => [...prev, msg]);
        setInputText("");
    };

    return (
        <div className="absolute top-2 left-2 z-[100]">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1.5 rounded-full bg-white/80 dark:bg-gray-800/80 shadow-sm border hover:bg-white dark:hover:bg-gray-700 transition-colors"
            >
                <MessageSquare className="w-4 h-4 text-blue-500" />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-80 overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-2 border-b flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                        <span className="text-xs font-semibold text-gray-500">Node Chat</span>
                        <button onClick={() => setIsOpen(false)}>
                            <X className="w-3 h-3 text-gray-400" />
                        </button>
                    </div>
                    <div className="flex-grow overflow-y-auto p-2 space-y-2">
                        {messages.filter(m => m.text.includes(`[Node ${nodeId}]`)).map((msg) => (
                            <div key={msg.id} className="text-xs text-gray-700 dark:text-gray-300">
                                <p className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
                                    {msg.text.replace(`[Node ${nodeId}] `, "")}
                                </p>
                            </div>
                        ))}
                        {messages.filter(m => m.text.includes(`[Node ${nodeId}]`)).length === 0 && (
                            <p className="text-[10px] text-gray-400 text-center py-4">No comments for this node yet.</p>
                        )}
                    </div>
                    <div className="p-2 border-t flex gap-1">
                        <input
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Add a comment..."
                            className="flex-grow text-xs bg-gray-50 dark:bg-gray-900 border-none rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 outline-none"
                            onKeyDown={(e) => e.key === "Enter" && handleSend()}
                        />
                        <button onClick={handleSend} className="p-1 text-blue-500">
                            <Send className="w-3 h-3" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
