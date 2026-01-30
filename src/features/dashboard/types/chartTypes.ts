export type PieSlice = { label: string; value: number };

export type PieNodeData = {
  graphData: PieSlice[];
  width: number;
  height: number;
};

export type BarNodeData = {
  graphData: PieSlice[];
  width: number;
  height: number;
};

export type LineNodeData = {
  graphData: PieSlice[];
  width: number;
  height: number;
};