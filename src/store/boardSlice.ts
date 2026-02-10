import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createBoard, deleteBoard, getBoards } from '../data/boardStorage';

// Define the Board type here since we can't import from the other file
interface Board {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  // Add other properties as needed
}

// Define the board state
interface BoardState {
  boards: Board[];
  loading: boolean;
  error: string | null;
}

// Initial state
const initialState: BoardState = {
  boards: [],
  loading: false,
  error: null,
};

// Async thunk for fetching boards
export const fetchBoards = createAsyncThunk(
  'board/fetchBoards',
  async (userId: string) => {
    return await getBoards(userId);
  }
);

// Async thunk for adding a board
export const addBoard = createAsyncThunk(
  'board/addBoard',
  async (board: Board) => {
    const created = await createBoard(board.userId);
    return created;
  }
);

// Async thunk for removing a board
export const removeBoard = createAsyncThunk(
  'board/removeBoard',
  async ({ userId, boardId }: { userId: string; boardId: string }) => {
    await deleteBoard(userId, boardId);
    return boardId;
  }
);

const boardSlice = createSlice({
  name: 'board',
  initialState,
  reducers: {
    setBoards: (state, action: PayloadAction<Board[]>) => {
      state.boards = action.payload;
    },
    addBoardToState: (state, action: PayloadAction<Board>) => {
      state.boards.push(action.payload);
    },
    removeBoardFromState: (state, action: PayloadAction<string>) => {
      state.boards = state.boards.filter(board => board.id !== action.payload);
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
      // Fetch boards cases
      .addCase(fetchBoards.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBoards.fulfilled, (state, action: PayloadAction<Board[]>) => {
        state.loading = false;
        state.boards = action.payload;
      })
      .addCase(fetchBoards.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch boards';
      })
      // Add board cases
      .addCase(addBoard.fulfilled, (state, action: PayloadAction<Board>) => {
        state.boards.push(action.payload);
      })
      // Remove board cases
      .addCase(removeBoard.fulfilled, (state, action: PayloadAction<string>) => {
        state.boards = state.boards.filter(board => board.id !== action.payload);
      });
  },
});

export const { setBoards, addBoardToState, removeBoardFromState, setLoading, setError } = boardSlice.actions;

export default boardSlice.reducer;
