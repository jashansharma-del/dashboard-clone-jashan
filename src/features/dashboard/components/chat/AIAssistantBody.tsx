import { useState, useEffect, useRef } from "react";
import { Send, Mic } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useParams } from "react-router-dom";

/* ======================================================
   TYPES
====================================================== */
type Slice = { label: string; value: number };

type GraphData = Slice[];

type Message = {
  id: string;
  text: string;
  role: "user" | "assistant";
  graphData?: GraphData;
  isLoading?: boolean;
};

/* ======================================================
   DUMMY DATA
====================================================== */
const dummyGraphData: Slice[] = [
  { label: "Option A", value: 30 },
  { label: "Option B", value: 50 },
  { label: "Option C", value: 20 },
];

/* ======================================================
   SAFE LOAD FROM LOCAL STORAGE
====================================================== */
const loadMessages = (boardId?: string): Message[] => {
  try {
    if (!boardId) {
      const storedId = localStorage.getItem("currentBoardId");
      if (!storedId) return [];
      boardId = storedId;
    }
    const stored = localStorage.getItem(`chat-${boardId}`);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

/* ======================================================
   LOADING DOTS COMPONENT
====================================================== */
const LoadingDots = () => {
  return (
    <div className="flex gap-1 items-center py-2">
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
    </div>
  );
};

/* ======================================================
   PIE CHART COMPONENT
====================================================== */
const PieChart = ({ data }: { data: Slice[] }) => {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);

  const [hovered, setHovered] = useState<number | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const colors = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444"];

  /* -------- DRAG START -------- */
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    const dragData = {
      type: "pie-chart",
      data,
    };
    e.dataTransfer.setData("application/reactflow", JSON.stringify(dragData));
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="relative w-fit cursor-move select-none"
      title="Drag chart to canvas"
    >
      {/* TOOLTIP */}
      {hovered !== null && (
        <div
          className="absolute bg-black text-white text-xs px-3 py-1 rounded z-50 pointer-events-none"
          style={{
            left: pos.x,
            top: pos.y,
            transform: "translate(-50%, -120%)",
          }}
        >
          <div className="font-semibold">{data[hovered].label}</div>
          <div>
            {data[hovered].value} (
            {Math.round((data[hovered].value / total) * 100)}%)
          </div>
        </div>
      )}

      {/* SVG */}
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
              d={`
                M16 16
                L ${x1} ${y1}
                A 16 16 0 ${largeArcFlag} 1 ${x2} ${y2}
                Z
              `}
              fill={colors[idx % colors.length]}
              onMouseEnter={() => setHovered(idx)}
              onMouseLeave={() => setHovered(null)}
              onMouseMove={(e) => {
                const parentRect = (e.currentTarget.parentElement as HTMLDivElement).getBoundingClientRect();
                setPos({
                  x: e.clientX - parentRect.x,
                  y: e.clientY - parentRect.y,
                });
              }}
            >
              <title>
                {slice.label}: {slice.value} (
                {Math.round((slice.value / total) * 100)}%)
              </title>
            </path>
          );
        })}
      </svg>
    </div>
  );
};

/* ======================================================
   WELCOME SCREEN COMPONENT
====================================================== */
const WelcomeScreen = ({ onSuggestionClick }: { onSuggestionClick: (text: string) => void }) => {
  const suggestions = [
    "Analyze sales performance",
    "Create a pie chart",
    "Summarize this data",
    "Generate insights",
  ];

  return (
    <div className="flex flex-col items-center justify-center gap-6 text-center h-full">
      <img
        src="/Cisco-AI-Assistant.png"
        className="w-24 h-24 rounded-full bg-blue-50 p-3"
      />

      <h2 className="text-2xl font-semibold">How can I help today?</h2>

      <div className="w-full max-w-md flex flex-col gap-3">
        {suggestions.map((text, i) => (
          <button
            key={i}
            onClick={() => onSuggestionClick(text)}
            className="border rounded-lg px-4 py-3 text-sm text-left hover:bg-gray-100"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ======================================================
   MAIN COMPONENT
====================================================== */
export default function AIAssistantBody() {
  const { boardId } = useParams<{ boardId: string }>();

  const [messages, setMessages] = useState<Message[]>(() => loadMessages(boardId));
  const [input, setInput] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);
  const boardIdRef = useRef<string>("");

  /* -------- INIT BOARD ID -------- */
  useEffect(() => {
    let id = boardId;
    if (!id) {
      const storedId = localStorage.getItem("currentBoardId");
      id = storedId || uuidv4();
      localStorage.setItem("currentBoardId", id);
    }
    boardIdRef.current = id;
  }, [boardId]);

  /* -------- SAVE CHAT -------- */
  useEffect(() => {
    if (!boardIdRef.current) return;
    localStorage.setItem(`chat-${boardIdRef.current}`, JSON.stringify(messages));
  }, [messages]);

  /* -------- AUTO SCROLL -------- */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    el.scrollTop = el.scrollHeight;
  }, [messages]);

  /* -------- SEND MESSAGE -------- */
  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: Message = {
      id: uuidv4(),
      text: input,
      role: "user",
    };

    const assistantMsgId = uuidv4();
    const loadingMsg: Message = {
      id: assistantMsgId,
      text: "",
      role: "assistant",
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");

    // Simulate loading delay and then show the complete message
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? { 
                ...msg, 
                text: "Here is the analysis of your request:",
                isLoading: false, 
                graphData: dummyGraphData 
              }
            : msg
        )
      );
    }, 2000); // 2 seconds loading time
  };

  /* ======================================================
     UI
  ====================================================== */
  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      {/* CHAT AREA */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto px-4 py-4 min-h-0"
      >
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
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div className="max-w-md flex flex-col gap-2">
                  {/* Show loading dots or actual message */}
                  {msg.isLoading ? (
                    <div className="px-3 py-2 rounded bg-gray-200">
                      <LoadingDots />
                    </div>
                  ) : (
                    <>
                      <div
                        className={`px-3 py-2 rounded ${
                          msg.role === "user"
                            ? "bg-blue-600 text-white"
                            : "bg-gray-200"
                        }`}
                      >
                        {msg.text}
                      </div>

                      {msg.graphData && (
                        <div className="bg-white border rounded p-4">
                          <PieChart data={msg.graphData} />
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

      {/* INPUT - Fixed at bottom */}
      <div className="border-t px-4 py-3 bg-white shrink-0">
        <div className="flex items-center gap-2 border rounded px-3 py-2">
          <input
            className="flex-1 outline-none text-sm"
            placeholder="Ask the AI Assistant..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />

          <Mic className="w-5 h-5 text-gray-400" />

          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="bg-blue-600 p-2 rounded disabled:opacity-50"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}