import { useState, useEffect, useRef } from "react";
import { Send, Mic, MessageCircleMore } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import type { RootState, AppDispatch } from "../../../../store";
import { addNotification } from "../../../../store/uiSlice";
import {
  setActiveChat,
  addMessage,
  fetchChatHistory,
  updateMessage,
} from "../../../../store/chatSlice";
import { createChatMessage } from "../../../../data/chatStorage";
import { requestAIResponse, type AIResponse } from "../../../../data/aiStorage";
import {
  createBoardComment,
  listBoardComments,
  resolveBoardComment,
  type BoardComment,
} from "../../../../data/commentsStorage";
import { createNotification } from "../../../../data/notificationsStorage";
import { withRetry } from "../../../../lib/retry";

import { LoadingDots } from "./components/LoadingDots";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { PieChart, BarChart, LineChart, type Slice } from "./components/ChatCharts";
import { BoardComments } from "./components/BoardComments";
import { extractMentions } from "./utils/chatUtils";

type Message = {
  id: string;
  text: string;
  role: "user" | "assistant";
  graphData?: Slice[];
  chartType?: "pie" | "bar" | "line";
  isLoading?: boolean;
};

export default function AIAssistantBody({
  onExecuteCommand,
}: {
  onExecuteCommand?: (command: any) => void;
}) {
  const { boardId } = useParams<{ boardId: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { messages, activeChatId } = useSelector((state: RootState) => state.chat);
  const userId = useSelector((state: RootState) => state.auth.user?.$id || "");
  const userEmail = useSelector((state: RootState) => state.auth.user?.email || "");
  const [input, setInput] = useState("");
  const [comments, setComments] = useState<BoardComment[]>([]);
  const [commentsOpen, setCommentsOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (boardId) {
      dispatch(setActiveChat(boardId));
      dispatch(fetchChatHistory(boardId));
      listBoardComments(boardId).then(setComments);
    }
  }, [boardId, dispatch]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !activeChatId) return;

    const messageText = input.trim();
    setInput("");

    const userMsg: Message = {
      id: uuidv4(),
      text: messageText,
      role: "user",
    };

    dispatch(addMessage(userMsg));

    if (userId) {
      try {
        await createChatMessage(activeChatId, { text: messageText, role: "user" }, userId);
      } catch (error) {
        console.error("Failed to persist user message:", error);
      }
    }

    const assistantMsgId = uuidv4();
    dispatch(
      addMessage({
        id: assistantMsgId,
        text: "",
        role: "assistant",
        isLoading: true,
      })
    );

    const ai = await withRetry(
      () => requestAIResponse({ boardId: activeChatId, message: messageText, contextWindow: 20 }, userId),
      { retries: 2, baseDelayMs: 400 }
    ).catch(() => ({ assistantText: "Unable to reach AI service.", chart: undefined } as AIResponse));

    if (!ai.chart) {
      dispatch(
        addNotification({
          message: "AI returned text-only response. Check AI endpoint/function config.",
          type: "warning",
        })
      );
    }

    const chartType = ai.chart?.type;
    const graphData = ai.chart?.series;

    // Execute AI commands if present
    if (ai.commands && onExecuteCommand) {
      ai.commands.forEach((cmd: any) => onExecuteCommand(cmd));
    }

    dispatch(
      updateMessage({
        id: assistantMsgId,
        updates: {
          text: ai.assistantText,
          isLoading: false,
          graphData,
          chartType,
        },
      })
    );

    if (userId) {
      try {
        await createChatMessage(
          activeChatId,
          {
            text: ai.assistantText,
            role: "assistant",
            graphData,
            chartType,
          } as Message,
          userId
        );
      } catch (error) {
        console.error("Failed to persist assistant message:", error);
      }
    }
  };

  const handleAddComment = async (text: string) => {
    if (!boardId || !userId) return;

    const mentions = extractMentions(text);
    const created = await createBoardComment({
      boardId,
      authorId: userId,
      body: text,
      mentions,
      parentCommentId: null,
      nodeId: null,
      resolvedAt: null,
    });
    setComments((prev) => [...prev, created]);

    dispatch(addNotification({ message: "Comment added", type: "success" }));

    for (const mention of mentions) {
      if (mention === userEmail.toLowerCase()) continue;
      await createNotification({
        userId,
        type: "mention",
        title: "Mention detected",
        body: `Mentioned ${mention} in board comment`,
        link: boardId ? `/newboard/${boardId}` : "/boards",
        metaJson: JSON.stringify({ mention }),
      });
    }
  };

  const handleResolveComment = async (commentId: string, resolved: boolean) => {
    await resolveBoardComment(commentId, resolved);
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId
          ? { ...comment, resolvedAt: resolved ? new Date().toISOString() : null }
          : comment
      )
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-white dark:bg-gray-800">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 min-h-0 bg-white dark:bg-gray-800">
        {messages.length === 0 ? (
          <WelcomeScreen
            onSuggestionClick={(text) => {
              setInput(text);
              setTimeout(handleSend, 0);
            }}
          />
        ) : (
          <div className="flex flex-col gap-4 pb-2">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className="max-w-md flex flex-col gap-2">
                  {msg.isLoading ? (
                    <div className="px-3 py-2 rounded bg-gray-200 dark:bg-gray-700">
                      <LoadingDots />
                    </div>
                  ) : (
                    <>
                      <div
                        className={`px-3 py-2 rounded ${msg.role === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-200 dark:bg-gray-700 dark:text-white"
                          }`}
                      >
                        {msg.text}
                      </div>

                      {msg.graphData && (
                        <div className="bg-white dark:bg-gray-700 border dark:border-gray-600 rounded p-4">
                          {msg.chartType === "bar" ? (
                            <BarChart data={msg.graphData} />
                          ) : msg.chartType === "line" ? (
                            <LineChart data={msg.graphData} />
                          ) : (
                            <PieChart data={msg.graphData} />
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BoardComments
        isOpen={commentsOpen}
        comments={comments}
        onAddComment={handleAddComment}
        onResolveComment={handleResolveComment}
      />

      <div className="border-t px-4 py-3 bg-white dark:bg-gray-800 dark:border-t-gray-700 shrink-0">
        <div className="flex items-center gap-2 border dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-700">
          <input
            className="flex-1 outline-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Ask the AI Assistant..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />

          <button
            type="button"
            className={`p-1 rounded ${commentsOpen ? "bg-gray-200 dark:bg-gray-600" : ""}`}
            onClick={() => setCommentsOpen((prev) => !prev)}
            title="Toggle comments"
          >
            <MessageCircleMore className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>

          <Mic className="w-5 h-5 text-gray-400 dark:text-gray-500" />

          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="bg-blue-600 hover:bg-blue-700 p-2 rounded disabled:opacity-50"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
