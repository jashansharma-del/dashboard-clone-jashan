import { useState } from "react";

export type Slice = { label: string; value: number; forecast?: boolean };

export const PieChart = ({ data }: { data: Slice[] }) => {
    const total = data.reduce((sum, slice) => sum + slice.value, 0);
    const [hovered, setHovered] = useState<number | null>(null);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const colors = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444"];

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        const dragData = {
            type: "pie-chart",
            data,
        };
        e.dataTransfer.setData("application/reactflow", JSON.stringify(dragData));
        e.dataTransfer.setData("text/plain", "chart");
        e.dataTransfer.effectAllowed = "move";
    };

    return (
        <div draggable onDragStart={handleDragStart} className="relative w-fit cursor-move select-none" title="Drag chart to canvas">
            {hovered !== null && (
                <div
                    className="absolute bg-black dark:bg-gray-900 text-white text-xs px-3 py-1 rounded z-50 pointer-events-none"
                    style={{ left: pos.x, top: pos.y, transform: "translate(-50%, -120%)" }}
                >
                    <div className="font-semibold">{data[hovered].label}</div>
                    <div>
                        {data[hovered].value} ({Math.round((data[hovered].value / total) * 100)}%)
                    </div>
                </div>
            )}

            <svg width={180} height={180} viewBox="0 0 32 32">
                {data.map((slice, idx) => {
                    let accumulated = data.slice(0, idx).reduce((sum, s) => sum + s.value, 0);
                    const start = (accumulated / total) * 2 * Math.PI;
                    accumulated += slice.value;
                    const end = (accumulated / total) * 2 * Math.PI;

                    const x1 = 16 + 16 * Math.cos(start);
                    const y1 = 16 + 16 * Math.sin(start);
                    const x2 = 16 + 16 * Math.cos(end);
                    const y2 = 16 + 16 * Math.sin(end);

                    const largeArcFlag = slice.value / total > 0.5 ? 1 : 0;

                    return (
                        <path
                            key={idx}
                            d={`M16 16 L ${x1} ${y1} A 16 16 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                            fill={colors[idx % colors.length]}
                            onMouseEnter={() => setHovered(idx)}
                            onMouseLeave={() => setHovered(null)}
                            onMouseMove={(e) => {
                                const parentRect = (e.currentTarget.parentElement as HTMLDivElement).getBoundingClientRect();
                                setPos({ x: e.clientX - parentRect.x, y: e.clientY - parentRect.y });
                            }}
                        >
                            <title>
                                {slice.label}: {slice.value}
                            </title>
                        </path>
                    );
                })}
            </svg>
        </div>
    );
};

export const BarChart = ({ data }: { data: Slice[] }) => {
    const maxValue = Math.max(...data.map((slice) => slice.value), 1);
    const colors = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444"];

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        const dragData = {
            type: "bar-chart",
            data,
        };
        e.dataTransfer.setData("application/reactflow", JSON.stringify(dragData));
        e.dataTransfer.setData("text/plain", "chart");
        e.dataTransfer.effectAllowed = "move";
    };

    return (
        <div draggable onDragStart={handleDragStart} className="relative w-fit cursor-move select-none" title="Drag chart to canvas">
            <svg width={180} height={180} viewBox="0 0 32 32">
                <g transform="translate(4, 4)">
                    {data.map((slice, idx) => {
                        const barWidth = (24 / data.length) * 0.7;
                        const barHeight = (slice.value / maxValue) * 24;
                        const x = idx * (24 / data.length) + (24 / data.length - barWidth) / 2;
                        const y = 28 - barHeight;

                        return (
                            <g key={idx}>
                                <rect x={x} y={y} width={barWidth} height={barHeight} fill={colors[idx % colors.length]} rx="1" />
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
};

export const LineChart = ({ data }: { data: Slice[] }) => {
    const maxValue = Math.max(...data.map((slice) => slice.value), 1);
    const colors = ["#3B82F6", "#F59E0B", "#10B981", "#EF4444"];

    const points = data.map((slice, idx) => {
        const x = 4 + idx * (24 / (data.length - 1 || 1));
        const y = 28 - (slice.value / maxValue) * 24;
        return { x, y, label: slice.label, value: slice.value, forecast: slice.forecast };
    });

    const linePoints = points.filter(p => !p.forecast);
    const forecastPoints = points.filter(p => p.forecast);

    const linePath = linePoints.length > 1 ? `M ${linePoints.map((p) => `${p.x},${p.y}`).join(" L ")}` : "";

    let forecastPath = "";
    if (forecastPoints.length > 0) {
        const lastMain = linePoints[linePoints.length - 1];
        const allForecast = lastMain ? [lastMain, ...forecastPoints] : forecastPoints;
        forecastPath = allForecast.length > 1 ? `M ${allForecast.map((p) => `${p.x},${p.y}`).join(" L ")}` : "";
    }

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
        const dragData = {
            type: "line-chart",
            data,
        };
        e.dataTransfer.setData("application/reactflow", JSON.stringify(dragData));
        e.dataTransfer.setData("text/plain", "chart");
        e.dataTransfer.effectAllowed = "move";
    };

    return (
        <div draggable onDragStart={handleDragStart} className="relative w-fit cursor-move select-none" title="Drag chart to canvas">
            <svg width={180} height={180} viewBox="0 0 32 32">
                {linePath && (
                    <path d={linePath} fill="none" stroke={colors[0]} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                )}
                {forecastPath && (
                    <path d={forecastPath} fill="none" stroke={colors[0]} strokeWidth="1.5" strokeDasharray="2,1" strokeLinecap="round" strokeLinejoin="round" />
                )}
                {points.map((point, idx) => (
                    <g key={idx}>
                        <circle cx={point.x} cy={point.y} r="2" fill={point.forecast ? "white" : colors[idx % colors.length]} stroke={colors[0]} strokeWidth="0.5" />
                        <title>
                            {point.label}: {point.value} {point.forecast ? "(Forecast)" : ""}
                        </title>
                    </g>
                ))}
            </svg>
        </div>
    );
};
