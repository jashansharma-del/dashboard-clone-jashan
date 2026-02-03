import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import boardReducer from './boardSlice';
import chatReducer from './chatSlice';
import uiReducer from './uiSlice';
import canvasReducer from './canvasSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    board: boardReducer,
    chat: chatReducer,
    ui: uiReducer,
    canvas: canvasReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;