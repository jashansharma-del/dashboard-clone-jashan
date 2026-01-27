import { useEffect, useState, useRef } from "react";
import * as htmlToImage from "html-to-image";
import BoardPreview from "./BoardPreview";
import type { Message } from "../../data/boardStorage";

type BoardCardProps = {
  title: string;
  widgets: { type: string; label: string }[];
  messages?: Message[];
  onClick?: () => void;
};

export default function BoardCard({ title, widgets, messages = [], onClick }: BoardCardProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<string | null>(null);

  useEffect(() => {
    // Add a small delay to ensure content is rendered
    const timer = setTimeout(() => {
      if (previewRef.current) {
        htmlToImage.toPng(previewRef.current, { cacheBust: true }).then((dataUrl) => {
          setImage(dataUrl); // Store image as a base64 URL
        }).catch((error) => {
          console.error('Error generating image:', error);
        });
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [widgets, messages]); // Regenerate the image if widgets or messages change

  return (
    <div 
      className={`w-[420px] bg-white border rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${onClick ? 'hover:scale-[1.02] transition-transform' : ''}`}
      onClick={onClick}
    >
      <div className="absolute opacity-0 pointer-events-none">
        <div ref={previewRef}>
          <BoardPreview widgets={widgets} hasMessages={messages && messages.length > 0} />
        </div>
      </div>

      <div className="h-44 bg-gray-50 rounded-lg flex items-center justify-center">
        {image ? (
          <img src={image} alt={title} className="h-full object-contain" />
        ) : (
          <span className="text-gray-400 text-sm">Generating preview…</span>
        )}
      </div>

      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      
      {/* Display chat message count and preview */}
      {messages && messages.length > 0 && (
        <div className="mt-2">
          <div className="text-sm text-gray-500 mb-1">Chat: {messages.length} message{messages.length !== 1 ? 's' : ''}</div>
          <div className="text-xs text-gray-600 truncate max-w-full">
            <span className="font-medium text-blue-600">Last: </span>
            {messages[messages.length - 1].text.substring(0, 30)}{messages[messages.length - 1].text.length > 30 ? '...' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
