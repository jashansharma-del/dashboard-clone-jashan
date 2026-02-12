# Architecture Diagrams

This file provides visual diagrams for the Cisco Dashboard Clone using Mermaid.

## 1. High-Level Runtime Flow

```mermaid
flowchart LR
  U[User] --> UI[React UI]
  UI --> PAGES[Pages / Components]
  PAGES --> SERVICES[Domain Services]
  SERVICES --> APPWRITE[(Appwrite APIs)]
  SERVICES --> WEBEX[(Webex APIs)]
  SERVICES --> FALLBACK[(In-memory Fallback)]
  APPWRITE --> STATE[Redux + Local State]
  WEBEX --> STATE
  FALLBACK --> STATE
  STATE --> UI
```

## 2. Board and Data Services Mapping

```mermaid
flowchart TB
  BP[BoardsPage.tsx] --> BS[boardStorage.ts]
  BP --> CS[chatStorage.ts]
  NBP[NewBoardPage.tsx] --> CVS[canvasStorage.ts]

  BS --> A1[Boards Collection]
  CS --> A2[Chat Collection]
  CVS --> A3[Canvas Collection]

  A1 --> APP[(Appwrite)]
  A2 --> APP
  A3 --> APP
```

## 3. Webex Share Flow

```mermaid
sequenceDiagram
  participant User
  participant BoardsPage
  participant WebexAuth as webexAuth.ts
  participant WebexAPI as Webex APIs

  User->>BoardsPage: Open Share dialog
  User->>BoardsPage: Enter recipient email + Search
  BoardsPage->>WebexAuth: get access token
  BoardsPage->>WebexAPI: GET /v1/people?email=...
  WebexAPI-->>BoardsPage: Recipient list
  User->>BoardsPage: Select recipient + Send
  BoardsPage->>WebexAPI: POST /v1/messages
  WebexAPI-->>BoardsPage: Message result
  BoardsPage-->>User: Success / error state
```

## 4. OAuth Callback Flow

```mermaid
sequenceDiagram
  participant Browser
  participant Callback as WebexCallback.tsx
  participant Auth as webexAuth.ts
  participant Webex as Webex /people/me
  participant Appwrite as Appwrite Prefs
  participant Redux

  Browser->>Callback: Redirect /webex/callback
  Callback->>Auth: parse callback params
  Callback->>Auth: exchange code (if code flow)
  Callback->>Webex: fetchWebexMe(accessToken)
  Webex-->>Callback: Webex profile
  Callback->>Appwrite: persist token/profile
  Callback->>Redux: setCredentials + auth state
  Callback-->>Browser: navigate to boards page
```

## 5. API Usage Split (Example Pie Chart)

```mermaid
pie showData
  title API Surface by Primary Usage
  "Appwrite (boards/chat/canvas)" : 70
  "Webex (auth/share)" : 30
```

## 6. Key Operation Volume (Example Bar Chart)

```mermaid
xychart-beta
  title "Estimated Daily Operation Volume"
  x-axis ["Board Reads", "Board Writes", "Chat Ops", "Canvas Saves", "Webex Share"]
  y-axis "Calls" 0 --> 500
  bar [420, 130, 300, 210, 65]
```
