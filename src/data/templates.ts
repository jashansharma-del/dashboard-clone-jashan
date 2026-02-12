import type { ChartData } from "./boardStorage";

export type BoardTemplate = {
  id: string;
  name: string;
  description: string;
  chartType: "pie-chart" | "bar-chart" | "line-chart";
  data: ChartData[];
};

export const BUILTIN_TEMPLATES: BoardTemplate[] = [
  {
    id: "sales-performance",
    name: "Sales Performance",
    description: "Monthly regional sales split",
    chartType: "bar-chart",
    data: [
      { label: "North", value: 180 },
      { label: "South", value: 120 },
      { label: "East", value: 155 },
      { label: "West", value: 200 },
    ],
  },
  {
    id: "funnel",
    name: "Conversion Funnel",
    description: "Lead to customer conversion overview",
    chartType: "line-chart",
    data: [
      { label: "Leads", value: 1000 },
      { label: "Qualified", value: 420 },
      { label: "Proposal", value: 190 },
      { label: "Closed", value: 95 },
    ],
  },
  {
    id: "incident-timeline",
    name: "Incident Timeline",
    description: "Incidents by severity over time",
    chartType: "line-chart",
    data: [
      { label: "Mon", value: 4 },
      { label: "Tue", value: 2 },
      { label: "Wed", value: 6 },
      { label: "Thu", value: 3 },
      { label: "Fri", value: 1 },
    ],
  },
  {
    id: "kpi-dashboard",
    name: "KPI Dashboard",
    description: "Balanced KPI distribution",
    chartType: "pie-chart",
    data: [
      { label: "Revenue", value: 40 },
      { label: "Growth", value: 25 },
      { label: "Retention", value: 20 },
      { label: "NPS", value: 15 },
    ],
  },
];
