// components/SectionHeader.tsx
import { Button } from "./button";

type SectionHeaderProps = {
  title: string;
  primaryAction?: {
    label: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick?: () => void;
  };
};

export default function SectionHeader({
  title,
  primaryAction,
  secondaryAction,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      
      {/* Left Title */}
      <h2 className="text-2xl font-semibold text-gray-900">
        {title}
      </h2>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {secondaryAction && (
          <Button variant="outline" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}

        {primaryAction && (
          <Button onClick={primaryAction.onClick}>
            {primaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}
