import { BarChart3, Table } from "lucide-react";
import MiniChart from './MiniPieChart';

type BoardPreviewProps = {
  widgets: { type: string; label: string; data?: any; chartType?: 'pie' | 'bar' | 'line' }[];
  hasMessages?: boolean;
};

export default function BoardPreview({ widgets, hasMessages = false }: BoardPreviewProps) {
  return (
    <div className="w-[360px] h-[176px] flex items-center justify-center bg-white dark:bg-gray-800">
      {widgets.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 w-full p-3">
          {widgets.map((widget, index) => (
            <div
              key={index}
              className="flex flex-col gap-1 bg-gray-50 dark:bg-gray-700 rounded p-2 border border-gray-200 dark:border-gray-600"
            >
              <div className="flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-200">
                {widget.type === "chart" ? (
                  <BarChart3 className="w-3 h-3" />
                ) : (
                  <Table className="w-3 h-3" />
                )}
                <span className="truncate text-gray-700 dark:text-gray-200">{widget.label}</span>
              </div>
              
              {/* Render mini chart if it's a chart widget and has data */}
              {widget.type === "chart" && widget.data && widget.data.length > 0 && (
                <div className="flex items-center justify-center mt-1">
                  <MiniChart 
                    data={widget.data} 
                    type={widget.chartType || "pie"} 
                  />
                </div>
              )}
              
              {/* Render mini table if it's a table widget */}
              {widget.type === "table" && (
                <div className="space-y-0.5 mt-1">
                  <div className="h-1.5 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                  <div className="h-1.5 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                  <div className="h-1.5 bg-gray-300 dark:bg-gray-600 rounded w-5/6"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="text-gray-400 dark:text-gray-300 text-sm mb-2">No widgets added</div>
          {hasMessages && (
            <div className="flex items-center text-xs text-blue-500 dark:text-blue-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Chat Active
            </div>
          )}
        </div>
      )}
    </div>
  );
}
