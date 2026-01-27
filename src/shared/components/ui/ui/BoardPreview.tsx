import { BarChart3, Table } from "lucide-react";

type BoardPreviewProps = {
  widgets: { type: string; label: string }[];
  hasMessages?: boolean;
};

export default function BoardPreview({ widgets, hasMessages = false }: BoardPreviewProps) {
  return (
    <div className="w-[360px] h-[176px] flex items-center justify-center">
      {widgets.length > 0 ? (
        <div className="grid grid-cols-2 gap-2 w-full p-2">
          {widgets.map((widget, index) => (
            <div
              key={index}
              className="flex items-center gap-2 text-xs"
            >
              {widget.type === "chart" ? (
                <BarChart3 className="w-4 h-4" />
              ) : (
                <Table className="w-4 h-4" />
              )}
              {widget.label}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="text-gray-400 text-sm mb-2">No widgets added</div>
          {hasMessages && (
            <div className="flex items-center text-xs text-blue-500">
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
