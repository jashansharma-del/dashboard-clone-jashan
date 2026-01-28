import { v4 as uuidv4 } from "uuid";

export type Message = {
  id: string;
  text: string;
  role: "user" | "assistant";
  graphData?: {
    label: string;
    value: number;
  }[];
};

// Add chart data type
export type ChartData = {
  label: string;
  value: number;
};

export type Widget = {
  id: string;
  type: string;
  position: { x: number; y: number };
  props?: {
    label?: string;
    data?: ChartData[]; // Add data property for charts
    [key: string]: any; // Allow other properties
  };
};

export type Board = {
  id: string;
  title: string;
  widgets: Widget[];
  messages?: Message[];
};

const STORAGE_KEY = "boards";

export function createBoard(): Board {
  const newBoard: Board = {
    id: uuidv4(),
    title: "Untitled Board",
    widgets: [],
    messages: [],
  };

  const boards = getBoards();
  boards.push(newBoard);

  localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));

  return newBoard;
}

export function getBoards(): Board[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function getBoardById(id: string): Board | undefined {
  const boards = getBoards();
  return boards.find(board => board.id === id);
}

export function updateBoard(board: Board): void {
  const boards = getBoards();
  const index = boards.findIndex(b => b.id === board.id);
  
  if (index !== -1) {
    boards[index] = board;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
  }
}

// Helper function to add a widget with chart data to a board
export function addChartWidget(boardId: string, label: string, data: ChartData[]): void {
  const board = getBoardById(boardId);
  if (board) {
    const newWidget: Widget = {
      id: uuidv4(),
      type: "chart",
      position: { x: 0, y: board.widgets.length * 100 },
      props: {
        label,
        data
      }
    };
    board.widgets.push(newWidget);
    updateBoard(board);
  }
}