import { NodeResizer } from "reactflow";
import type { NodeProps } from "reactflow";
import type { LineNodeData } from "../../../types/chartTypes";

const LineChartNode = ({ data, selected }: NodeProps<LineNodeData>) => {
  console.log("📈 LineChartNode rendering with data:", data);

  // Calculate max value for scaling
  const maxValue = Math.max(...data.graphData.map(slice => slice.value), 1);
  const colors = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899"];
  
  // Calculate coordinates for the line
  const calculatePoints = () => {
    const padding = 20;
    const width = data.width - padding * 2;
    const height = data.height - padding * 2;
    
    return data.graphData.map((slice, idx) => {
      const x = padding + (width / (data.graphData.length - 1)) * idx;
      const y = padding + height - ((slice.value / maxValue) * height);
      return { x, y, label: slice.label, value: slice.value };
    });
  };

  const points = calculatePoints();
  const linePath = points.length > 1 
    ? `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}` 
    : '';

  return (
    <>
      {/* NodeResizer with larger handle area */}
      <NodeResizer
        color="#3B82F6"
        isVisible={selected}
        minWidth={100}
        minHeight={100}
        handleStyle={{
          width: '12px',
          height: '12px',
          borderRadius: '2px',
        }}
        lineStyle={{
          borderWidth: '2px',
        }}
      />
      
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border-2 transition-colors"
        style={{
          width: '100%',
          height: '100%',
          borderColor: selected ? "#3B82F6" : "#D1D5DB",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${data.width} ${data.height}`}
          preserveAspectRatio="xMidYMid meet"
          className="pointer-events-none"
        >
          {/* Grid lines */}
          <defs>
            <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E5E7EB" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#smallGrid)" />

          {/* Data line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={colors[0]}
              strokeWidth="3"
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
                r="5"
                fill={colors[idx % colors.length]}
                stroke="white"
                strokeWidth="2"
              />
              <title>
                {point.label}: {point.value}
              </title>
            </g>
          ))}

          {/* Labels */}
          {points.map((point, idx) => (
            <text
              key={`label-${idx}`}
              x={point.x}
              y={data.height - 5}
              fontSize="10"
              textAnchor="middle"
              fill="#6B7280"
            >
              {point.label}
            </text>
          ))}
        </svg>
      </div>
    </>
  );
};

export default LineChartNode;