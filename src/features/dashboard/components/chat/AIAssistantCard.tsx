import { useState, useEffect } from "react";
import { MoreHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "../../../../shared/utils/lib/utils";
import AIAssistantBody from "./AIAssistantBody";

export default function AIAssistantCard({
  disablePointer = false,
}: {
  disablePointer?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [isZooming, setIsZooming] = useState(false);

  useEffect(() => {
    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleResize = () => {
      setIsZooming(true);
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        setIsZooming(false);
      }, 150);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
  }, []);

  return (
    <div
      className={cn(
        "fixed bg-white dark:bg-gray-800 shadow-lg border dark:border-gray-700 flex flex-col overflow-hidden origin-bottom rounded-xl",
        "left-4 bottom-4 sm:left-6 sm:bottom-6",
        "w-[90vw] sm:w-[480px] max-w-[480px]",
        disablePointer && "pointer-events-none opacity-60",
        isZooming
          ? "transition-all duration-150 ease-out"
          : "transition-all duration-500 ease-in-out",
        collapsed ? "h-[52px]" : "h-[calc(100%-200px)]"
      )}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between h-[52px] px-3 bg-gray-50 dark:bg-gray-700">
        <div className="flex items-center gap-2">
          <MoreHorizontal className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <span className="font-medium text-gray-900 dark:text-gray-100">AI Assistant</span>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 transition"
        >
          {collapsed ? <ChevronUp /> : <ChevronDown />}
        </button>
      </div>

      {!collapsed && <AIAssistantBody />}
    </div>
  );
}
