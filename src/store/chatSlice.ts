import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createChatMessage, listChatMessages } from '../data/chatStorage';

// Define the message type
interface Message {
  id: string;
  text: string;
  role: 'user' | 'assistant';
  graphData?: {
    label: string; 
    value: number;
  }[];
  chartType?: 'pie' | 'bar' | 'line';
  isLoading?: boolean;
  timestamp?: Date;
}

// Define the chat state
interface ChatState {
  messages: Message[];
  activeChatId: string | null;
  loading: boolean;
  error: string | null;
  isGenerating: boolean;
}

// Initial state
const initialState: ChatState = {
  messages: [],
  activeChatId: null,
  loading: false,
  error: null,
  isGenerating: false,
};

// Async thunk for sending a message
export const sendMessage = createAsyncThunk(
  'chat/sendMessage',
  async ({ chatId, message, userId }: { chatId: string; message: string; userId: string }, { rejectWithValue }) => {
    try {
      const newMessage: Omit<Message, "id"> = {
        text: message,
        role: 'user',
      };
      const created = await createChatMessage(chatId, newMessage, userId);
      return { chatId, message: created };
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to send message');
    }
  }
);

// Async thunk for getting chat history
export const fetchChatHistory = createAsyncThunk(
  'chat/fetchChatHistory',
  async (chatId: string, { rejectWithValue }) => {
    try {
      const messages = await listChatMessages(chatId);
      return messages;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch chat history');
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveChat: (state, action: PayloadAction<string>) => {
      state.activeChatId = action.payload;
      state.messages = [];
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    setIsGenerating: (state, action: PayloadAction<boolean>) => {
      state.isGenerating = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    resetChat: (state) => {
      state.messages = [];
      state.activeChatId = null;
      state.error = null;
      state.isGenerating = false;
    },
    updateMessage: (state, action: PayloadAction<{ id: string; updates: Partial<Message> }>) => {
      const messageIndex = state.messages.findIndex(msg => msg.id === action.payload.id);
      if (messageIndex !== -1) {
        state.messages[messageIndex] = { ...state.messages[messageIndex], ...action.payload.updates };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Send message cases
      .addCase(sendMessage.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action: PayloadAction<{ chatId: string; message: Message }>) => {
        state.loading = false;
        state.messages.push(action.payload.message);
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to send message';
      })
      // Fetch chat history cases
      .addCase(fetchChatHistory.fulfilled, (state, action: PayloadAction<Message[]>) => {
        state.messages = action.payload;
        state.loading = false;
      })
      .addCase(fetchChatHistory.rejected, (state, action) => {
        state.error = action.payload as string || 'Failed to fetch chat history';
        state.loading = false;
      });
  },
});

export const { setActiveChat, addMessage, clearMessages, setIsGenerating, setError, resetChat, updateMessage } = chatSlice.actions;

export default chatSlice.reducer;
