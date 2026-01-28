import { useState, useRef } from "react";
import { MoreHorizontal, ChevronDown, ChevronUp, Maximize2, Minimize2 } from "lucide-react";
import { cn } from "../../../../shared/utils/lib/utils";
import AIAssistantBody from "./AIAssistantBody";

export default function AIAssistantCard({
  disablePointer = false,
}: {
  disablePointer?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [width, setWidth] = useState(400); // default width
  const resizingRef = useRef<{ startX: number; startWidth: number } | null>(null);

  /* ---------------- RIGHT HORIZONTAL RESIZE ---------------- */
  const startResize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    resizingRef.current = { startX: e.clientX, startWidth: width };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopResize);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingRef.current) return;
    const deltaX = e.clientX - resizingRef.current.startX;

    // Dynamically calculate max width to reach right edge
    const maxWidth = window.innerWidth - 24; // 24px margin (left + some buffer)
    const newWidth = resizingRef.current.startWidth + deltaX;

    setWidth(Math.min(Math.max(newWidth, 320), maxWidth));
  };

  const stopResize = () => {
    resizingRef.current = null;
    window.removeEventListener("mousemove", handleMouseMove);
    window.removeEventListener("mouseup", stopResize);
  };

  return (
    <div
      className={cn(
        "bg-white shadow-lg border flex flex-col overflow-hidden rounded-xl transition-all duration-300",
        disablePointer && "pointer-events-none opacity-60",

        // Normal mode (not fullscreen)
        !isFullscreen &&
          "fixed left-4 sm:left-6 bottom-4",

        // Fullscreen mode
        isFullscreen &&
          "fixed top-16 left-0 right-0 bottom-0 w-full h-[calc(100vh-64px)] z-[9999]"
      )}
      style={{
        width: isFullscreen ? "100%" : width,
        height: collapsed
          ? 52
          : isFullscreen
          ? undefined
          : "calc(100vh - 150px)",
      }}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between h-[52px] px-3 border-b">
        <div className="flex items-center gap-2">
          <MoreHorizontal className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-gray-100">AI Assistant</span>
        </div>

        <div className="flex items-center gap-2">
          {!collapsed && (
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1 rounded hover:bg-gray-100"
            >
              {isFullscreen ? <Minimize2 /> : <Maximize2 />}
            </button>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded hover:bg-gray-100"
          >
            {collapsed ? <ChevronUp /> : <ChevronDown />}
          </button>
        </div>
      </div>

      {!collapsed && <AIAssistantBody />}

      {/* Right Resize Handle */}
      {!collapsed && !isFullscreen && (
        <div
          onMouseDown={startResize}
          className="absolute top-0 right-0 h-full w-2 cursor-ew-resize bg-transparent"
          title="Resize horizontally"
        />
      )}
    </div>
  );
}
