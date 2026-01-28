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

export type Widget = {
  id: string;
  type: string;
  position: { x: number; y: number };
  props?: Record<string, unknown>;
};

export type Board = {
  id: string;
  title: string;
  widgets: Widget[];
  messages?: Message[]; // Add messages property to the board
};

const STORAGE_KEY = "boards";

export function createBoard(): Board {
  const newBoard: Board = {
    id: uuidv4(),
    title: "Untitled Board",
    widgets: [],
    messages: [], // Initialize with empty messages array
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

// Function to get a specific board by ID
export function getBoardById(id: string): Board | undefined {
  const boards = getBoards();
  return boards.find(board => board.id === id);
}

// Function to update a board
export function updateBoard(board: Board): void {
  const boards = getBoards();
  const index = boards.findIndex(b => b.id === board.id);
  
  if (index !== -1) {
    boards[index] = board;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
  }
}
