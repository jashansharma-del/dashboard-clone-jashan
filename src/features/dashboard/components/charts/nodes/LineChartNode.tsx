import { NodeResizer } from "reactflow";
import type { NodeProps } from "reactflow";
import type { LineNodeData } from "../../../types/chartTypes";
import NodeChat from "./NodeChat";

const LineChartNode = ({ id, data, selected }: NodeProps<LineNodeData>) => {
  const maxValue = Math.max(...data.graphData.map(slice => slice.value), 1);
  const colors = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899"];

  const calculatePoints = () => {
    const padding = 20;
    const width = data.width - padding * 2;
    const height = data.height - padding * 2;

    return data.graphData.map((slice, idx) => {
      const x = padding + (width / (data.graphData.length - 1 || 1)) * idx;
      const y = padding + height - ((slice.value / maxValue) * height);
      return { x, y, label: slice.label, value: slice.value, forecast: (slice as any).forecast };
    });
  };

  const points = calculatePoints();
  const linePoints = points.filter(p => !p.forecast);
  const forecastPoints = points.filter(p => p.forecast);

  const linePath = linePoints.length > 1
    ? `M ${linePoints.map(p => `${p.x},${p.y}`).join(' L ')}`
    : '';

  let forecastPath = "";
  if (forecastPoints.length > 0) {
    const lastMain = linePoints[linePoints.length - 1];
    const allForecast = lastMain ? [lastMain, ...forecastPoints] : forecastPoints;
    forecastPath = allForecast.length > 1 ? `M ${allForecast.map(p => `${p.x},${p.y}`).join(' L ')}` : "";
  }

  return (
    <>
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
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border-2 transition-colors relative"
        style={{
          width: '100%',
          height: '100%',
          borderColor: selected ? "#3B82F6" : "#D1D5DB",
        }}
      >
        <NodeChat nodeId={id} />
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${data.width} ${data.height}`}
          preserveAspectRatio="xMidYMid meet"
          className="pointer-events-none"
        >
          <defs>
            <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#E5E7EB" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#smallGrid)" />

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

          {forecastPath && (
            <path
              d={forecastPath}
              fill="none"
              stroke={colors[0]}
              strokeWidth="3"
              strokeDasharray="8,6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {points.map((point, idx) => (
            <g key={idx}>
              <circle
                cx={point.x}
                cy={point.y}
                r="5"
                fill={point.forecast ? "white" : colors[idx % colors.length]}
                stroke={colors[0]}
                strokeWidth="2"
              />
              <title>
                {point.label}: {point.value} {point.forecast ? "(Forecast)" : ""}
              </title>
            </g>
          ))}

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