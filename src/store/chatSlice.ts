import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

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

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return fallback;
};

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
  async ({ chatId, message }: { chatId: string; message: string }, { rejectWithValue }) => {
    try {
      // Simulate API call
      const newMessage: Message = {
        id: Date.now().toString(),
        text: message,
        role: 'user',
      };
      return { chatId, message: newMessage };
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error, 'Failed to send message'));
    }
  }
);

// Async thunk for getting chat history
export const fetchChatHistory = createAsyncThunk(
  'chat/fetchChatHistory',
  async (chatId: string, { rejectWithValue }) => {
    try {
      // Simulate API call to fetch chat history from localStorage
      const storedChat = localStorage.getItem(`chat-${chatId}`);
      return storedChat ? JSON.parse(storedChat) : [];
    } catch (error: unknown) {
      return rejectWithValue(getErrorMessage(error, 'Failed to fetch chat history'));
    }
  }
);

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setActiveChat: (state, action: PayloadAction<string>) => {
      state.activeChatId = action.payload;
      // Load messages from localStorage for this chat
      const storedMessages = localStorage.getItem(`chat-${action.payload}`);
      state.messages = storedMessages ? JSON.parse(storedMessages) : [];
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      state.messages.push(action.payload);
      // Persist to localStorage
      if (state.activeChatId) {
        localStorage.setItem(`chat-${state.activeChatId}`, JSON.stringify(state.messages));
      }
    },
    clearMessages: (state) => {
      state.messages = [];
      // Persist to localStorage
      if (state.activeChatId) {
        localStorage.setItem(`chat-${state.activeChatId}`, JSON.stringify(state.messages));
      }
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
      // Persist to localStorage
      if (state.activeChatId) {
        localStorage.setItem(`chat-${state.activeChatId}`, JSON.stringify(state.messages));
      }
    },
    updateMessage: (state, action: PayloadAction<{ id: string; updates: Partial<Message> }>) => {
      const messageIndex = state.messages.findIndex(msg => msg.id === action.payload.id);
      if (messageIndex !== -1) {
        state.messages[messageIndex] = { ...state.messages[messageIndex], ...action.payload.updates };
        // Persist to localStorage
        if (state.activeChatId) {
          localStorage.setItem(`chat-${state.activeChatId}`, JSON.stringify(state.messages));
        }
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
        // Persist to localStorage
        if (state.activeChatId) {
          localStorage.setItem(`chat-${state.activeChatId}`, JSON.stringify(state.messages));
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string || 'Failed to send message';
      })
      // Fetch chat history cases
      .addCase(fetchChatHistory.fulfilled, (state, action: PayloadAction<Message[]>) => {
        state.messages = action.payload;
        state.loading = false;
        // Persist to localStorage
        if (state.activeChatId) {
          localStorage.setItem(`chat-${state.activeChatId}`, JSON.stringify(state.messages));
        }
      })
      .addCase(fetchChatHistory.rejected, (state, action) => {
        state.error = action.payload as string || 'Failed to fetch chat history';
        state.loading = false;
      });
  },
});

export const { setActiveChat, addMessage, clearMessages, setIsGenerating, setError, resetChat, updateMessage } = chatSlice.actions;

export default chatSlice.reducer;
