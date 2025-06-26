# ♟ Multiplayer Chess Game

A real-time multiplayer chess game built with React and Node.js, where players can create or join game rooms, play chess in real-time, and chat during the game. The app has a modern UI and uses WebSockets to ensure smooth gameplay between players.

---

## 🚀 Features

- Create or join chess rooms using a 6-character code
- Real-time multiplayer gameplay
- Integrated chat system
- Move history tracking and automatic game result detection
- Interactive chessboard with drag-and-drop moves
- Responsive UI with animated transitions

---

## 🧱 Tech Stack

### 💻 Frontend

- **React 18 + TypeScript** – UI and logic
- **Tailwind CSS** – Styling
- **Radix UI + shadcn/ui** – UI components
- **React Query** – Handles API/data state
- **React Chessboard + chess.js** – Chess logic and visuals
- **Wouter** – Routing
- **React Hook Form** – Form handling
- **Framer Motion** – Smooth UI animations

### 🛠 Backend

- **Express.js + WebSocket (ws)** – Server and real-time gameplay
- **TypeScript** – Type-safe backend
- **PostgreSQL (Neon)** – Stores users, rooms, game state, and chat
- **Drizzle ORM + Zod** – Type-safe schema, database queries, and validation

---

## 🧠 How It Works

1. **Create a Room**  
   A player enters a name and creates a room. A 6-letter room code is generated and shared.

2. **Join a Room**  
   The second player uses the room code to join. The game starts automatically when both players are in.

3. **Play Chess**  
   Players make valid moves, which are synced in real-time via WebSockets.

4. **Chat**  
   A built-in chat panel allows players to communicate during the game.

5. **Game Over**  
   The app automatically detects checkmate, draw, or resign situations and displays the result.

---

