import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { saveCanvas, loadCanvas } from '../data/canvasStorage';

// Define the node type
interface Node {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    graphData?: unknown[];
    width?: number;
    height?: number;
    [key: string]: unknown;
  };
  width?: number;
  height?: number;
}

// Define the edge type
interface Edge {
  id: string;
  source: string;
  target: string;
  type?: string;
}

// Define the canvas state
interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  boardId: string | null;
  selectedElement: string | null;
  isDragging: boolean;
  scale: number;
  offset: { x: number; y: number };
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: CanvasState = {
  nodes: [],
  edges: [],
  boardId: null,
  selectedElement: null,
  isDragging: false,
  scale: 1,
  offset: { x: 0, y: 0 },
  loading: false,
  error: null,
};

// Async thunk for saving canvas data
export const saveCanvasData = createAsyncThunk(
  'canvas/saveCanvasData',
  async ({ boardId, nodes, edges }: { boardId: string; nodes: Node[]; edges: Edge[] }, { rejectWithValue }) => {
    try {
      await saveCanvas(boardId, nodes, edges);
      return { boardId, nodes, edges };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to save canvas data');
    }
  }
);

// Async thunk for loading canvas data
export const loadCanvasData = createAsyncThunk(
  'canvas/loadCanvasData',
  async (boardId: string, { rejectWithValue }) => {
    try {
      const result = await loadCanvas(boardId);
      return result.nodes || [];
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to load canvas data');
    }
  }
);

const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    setBoardId: (state, action: PayloadAction<string>) => {
      state.boardId = action.payload;
    },
    addNode: (state, action: PayloadAction<Node>) => {
      state.nodes.push(action.payload);
    },
    removeNode: (state, action: PayloadAction<string>) => {
      state.nodes = state.nodes.filter(node => node.id !== action.payload);
    },
    updateNode: (state, action: PayloadAction<{ id: string; data: Partial<Node> }>) => {
      const nodeIndex = state.nodes.findIndex(node => node.id === action.payload.id);
      if (nodeIndex !== -1) {
        state.nodes[nodeIndex] = { ...state.nodes[nodeIndex], ...action.payload.data };
      }
    },
    addEdge: (state, action: PayloadAction<Edge>) => {
      state.edges.push(action.payload);
    },
    removeEdge: (state, action: PayloadAction<string>) => {
      state.edges = state.edges.filter(edge => edge.id !== action.payload);
    },
    setSelectedElement: (state, action: PayloadAction<string | null>) => {
      state.selectedElement = action.payload;
    },
    setIsDragging: (state, action: PayloadAction<boolean>) => {
      state.isDragging = action.payload;
    },
    setScale: (state, action: PayloadAction<number>) => {
      state.scale = action.payload;
    },
    setOffset: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.offset = action.payload;
    },
    clearCanvas: (state) => {
      state.nodes = [];
      state.edges = [];
      state.selectedElement = null;
      state.isDragging = false;
      state.scale = 1;
      state.offset = { x: 0, y: 0 };
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Save canvas data cases
      .addCase(saveCanvasData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(saveCanvasData.fulfilled, (state, action: PayloadAction<{ boardId: string; nodes: Node[]; edges: Edge[] }>) => {
        state.loading = false;
        state.nodes = action.payload.nodes;
        state.edges = action.payload.edges;
      })
      .addCase(saveCanvasData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to save canvas data';
      })
      // Load canvas data cases
      .addCase(loadCanvasData.fulfilled, (state, action: PayloadAction<Node[]>) => {
        state.nodes = action.payload;
        state.loading = false;
      })
      .addCase(loadCanvasData.rejected, (state, action) => {
        state.error = action.payload as string || 'Failed to load canvas data';
        state.loading = false;
      });
  },
});

export const { 
  setBoardId,
  addNode,
  removeNode,
  updateNode,
  addEdge,
  removeEdge,
  setSelectedElement,
  setIsDragging,
  setScale,
  setOffset,
  clearCanvas,
  setLoading,
  setError,
} = canvasSlice.actions;

export default canvasSlice.reducer;
