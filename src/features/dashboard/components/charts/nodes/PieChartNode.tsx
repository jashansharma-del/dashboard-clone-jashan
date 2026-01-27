import { NodeResizer } from "reactflow";
import type { NodeProps } from "reactflow";
import type { PieNodeData } from "../../../types/chartTypes";

const PieChartNode = ({ data, selected }: NodeProps<PieNodeData>) => {
  console.log("🎨 PieChartNode rendering with data:", data);
  
  const total = data.graphData.reduce((sum, slice) => sum + slice.value, 0);
  const colors = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444"];

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
        className="bg-white rounded-lg shadow-lg p-4 border-2 transition-colors"
        style={{
          width: '100%',
          height: '100%',
          borderColor: selected ? "#3B82F6" : "#D1D5DB",
        }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 32 32"
          preserveAspectRatio="xMidYMid meet"
          className="pointer-events-none"
        >
          {data.graphData.map((slice, idx) => {
            let acc = data.graphData.slice(0, idx).reduce((sum, s) => sum + s.value, 0);
            const start = (acc / total) * 2 * Math.PI;
            acc += slice.value;
            const end = (acc / total) * 2 * Math.PI;

            const x1 = 16 + 16 * Math.cos(start);
            const y1 = 16 + 16 * Math.sin(start);
            const x2 = 16 + 16 * Math.cos(end);
            const y2 = 16 + 16 * Math.sin(end);

            const largeArcFlag = slice.value / total > 0.5 ? 1 : 0;

            return (
              <path
                key={idx}
                d={`
                  M16 16
                  L ${x1} ${y1}
                  A 16 16 0 ${largeArcFlag} 1 ${x2} ${y2}
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
        </svg>
      </div>
    </>
  );
};

export default PieChartNode;