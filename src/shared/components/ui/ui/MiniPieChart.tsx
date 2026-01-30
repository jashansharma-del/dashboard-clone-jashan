import type { PieSlice } from "../../../../features/dashboard/types/chartTypes";

type MiniChartProps = {
  data: PieSlice[];
  size?: number;
  type?: 'pie' | 'bar' | 'line';
};

export default function MiniChart({ data, size = 60, type = 'pie' }: MiniChartProps) {
  const colors = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899"];
  
  if (data.length === 0) {
    return (
      <div 
        className="rounded-full border-2 border-dashed border-gray-300 dark:border-gray-500 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-gray-400 dark:text-gray-400">No data</span>
      </div>
    );
  }

  switch (type) {
    case 'bar':
      return <MiniBarChart data={data} size={size} colors={colors} />;
    case 'line':
      return <MiniLineChart data={data} size={size} colors={colors} />;
    case 'pie':
    default:
      return <MiniPieChart data={data} size={size} colors={colors} />;
  }
}

function MiniPieChart({ data, size, colors }: { data: PieSlice[]; size: number; colors: string[] }) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  
  if (total === 0) {
    return (
      <div 
        className="rounded-full border-2 border-dashed border-gray-300 dark:border-gray-500 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span className="text-xs text-gray-400 dark:text-gray-400">No data</span>
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        className="rounded-full shadow-sm dark:shadow-gray-700"
      >
        {data.map((slice, idx) => {
          let acc = data.slice(0, idx).reduce((sum, s) => sum + s.value, 0);
          const start = (acc / total) * 2 * Math.PI;
          acc += slice.value;
          const end = (acc / total) * 2 * Math.PI;

          const x1 = 16 + 12 * Math.cos(start);
          const y1 = 16 + 12 * Math.sin(start);
          const x2 = 16 + 12 * Math.cos(end);
          const y2 = 16 + 12 * Math.sin(end);

          const largeArcFlag = slice.value / total > 0.5 ? 1 : 0;

          return (
            <path
              key={idx}
              d={`
                M16 16
                L ${x1} ${y1}
                A 12 12 0 ${largeArcFlag} 1 ${x2} ${y2}
                Z
              `}
              fill={colors[idx % colors.length]}
            >
              <title>
                {slice.label}: {slice.value} ({Math.round((slice.value / total) * 100)}%)
              </title>
            </path>
          );
        })}
        {/* Center circle for donut effect */}
        <circle cx="16" cy="16" r="6" fill="white" className="dark:fill-gray-800" />
      </svg>
    </div>
  );
}

function MiniBarChart({ data, size, colors }: { data: PieSlice[]; size: number; colors: string[] }) {
  const maxValue = Math.max(...data.map(slice => slice.value), 1);
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        className="rounded shadow-sm dark:shadow-gray-700"
      >
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
}

function MiniLineChart({ data, size, colors }: { data: PieSlice[]; size: number; colors: string[] }) {
  const maxValue = Math.max(...data.map(slice => slice.value), 1);
  
  const points = data.map((slice, idx) => {
    const x = 4 + (idx * (24 / (data.length - 1 || 1)));
    const y = 28 - ((slice.value / maxValue) * 24);
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        className="rounded shadow-sm dark:shadow-gray-700"
      >
        <polyline
          fill="none"
          stroke={colors[0]}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />
        {data.map((slice, idx) => {
          const x = 4 + (idx * (24 / (data.length - 1 || 1)));
          const y = 28 - ((slice.value / maxValue) * 24);
          
          return (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r="1.5"
              fill={colors[idx % colors.length]}
            />
          );
        })}
      </svg>
    </div>
  );
}