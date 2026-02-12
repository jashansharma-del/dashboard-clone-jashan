# Cisco Dashboard Clone

Interactive analytics board app built with React + TypeScript.  
Users can create boards, drag charts onto a canvas, keep chat context, and share board links through Webex.

## Contents
1. Overview
2. Features
3. Tech Stack
4. Architecture
5. Project Structure
6. Data Model
7. Authentication and Session Flow
8. Webex Share Flow
9. Environment Variables
10. Local Development
11. Build, Lint, and Quality Notes
12. Troubleshooting
13. Security Notes
14. Current Limitations and Next Improvements

## 1. Overview

This project is a dashboard workspace where each board can hold chart widgets and conversation context.  
Storage is Appwrite-first, with memory fallback paths used when Appwrite is unavailable during development.

The product has two main surfaces:
- Boards list page: create/manage/share boards.
- Board canvas page: place visual nodes and interact with generated chart content.

## 2. Features

- User authentication (including Webex OAuth sign-in).
- Board lifecycle:
  - create board
  - open board
  - delete board
  - pin/unpin board
- Board ownership and readability:
  - owned boards
  - boards shared with user (readable list)
- Chart board preview cards generated from board state.
- Canvas editor using React Flow.
- Chat history persistence per board.
- Webex share dialog:
  - search recipient by email
  - select Webex user
  - send direct message with board link

## 3. Tech Stack

- Frontend:
  - React 19
  - TypeScript
  - Vite
  - Tailwind CSS
  - shadcn/ui + Radix UI
  - React Flow
  - Redux Toolkit
- Backend services:
  - Appwrite (auth, prefs, database)
  - Webex REST APIs (OAuth, people search, direct messaging)

## 4. Architecture

High-level runtime flow:

1. UI components call domain services in `src/data` and `src/features/.../auth`.
2. Services hit Appwrite/Webex APIs.
3. On API failure, some services gracefully fallback to in-memory maps for local continuity.
4. Redux is used for global app slices (auth/chat/canvas/ui).

Design intent:
- Keep API calls close to feature domain modules.
- Keep page components orchestration-heavy and network-light.
- Preserve app usability even when cloud services are temporarily unavailable during development.

## 5. Project Structure

Key directories and files:

- `src/features/dashboard/BoardsPage.tsx`
  - Board listing, create/delete/pin actions, share dialog UX.
- `src/features/dashboard/components/canvas/NewBoardPage.tsx`
  - React Flow canvas surface and dropped-node rendering.
- `src/features/dashboard/components/auth/webexAuth.ts`
  - Webex OAuth flow + people search + message send helpers.
- `src/features/dashboard/components/auth/WebexCallback.tsx`
  - OAuth callback parsing, token exchange/persist, post-login redirect.
- `src/data/boardStorage.ts`
  - Board CRUD and board metadata model.
- `src/data/chatStorage.ts`
  - Chat message persistence and retrieval.
- `src/data/canvasStorage.ts`
  - Canvas node/edge persistence.
- `src/store/*`
  - Redux slices and store setup.

Optional local server:
- `server/webex-server.mjs`
  - Local relay/proxy utility for server-mode experiments.
  - Not required for the current frontend-direct Webex flow.

## 6. Data Model

Core board model (`boardStorage.ts`):

- `Board`
  - `id: string`
  - `userId: string`
  - `title: string`
  - `widgets: Widget[]`
  - `messages?: Message[]`
  - `isPinned?: boolean`

- `Widget`
  - `id: string`
  - `type: string`
  - `position: { x, y }`
  - `props?: { label?, data?, ... }`

- `Message`
  - `id: string`
  - `text: string`
  - `role: "user" | "assistant"`
  - `graphData?: { label, value }[]`

Persistence shape:
- Boards: Appwrite collection (`widgetsJson`, `isPinned`, etc.)
- Chat: Appwrite collection keyed by `board_id`
- Canvas: Appwrite collection keyed by `board_id`

Fallback behavior:
- `boardStorage`, `chatStorage`, and `canvasStorage` maintain in-memory mirrors when Appwrite calls fail.

## 7. Authentication and Session Flow

### App auth
- Appwrite auth utilities are used for user session context and preferences.

### Webex auth
Implemented in `webexAuth.ts`:

1. Build authorize URL with:
  - `client_id`
  - `redirect_uri`
  - `scope`
  - `state`
  - `prompt=consent`
2. Redirect user to Webex.
3. Handle callback in `WebexCallback.tsx`.
4. Parse OAuth response (`access_token` in implicit flow or `code` path when configured).
5. Fetch Webex profile (`/v1/people/me`).
6. Persist token/profile into Appwrite prefs + local auth state.

Session validity checks:
- `isWebexSessionValid()` verifies token presence and expiration from stored prefs.

## 8. Webex Share Flow

Current flow is frontend-direct:

1. Open share dialog from board card menu.
2. Enter recipient email and search.
3. App calls Webex People API:
   - `GET /v1/people?email=...`
