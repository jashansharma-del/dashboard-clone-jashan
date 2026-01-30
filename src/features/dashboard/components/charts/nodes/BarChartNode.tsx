import { NodeResizer } from "reactflow";
import type { NodeProps } from "reactflow";
import type { BarNodeData } from "../../../types/chartTypes";

const BarChartNode = ({ data, selected }: NodeProps<BarNodeData>) => {
  console.log("📊 BarChartNode rendering with data:", data);

  // Calculate max value for scaling
  const maxValue = Math.max(...data.graphData.map(slice => slice.value), 1);
  const colors = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6", "#EC4899"];

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
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border-2 transition-colors flex flex-col"
        style={{
          width: '100%',
          height: '100%',
          borderColor: selected ? "#3B82F6" : "#D1D5DB",
        }}
      >
        <div className="flex-1 flex items-end justify-center gap-2">
          {data.graphData.map((slice, idx) => {
            const heightPercentage = (slice.value / maxValue) * 100;
            return (
              <div
                key={idx}
                className="flex flex-col items-center"
                style={{ height: '100%' }}
              >
                <div
                  className="w-8 rounded-t hover:opacity-90 transition-opacity"
                  style={{
                    height: `${heightPercentage}%`,
                    backgroundColor: colors[idx % colors.length],
                    minHeight: '5%'
                  }}
                  title={`${slice.label}: ${slice.value}`}
                >
                  <div className="text-xs text-white font-medium text-center pt-1 truncate w-full">
                    {slice.value}
                  </div>
                </div>
                <div className="text-xs text-gray-700 dark:text-gray-300 mt-1 truncate w-full px-1">
                  {slice.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default BarChartNode;