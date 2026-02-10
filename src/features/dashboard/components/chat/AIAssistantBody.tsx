import { useState, useEffect, useRef } from "react";
import { Send, Mic } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useParams } from "react-router-dom";
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../../../store';
import { setActiveChat, addMessage, fetchChatHistory, updateMessage } from '../../../../store/chatSlice';
import { createChatMessage } from "../../../../data/chatStorage";

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
  chartType?: 'pie' | 'bar' | 'line';
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
   LOADING DOTS COMPONENT
====================================================== */
const LoadingDots = () => {
  return (
    <div className="flex gap-1 items-center py-2">
      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
      <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
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
    e.dataTransfer.setData("text/plain", "chart");
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
          className="absolute bg-black dark:bg-gray-900 text-white text-xs px-3 py-1 rounded z-50 pointer-events-none"
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
   BAR CHART COMPONENT
====================================================== */
const BarChart = ({ data }: { data: Slice[] }) => {
  const maxValue = Math.max(...data.map(slice => slice.value), 1);
  const colors = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444"];

  /* -------- DRAG START -------- */
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
    <div
      draggable
      onDragStart={handleDragStart}
      className="relative w-fit cursor-move select-none"
      title="Drag chart to canvas"
    >
      <svg width={180} height={180} viewBox="0 0 32 32">
        <g transform="translate(4, 4)">
          {data.map((slice, idx) => {
            const barWidth = (24 / data.length) * 0.7;
            const barHeight = (slice.value / maxValue) * 24;
            const x = (idx * (24 / data.length)) + ((24 / data.length - barWidth) / 2);
            const y = 28 - barHeight;
            
            return (
              <g key={idx}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  fill={colors[idx % colors.length]}
                  rx="1"
                />
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

/* ======================================================
   LINE CHART COMPONENT
====================================================== */
const LineChart = ({ data }: { data: Slice[] }) => {
  const maxValue = Math.max(...data.map(slice => slice.value), 1);
  const colors = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444"];

  /* Calculate coordinates for the line */
  const points = data.map((slice, idx) => {
    const x = 4 + (idx * (24 / (data.length - 1 || 1)));
    const y = 28 - ((slice.value / maxValue) * 24);
    return { x, y, label: slice.label, value: slice.value };
  });

  const linePath = points.length > 1 
    ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}` 
    : '';

  /* -------- DRAG START -------- */
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
    <div
      draggable
      onDragStart={handleDragStart}
      className="relative w-fit cursor-move select-none"
      title="Drag chart to canvas"
    >
      <svg width={180} height={180} viewBox="0 0 32 32">
        {/* Grid lines */}
        <defs>
          <pattern id="smallGrid" width="4" height="4" patternUnits="userSpaceOnUse">
            <path d="M 4 0 L 0 0 0 4" fill="none" stroke="#E5E7EB" strokeWidth="0.2"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#smallGrid)" />

        {/* Data line */}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={colors[0]}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Data points */}
        {points.map((point, idx) => (
          <g key={idx}>
            <circle
              cx={point.x}
              cy={point.y}
              r="2"
              fill={colors[idx % colors.length]}
              stroke="white"
              strokeWidth="0.5"
            />
            <title>
              {point.label}: {point.value}
            </title>
          </g>
        ))}
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
        className="w-24 h-24 rounded-full bg-blue-50 dark:bg-gray-700 p-3"
      />
    
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

/* ======================================================
   MAIN COMPONENT
====================================================== */
export default function AIAssistantBody() {
  const { boardId } = useParams<{ boardId: string }>();

  const dispatch = useDispatch<AppDispatch>();
  const { messages, activeChatId } = useSelector((state: RootState) => state.chat);
  const userId = useSelector((state: RootState) => state.auth.user?.$id || "");
  const [input, setInput] = useState("");

  const scrollRef = useRef<HTMLDivElement>(null);

  /* -------- SET ACTIVE CHAT AND LOAD HISTORY ON MOUNT -------- */
  useEffect(() => {
    if (boardId) {
      dispatch(setActiveChat(boardId));
      dispatch(fetchChatHistory(boardId));
    }
  }, [boardId, dispatch]);

  /* -------- AUTO SCROLL -------- */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    el.scrollTop = el.scrollHeight;
  }, [messages]);

  /* -------- SEND MESSAGE -------- */
  const handleSend = async () => {
    if (!input.trim() || !activeChatId) return;

    const messageText = input;
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

    // Create and add loading assistant message
    const assistantMsgId = uuidv4();
    const loadingMsg: Message = {
      id: assistantMsgId,
      text: "",
      role: "assistant",
      isLoading: true,
    };
    
    dispatch(addMessage(loadingMsg));

    // Simulate loading delay and then update the loading message
    setTimeout(async () => {
      // Randomly select a chart type
      const chartTypes: ('pie' | 'bar' | 'line')[] = ['pie', 'bar', 'line'];
      const randomChartType = chartTypes[Math.floor(Math.random() * chartTypes.length)];
      
      // Update the existing loading message with the complete content
      dispatch(updateMessage({
        id: assistantMsgId,
        updates: {
          text: "Here is the analysis of your request:",
          isLoading: false,
          graphData: dummyGraphData,
          chartType: randomChartType
        }
      }));

      if (userId) {
        try {
          await createChatMessage(
            activeChatId,
            {
              text: "Here is the analysis of your request:",
              role: "assistant",
              graphData: dummyGraphData,
              chartType: randomChartType
            } as Message,
            userId
          );
        } catch (error) {
          console.error("Failed to persist assistant message:", error);
        }
      }
    }, 2000); // 2 seconds loading time
  };

  /* ======================================================
     UI
  ====================================================== */
  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-white dark:bg-gray-800">
      {/* CHAT AREA */}
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto px-4 py-4 min-h-0 bg-white dark:bg-gray-800"
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
                          {msg.chartType === 'bar' ? (
                            <BarChart data={msg.graphData} />
                          ) : msg.chartType === 'line' ? (
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

      {/* INPUT - Fixed at bottom */}
      <div className="border-t px-4 py-3 bg-white dark:bg-gray-800 dark:border-t-gray-700 shrink-0">
        <div className="flex items-center gap-2 border dark:border-gray-700 rounded px-3 py-2 bg-white dark:bg-gray-700">
          <input
            className="flex-1 outline-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Ask the AI Assistant..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />

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