4. Select recipient.
5. App sends Webex direct message:
   - `POST /v1/messages`
   - payload includes:
     - `toPersonId`
     - `markdown`
     - `text`
6. Recipient sees board link in Webex DM.

Implementation references:
- Search API helper: `searchWebexPeopleByEmail`
- Send helper: `sendWebexDirectMessage`
- Usage point: `BoardsPage.tsx` share dialog handlers

## 9. Environment Variables

Create `.env` at project root:

```env
VITE_APPWRITE_ENDPOINT=https://nyc.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
VITE_APPWRITE_DATABASE_ID=your_database_id
VITE_APPWRITE_COLLECTION_BOARDS=boards
VITE_APPWRITE_COLLECTION_CANVAS=board_canvas
VITE_APPWRITE_COLLECTION_CHAT=chat_messages

VITE_WEBEX_CLIENT_ID=your_webex_integration_client_id
VITE_WEBEX_REDIRECT_URI=http://localhost:5173/webex/callback
VITE_WEBEX_SCOPES=spark:people_read spark:messages_read spark:messages_write
VITE_WEBEX_OAUTH_FLOW=implicit
```

Notes:
- `VITE_*` values are exposed to browser.
- Do not put secrets (for example `client_secret`) in frontend env.
- If you move to server-side OAuth exchange later, keep secrets in non-`VITE_` env vars only.

## 10. Local Development

Install:

```bash
npm install
```

Run frontend:

```bash
npm run dev
```

Default URL:
- `http://localhost:5173`

Optional local server script:

```bash
npm run dev:server
```

Only needed if you intentionally test server-side relay mode.

## 11. Build, Lint, and Quality Notes

Commands:

```bash
npm run lint
npm run build
```

Current note:
- Some existing TypeScript issues may exist outside the Webex share surface (for example legacy slice typing mismatches).  
- These do not necessarily block local UI iteration but should be cleaned before strict CI gates.

## 12. Troubleshooting

### `client_secret cannot be null or empty`
- You are likely using auth code exchange expectations with frontend-only flow.
- For frontend exploration use:
  - `VITE_WEBEX_OAUTH_FLOW=implicit`

### `missing required scopes or user missing roles/licenses` (403)
- Ensure scopes include:
  - `spark:messages_write`
  - `spark:messages_read`
  - `spark:people_read`
- Re-login to refresh consent/token.
- If still failing: this is usually Webex org policy/license/role configuration.

### `Failed to create room`
- Recipient may not be eligible for direct room creation.
- Try another active Webex user in same org.
- Share Webex `trackingId` with admin for policy investigation.

### Share dialog cannot find users
- Verify token is valid and not expired.
- Confirm `spark:people_read` scope.
- Confirm recipient email belongs to a searchable Webex identity.

## 13. Security Notes

Frontend-only Webex messaging is acceptable for learning/prototyping, but not ideal for production.

For production:
- Move OAuth token exchange and messaging operations to backend.
- Keep secrets server-side only.
- Add audit logging, rate limits, and centralized error telemetry.

## 14. Current Limitations and Next Improvements

Recommended next technical upgrades:

1. Migrate Webex messaging to backend relay with secure token strategy.
2. Add robust integration tests around share flow.
3. Normalize board/chat/canvas domain types and reduce slice-type drift.
4. Add structured observability for API failures (`trackingId`, status, context).
5. Add role-aware UI messaging when Webex org policies block actions.

## 15. API to Component Mapping

This section lists the main API calls, where they are triggered, and which UI component initiates them.

### Appwrite APIs

1. Boards API
- UI entry: `src/features/dashboard/BoardsPage.tsx`
- Service layer: `src/data/boardStorage.ts`
- Functions used:
  - `createBoard(userId)`
  - `getReadableBoards(userId)`
  - `updateBoard(userId, board)`
  - `deleteBoard(userId, boardId)`
- Appwrite operations inside service:
  - `databases.createDocument(...)`
  - `databases.listDocuments(...)`
  - `databases.updateDocument(...)`
  - `databases.deleteDocument(...)`

2. Chat API
- UI entry: chat-related components and board title derivation
- Service layer: `src/data/chatStorage.ts`
- Functions used:
  - `listChatMessages(boardId)`
  - `createChatMessage(boardId, message, userId)`
  - `updateChatMessage(messageId, updates)`
  - `deleteChatMessages(boardId)`
  - `getFirstUserMessageText(boardId)`
- Appwrite operations:
  - list/create/update/delete documents in chat collection

3. Canvas API
- UI entry: canvas/drag-drop flow
- Service layer: `src/data/canvasStorage.ts`
- Functions used:
  - `saveCanvas(boardId, nodes, edges, userId?)`
  - `loadCanvas(boardId)`
- Appwrite operations:
  - list/create/update documents in canvas collection

4. Appwrite Account Prefs (Webex token/profile persistence)
- UI/Auth entry:
  - `src/features/dashboard/components/auth/WebexCallback.tsx`
  - `src/features/dashboard/components/auth/webexAuth.ts`
