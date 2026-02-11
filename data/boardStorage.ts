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
    [key: string]: unknown; // Allow other properties
  };
};

export type Board = {
  id: string;
  userId: string;
  title: string;
  widgets: Widget[];
  messages?: Message[];
};

function getUserStorageKey(userId: string) {
  return `boards-${userId}`;
}

export function createBoard(userId: string): Board {
  const newBoard: Board = {
    id: uuidv4(),
    userId: userId,
    title: "Untitled Board",
    widgets: [],
    messages: [],
  };

  const boards = getBoards(userId);
  boards.push(newBoard);

  localStorage.setItem(getUserStorageKey(userId), JSON.stringify(boards));

  return newBoard;
}

export function getBoards(userId: string): Board[] {
  const data = localStorage.getItem(getUserStorageKey(userId));
  return data ? JSON.parse(data) : [];
}

export function getBoardById(userId: string, id: string): Board | undefined {
  const boards = getBoards(userId);
  return boards.find(board => board.id === id);
}

export function updateBoard(userId: string, board: Board): void {
  const boards = getBoards(userId);
  const index = boards.findIndex(b => b.id === board.id);
  
  if (index !== -1) {
    boards[index] = board;
    localStorage.setItem(getUserStorageKey(userId), JSON.stringify(boards));
  }
}

export function deleteBoard(userId: string, id: string): void {
  const boards = getBoards(userId);
  const filteredBoards = boards.filter(board => board.id !== id);
  
  localStorage.setItem(getUserStorageKey(userId), JSON.stringify(filteredBoards));
  
  // Also delete the associated chat messages
  localStorage.removeItem(`chat-${id}`);
}

// Helper function to add a widget with chart data to a board
export function addChartWidget(userId: string,boardId:string, label: string, data: ChartData[]): void {
  const board = getBoardById(userId, boardId);
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
    updateBoard(userId, board);
  }
}