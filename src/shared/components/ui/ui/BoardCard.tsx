import { useEffect, useState, useRef } from "react";
import * as htmlToImage from "html-to-image";
import BoardPreview from "./BoardPreview";
import type { Message } from "../../../../data/boardStorage";
import { Download, MoreVertical, Pin, PinOff, Share2, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

type WidgetData = {
  label: string;
  value: number;
}[];
type BoardCardProps = {
  title: string;
  widgets: { type: string; label: string; data?: WidgetData }[];
  messages?: Message[];
  onClick?: () => void;
  showMenu?: boolean;
  isPinned?: boolean;
  canMutate?: boolean;
  onShare?: () => void;
  onPinToggle?: () => void;
  onDelete?: () => void;
  onImport?: () => void;
  isImporting?: boolean;
  badgeLabel?: string;
};

export default function BoardCard({
  title,
  widgets,
  messages = [],
  onClick,
  showMenu = false,
  isPinned = false,
  canMutate = true,
  onShare,
  onPinToggle,
  onDelete,
  onImport,
  isImporting = false,
  badgeLabel,
}: BoardCardProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Check for dark mode changes
  useEffect(() => {
    const checkDarkMode = () => {
      const isCurrentlyDark = document.documentElement.classList.contains('dark');
      if (isCurrentlyDark !== isDarkMode) {
        setIsTransitioning(true);
        setTimeout(() => setIsTransitioning(false), 300); // Match CSS transition duration
      }
      setIsDarkMode(isCurrentlyDark);
    };

    // Initial check
    checkDarkMode();

    // Listen for theme changes
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, [isDarkMode]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (previewRef.current) {
        htmlToImage.toPng(previewRef.current, { 
          cacheBust: true,
          backgroundColor: isDarkMode ? '#1f2937' : '#ffffff'
        }).then((dataUrl) => {
          setImage(dataUrl);
        }).catch((error) => {
          console.error('Error generating image:', error);
        });
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [widgets, messages, isDarkMode]); // Regenerate when theme changes

  return (
    <div 
      className={`w-[300px] sm:w-[350px] bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-all duration-300 relative ${onClick ? 'hover:scale-[1.02]' : ''}`}
      onClick={onClick}
    >
      {showMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/90 text-gray-600 shadow-sm transition-colors hover:bg-gray-100 dark:bg-gray-700/90 dark:text-gray-200 dark:hover:bg-gray-600 z-20"
              aria-label="Board options"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onClick={(e) => e.stopPropagation()}
          >
            {onImport && (
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onImport();
                }}
              >
                <Download className="h-4 w-4" />
                {isImporting ? "Importing..." : "Import"}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onShare?.();
              }}
            >
              <Share2 className="h-4 w-4" />
              Share
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onPinToggle?.();
              }}
            >
              {isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
              {isPinned ? "Unpin" : "Pin"}
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete?.();
              }}
            >
              <Trash2 className="h-4 w-4" />
              {canMutate ? "Delete" : "Delete (Coming soon)"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {badgeLabel && (
        <span className="absolute top-3 left-3 z-20 rounded-md bg-emerald-600/90 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-white">
          {badgeLabel}
        </span>
      )}
      <div className="absolute opacity-0 pointer-events-none">
        <div ref={previewRef}>
          <BoardPreview widgets={widgets} hasMessages={messages && messages.length > 0} />
        </div>
      </div>

      <div className="h-32 sm:h-44 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden relative">
        {image && (
          <img 
            src={image} 
            alt={title} 
            className={`h-full w-full object-cover transition-opacity duration-300 ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            }`}
          />
        )}
        {(isTransitioning || !image) && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-700 transition-colors duration-300">
            <span className="text-gray-400 dark:text-gray-300 text-sm">
              {isTransitioning ? 'Updating preview...' : 'Generating preview…'}
            </span>
          </div>
        )}
      </div>

      <h3 className="mt-4 text-lg font-semibold dark:text-white transition-colors duration-300">{title}</h3>
      
      {messages && messages.length > 0 && (
        <div className="mt-2">
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-1 transition-colors duration-300">Chat: {messages.length} message{messages.length !== 1 ? 's' : ''}</div>
          <div className="text-xs text-gray-600 dark:text-gray-300 truncate max-w-full transition-colors duration-300">
            <span className="font-medium text-blue-600 dark:text-blue-400 transition-colors duration-300">Last: </span>
            {messages[messages.length - 1].text.substring(0, 30)}{messages[messages.length - 1].text.length > 30 ? '...' : ''}
          </div>
        </div>
      )}
    </div>
  );
}