- Uses Appwrite account preferences to store/retrieve Webex session payload.

### Webex APIs

1. OAuth Authorize
- Called from: `src/features/dashboard/components/auth/webexAuth.ts`
- Function: `startWebexLogin()`
- API:
  - Browser redirect to `https://webexapis.com/v1/authorize`

2. OAuth Token Exchange (when code flow is used)
- Called from: `src/features/dashboard/components/auth/webexAuth.ts`
- Function: `exchangeWebexCodeForToken(code)`
- API:
  - `POST https://webexapis.com/v1/access_token`

3. Get current Webex user profile
- Called from:
  - `WebexCallback.tsx`
  - diagnostics and session validation paths
- Function: `fetchWebexMe(accessToken)`
- API:
  - `GET https://webexapis.com/v1/people/me`

4. Search Webex users by email
- Called from: Share dialog in `src/features/dashboard/BoardsPage.tsx`
- Function: `searchWebexPeopleByEmail(accessToken, email)`
- API:
  - `GET https://webexapis.com/v1/people?email=...`

5. Send Webex direct message
- Called from: Share dialog send action in `BoardsPage.tsx`
- Function: `sendWebexDirectMessage(accessToken, payload)`
- API:
  - `POST https://webexapis.com/v1/messages`

## 16. Data Flow (Component-to-Component and Service-to-Service)

This section explains how data moves through the app.

### A. Boards List Load Flow

1. `BoardsPage.tsx` mounts.
2. It reads authenticated user id from Redux (`state.auth.user?.$id`).
3. It calls `getReadableBoards(userId)` from `boardStorage.ts`.
4. For each board id, it calls `listChatMessages(board.id)` from `chatStorage.ts`.
5. Results are stored in local component state:
  - `boards`
  - `boardMessages`
6. `BoardCard` receives data via props:
  - `title`
  - `widgets`
  - `messages`
  - action callbacks (`onClick`, `onShare`, `onDelete`, etc.)

Data transfer mode:
- Parent-to-child via React props.
- No direct API calls inside `BoardCard` for board fetch itself.

### B. Board Create/Delete/Pin Flow

1. User action happens in `BoardsPage` (button/menu click).
2. `BoardsPage` calls service function:
  - create -> `createBoard`
  - delete -> `deleteBoard`
  - pin -> `updateBoard`
3. On success, `BoardsPage` refreshes list with `getReadableBoards`.
4. Updated data is passed to `BoardCard` as new props.

### C. Board Open Flow

1. User clicks a board card.
2. `BoardCard` calls `onClick` callback from parent.
3. Parent (`BoardsPage`) runs `navigate('/newboard/:id')`.
4. `NewBoardPage` renders `BoardCanvas`.
5. Canvas layer loads state from storage helpers (via drag-drop/canvas hooks and data services).

### D. Share Dialog Flow (Webex)

1. User clicks card menu -> Share.
2. `BoardCard` calls `onShare` callback.
3. `BoardsPage` opens dialog and stores active `shareBoardId`.
4. User enters email and presses Search.
5. `BoardsPage` gets Webex token (`getWebexAccessToken` or current session helper) and calls:
  - `searchWebexPeopleByEmail(accessToken, email)`
6. Search results are rendered in dialog list; user selects recipient.
7. User clicks Send.
8. `BoardsPage` builds `boardUrl` and calls:
  - `sendWebexDirectMessage(accessToken, { toPersonId, markdown, text })`
9. Success/error state is shown in dialog.

Data transfer mode:
- Dialog state is managed in `BoardsPage`.
- `BoardCard` only triggers open action via callback.
- API payload is assembled in page component using selected recipient + board id.

### E. OAuth Callback Flow

1. Webex redirects to `/webex/callback`.
2. `WebexCallback.tsx` reads URL/hash params via `parseWebexCallback()`.
3. If needed, it exchanges code for token.
4. It fetches profile from Webex (`fetchWebexMe`).
5. It persists session/profile (`persistWebexSession` + prefs storage utilities).
6. It dispatches auth Redux updates (`setCredentials`, `setLoading`, `setError`).
7. It navigates to boards route.

### F. Redux vs Local State

Redux is used for global cross-page state:
- auth, chat, canvas, UI slices.

Local component state is used for page-local UX state:
- dialog open/close
- search results
- selected recipient
- loading/error/success UI messages

### G. Error Handling and Fallback Flow

1. Data service functions try Appwrite/Webex API first.
2. On Appwrite failure in storage layers, fallback maps may return in-memory state.
3. UI components catch errors and display user-readable messages.
4. Webex errors often include `trackingId`; this should be surfaced for admin debugging.

---

If you need teammate onboarding, create a short `SETUP.md` that only contains:
- required env vars
- 5-minute local run steps
- known first-run errors and fixes

## 17. Visual Diagrams

See ARCHITECTURE_DIAGRAMS.md for Mermaid-based architecture and flow diagrams.

