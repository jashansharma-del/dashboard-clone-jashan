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
import { requestAIResponse } from "../../../../data/aiStorage";
import {
  createBoardComment,
  listBoardComments,
  resolveBoardComment,
  type BoardComment,
} from "../../../../data/commentsStorage";
import { createNotification } from "../../../../data/notificationsStorage";
import { withRetry } from "../../../../lib/retry";

type Slice = { label: string; value: number };

type Message = {
  id: string;
  text: string;
  role: "user" | "assistant";
  graphData?: Slice[];
  chartType?: "pie" | "bar" | "line";
  isLoading?: boolean;
};

const LoadingDots = () => {
  return (
    <div className="flex gap-1 items-center py-2">
      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
    </div>
  );
};

const PieChart = ({ data }: { data: Slice[] }) => {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const colors = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444"];

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    const dragData = {
      type: "pie-chart",
      data,
    };
    e.dataTransfer.setData("application/reactflow", JSON.stringify(dragData));
    e.dataTransfer.setData("text/plain", "chart");
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div draggable onDragStart={handleDragStart} className="relative w-fit cursor-move select-none" title="Drag chart to canvas">
      {hovered !== null && (
        <div
          className="absolute bg-black dark:bg-gray-900 text-white text-xs px-3 py-1 rounded z-50 pointer-events-none"
          style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -120%)" }}
        >
          <div className="font-semibold">{data[hovered].label}</div>
          <div>
            {data[hovered].value} ({Math.round((data[hovered].value / total) * 100)}%)
          </div>
        </div>
      )}

      <svg width={180} height={180} viewBox="0 0 32 32">
        {data.map((slice, idx) => {
          let accumulated = data.slice(0, idx).reduce((sum, s) => sum + s.value, 0);
          const start = (accumulated / total) * 2 * Math.PI;
          accumulated += slice.value;
          const end = (accumulated / total) * 2 * Math.PI;

          const x1 = 16 + 16 * Math.cos(start);
          const y1 = 16 + 16 * Math.sin(start);
          const x2 = 16 + 16 * Math.cos(end);
          const y2 = 16 + 16 * Math.sin(end);

          const largeArcFlag = slice.value / total > 0.5 ? 1 : 0;

          return (
            <path
              key={idx}
              d={`M16 16 L ${x1} ${y1} A 16 16 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
              fill={colors[idx % colors.length]}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
              onMouseMove={(e) => {
                const parentRect = (e.currentTarget.parentElement as HTMLDivElement).getBoundingClientRect();
                setPos({ x: e.clientX - parentRect.x, y: e.clientY - parentRect.y });
              }}
            >
              <title>
                {slice.label}: {slice.value}
              </title>
            </path>
          );
        })}
      </svg>
    </div>
  );
};

const BarChart = ({ data }: { data: Slice[] }) => {
  const maxValue = Math.max(...data.map((slice) => slice.value), 1);
  const colors = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444"];

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    const dragData = {
      type: "bar-chart",
      data,
    };
    e.dataTransfer.setData("application/reactflow", JSON.stringify(dragData));
    e.dataTransfer.setData("text/plain", "chart");
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div draggable onDragStart={handleDragStart} className="relative w-fit cursor-move select-none" title="Drag chart to canvas">
      <svg width={180} height={180} viewBox="0 0 32 32">
        <g transform="translate(4, 4)">
          {data.map((slice, idx) => {
            const barWidth = (24 / data.length) * 0.7;
            const barHeight = (slice.value / maxValue) * 24;
            const x = idx * (24 / data.length) + (24 / data.length - barWidth) / 2;
            const y = 28 - barHeight;

            return (
              <g key={idx}>
                <rect x={x} y={y} width={barWidth} height={barHeight} fill={colors[idx % colors.length]} rx="1" />
                <title>
                  {slice.label}: {slice.value}
                </title>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
};

const LineChart = ({ data }: { data: Slice[] }) => {
  const maxValue = Math.max(...data.map((slice) => slice.value), 1);
  const colors = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444"];

  const points = data.map((slice, idx) => {
    const x = 4 + idx * (24 / (data.length - 1 || 1));
    const y = 28 - (slice.value / maxValue) * 24;
    return { x, y, label: slice.label, value: slice.value };
  });

  const linePath = points.length > 1 ? `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}` : "";

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    const dragData = {
      type: "line-chart",
      data,
    };
    e.dataTransfer.setData("application/reactflow", JSON.stringify(dragData));
    e.dataTransfer.setData("text/plain", "chart");
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div draggable onDragStart={handleDragStart} className="relative w-fit cursor-move select-none" title="Drag chart to canvas">
      <svg width={180} height={180} viewBox="0 0 32 32">
        {linePath && (
          <path d={linePath} fill="none" stroke={colors[0]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {points.map((point, idx) => (
          <g key={idx}>
            <circle cx={point.x} cy={point.y} r="2" fill={colors[idx % colors.length]} stroke="white" strokeWidth="0.5" />
            <title>
              {point.label}: {point.value}
            </title>
          </g>
        ))}
      </svg>
    </div>
  );
};

const WelcomeScreen = ({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) => {
  const suggestions = [
    "Analyze sales performance",
    "Create a pie chart",
    "Summarize this data",
    "Generate insights",
  ];

  return (
    <div className="flex flex-col items-center justify-center gap-6 text-center h-full">
      <img src="/Cisco-AI-Assistant.png" className="w-24 h-24 rounded-full bg-blue-50 dark:bg-gray-700 p-3" />
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">How can I help today?</h2>
      <div className="w-full max-w-md flex flex-col gap-3">
        {suggestions.map((text, i) => (
          <button
            key={i}
            onClick={() => onSuggestionClick(text)}
            className="border dark:border-gray-700 rounded-lg px-4 py-3 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
};

function extractMentions(body: string): string[] {
  const matches = body.match(/@[\w.-]+@[\w.-]+\.[A-Za-z]{2,}/g) || [];
  return matches.map((m) => m.slice(1).toLowerCase());
}

export default function AIAssistantBody() {
  const { boardId } = useParams<{ boardId: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const { messages, activeChatId } = useSelector((state: RootState) => state.chat);
  const userId = useSelector((state: RootState) => state.auth.user?.$id || "");
  const userEmail = useSelector((state: RootState) => state.auth.user?.email || "");
  const [input, setInput] = useState("");
  const [comments, setComments] = useState<BoardComment[]>([]);
  const [commentText, setCommentText] = useState("");
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
    ).catch(() => ({ assistantText: "Unable to reach AI service.", chart: undefined }));

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

  const handleAddComment = async () => {
    const body = commentText.trim();
    if (!body || !boardId || !userId) return;

    const mentions = extractMentions(body);
    const created = await createBoardComment({
      boardId,
      authorId: userId,
      body,
      mentions,
      parentCommentId: null,
      nodeId: null,
      resolvedAt: null,
    });
    setComments((prev) => [...prev, created]);
    setCommentText("");

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
                        className={`px-3 py-2 rounded ${
                          msg.role === "user"
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

      {commentsOpen && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 max-h-48 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="text-xs font-semibold mb-2 text-gray-600 dark:text-gray-300">Board Comments</div>
          <div className="space-y-2">
            {comments.map((comment) => (
              <div key={comment.id} className="rounded border dark:border-gray-700 p-2 bg-white dark:bg-gray-800">
                <div className="text-xs text-gray-500 dark:text-gray-400">{comment.authorId}</div>
                <div className="text-sm text-gray-900 dark:text-white">{comment.body}</div>
                <button
                  type="button"
                  className="text-xs text-blue-600 mt-1"
                  onClick={() => handleResolveComment(comment.id, !Boolean(comment.resolvedAt))}
                >
                  {comment.resolvedAt ? "Reopen" : "Resolve"}
                </button>
              </div>
            ))}
            {comments.length === 0 && <div className="text-xs text-gray-500">No comments yet.</div>}
          </div>
          <div className="mt-2 flex gap-2">
            <input
              className="flex-1 border dark:border-gray-700 rounded px-2 py-1 text-sm bg-white dark:bg-gray-800"
              placeholder="Add comment. Use @email for mentions"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
            />
            <button type="button" onClick={handleAddComment} className="text-xs px-2 py-1 bg-blue-600 text-white rounded">
              Add
            </button>
          </div>
        </div>
      )}

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
