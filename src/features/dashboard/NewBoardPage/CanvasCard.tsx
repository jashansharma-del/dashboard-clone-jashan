import { cn } from "../../../shared/utils/lib/utils";

type CanvasCardProps = {
  children: React.ReactNode;
  className?: string;
};

export default function CanvasCard({
  children,
  className,
}: CanvasCardProps) {
  return (
    <div
      className={cn(
        "flex items-center px-4 py-3 bg-white rounded-lg shadow-sm border",
        "hover:shadow-md transition-shadow",
        className
      )}
    >
      {children}
    </div>
  );
}
