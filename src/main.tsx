import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Provider } from 'react-redux';
import App from "./App/App";
import "./index.css";
import { store } from '../src/store';
import { enforceLocalhostOnly } from "./lib/runtimeGuard";

import ErrorBoundary from "./components/ErrorBoundary";

enforceLocalhostOnly();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </ErrorBoundary>
  </StrictMode>
);
