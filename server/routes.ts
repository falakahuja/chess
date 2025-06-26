import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { Chess } from "chess.js";
import { storage } from "./storage";

// Extend WebSocket type to include isAlive property
declare module 'ws' {
  interface WebSocket {
    isAlive?: boolean;
  }
}

interface ClientConnection {
  ws: WebSocket;
  roomId?: number;
  playerId?: number;
  playerName?: string;
  color?: 'white' | 'black';
}

const clients = new Map<WebSocket, ClientConnection>();

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws'
  });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('Client connected from:', req.socket.remoteAddress);
    
    clients.set(ws, { ws });

    // Send immediate connection confirmation
    ws.send(JSON.stringify({ type: 'connected' }));

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        console.log('Received message:', message.type);
        await handleWebSocketMessage(ws, message, wss);
      } catch (error) {
        console.error('WebSocket message error:', error);
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
      }
    });

    ws.on('close', (code, reason) => {
      console.log('Client disconnected:', code, reason?.toString());
      clients.delete(ws);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error for client:', error.message);
      clients.delete(ws);
    });
  });

  async function handleWebSocketMessage(ws: WebSocket, message: any, wss: WebSocketServer) {
    const client = clients.get(ws);
    if (!client) return;

    switch (message.type) {
      case 'create_room':
        await handleCreateRoom(ws, message);
        break;
      case 'join_room':
        await handleJoinRoom(ws, message, wss);
        break;
      case 'make_move':
        await handleMakeMove(ws, message, wss);
        break;
      case 'send_chat':
        await handleSendChat(ws, message, wss);
        break;
      case 'resign':
        await handleResign(ws, wss);
        break;
      case 'offer_draw':
        await handleOfferDraw(ws, wss);
        break;
    }
  }

  async function handleCreateRoom(ws: WebSocket, message: any) {
    try {
      const code = generateRoomCode();
      const room = await storage.createRoom({ code });
      
      // Create initial game
      const chess = new Chess();
      const game = await storage.createGame({
        roomId: room.id,
        currentTurn: 'white',
        boardState: chess.fen(),
        moveHistory: [],
        status: 'waiting'
      });

      // Update client connection
      const client = clients.get(ws);
      if (client) {
        client.roomId = room.id;
        client.playerId = 1;
        client.playerName = message.playerName || 'Player 1';
        client.color = 'white';
      }

      // Update room with player 1
      await storage.updateRoom(room.id, { player1Id: 1 });

      ws.send(JSON.stringify({
        type: 'room_created',
        roomCode: code,
        roomId: room.id,
        color: 'white',
        gameState: {
          fen: chess.fen(),
          currentTurn: 'white',
          moveHistory: [],
          status: 'waiting'
        }
      }));
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to create room' }));
    }
  }

  async function handleJoinRoom(ws: WebSocket, message: any, wss: WebSocketServer) {
    try {
      const room = await storage.getRoomByCode(message.roomCode);
      if (!room) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room not found' }));
        return;
      }

      if (room.player2Id) {
        ws.send(JSON.stringify({ type: 'error', message: 'Room is full' }));
        return;
      }

      // Update room with player 2
      await storage.updateRoom(room.id, { player2Id: 2 });

      // Update client connection
      const client = clients.get(ws);
      if (client) {
        client.roomId = room.id;
        client.playerId = 2;
        client.playerName = message.playerName || 'Player 2';
        client.color = 'black';
      }

      // Get current game state
      const game = await storage.getGameByRoomId(room.id);
      if (!game) {
        ws.send(JSON.stringify({ type: 'error', message: 'Game not found' }));
        return;
      }

      // Update game status to active
      await storage.updateGame(game.id, { status: 'active' });

      // Get chat messages
      const chatMessages = await storage.getChatMessages(room.id);

      // Send game state to joining player
      ws.send(JSON.stringify({
        type: 'room_joined',
        roomCode: room.code,
        roomId: room.id,
        color: 'black',
        gameState: {
          fen: game.boardState,
          currentTurn: game.currentTurn,
          moveHistory: game.moveHistory,
          status: 'active'
        },
        chatMessages: chatMessages
      }));

      // Notify all clients in the room that game is starting
      broadcastToRoom(room.id, {
        type: 'game_started',
        gameState: {
          fen: game.boardState,
          currentTurn: game.currentTurn,
          moveHistory: game.moveHistory,
          status: 'active'
        }
      }, wss);

    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to join room' }));
    }
  }

  async function handleMakeMove(ws: WebSocket, message: any, wss: WebSocketServer) {
    try {
      const client = clients.get(ws);
      if (!client || !client.roomId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not in a room' }));
        return;
      }

      const game = await storage.getGameByRoomId(client.roomId);
      if (!game) {
        ws.send(JSON.stringify({ type: 'error', message: 'Game not found' }));
        return;
      }

      // Ensure game is active
      if (game.status !== 'active') {
        ws.send(JSON.stringify({ type: 'error', message: 'Game is not active' }));
        return;
      }

      // Strict turn validation - only the player whose turn it is can move
      if (client.color !== game.currentTurn) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not your turn' }));
        return;
      }

      // Validate move using chess.js with strict rules
      const chess = new Chess(game.boardState);
      
      // Ensure the piece being moved belongs to the current player
      const piece = chess.get(message.from);
      if (!piece) {
        ws.send(JSON.stringify({ type: 'error', message: 'No piece at source square' }));
        return;
      }
      
      const expectedColor = game.currentTurn === 'white' ? 'w' : 'b';
      if (piece.color !== expectedColor) {
        ws.send(JSON.stringify({ type: 'error', message: 'Cannot move opponent\'s piece' }));
        return;
      }

      // Validate and make the move
      let move;
      try {
        // First try without promotion
        move = chess.move({
          from: message.from,
          to: message.to
        });
      } catch (e) {
        // If that fails and promotion is provided, try with promotion
        if (message.promotion) {
          try {
            move = chess.move({
              from: message.from,
              to: message.to,
              promotion: message.promotion
            });
          } catch (e2) {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid move' }));
            return;
          }
        } else {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid move' }));
          return;
        }
      }

      if (!move) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid move' }));
        return;
      }

      // Update game state with proper move history
      const moveHistory = Array.isArray(game.moveHistory) ? game.moveHistory : [];
      const newMoveHistory = [...moveHistory, move.san];
      const nextTurn = chess.turn() === 'w' ? 'white' : 'black';
      let gameStatus = 'active';
      let winner = null;

      // Check for game ending conditions - ONLY checkmate ends the game automatically
      if (chess.isCheckmate()) {
        gameStatus = 'checkmate';
        winner = game.currentTurn; // Current player wins
      }
      // Note: Removed automatic draw/stalemate detection per user request
      // Game continues until checkmate or manual resignation

      // Update the game in database
      await storage.updateGame(game.id, {
        boardState: chess.fen(),
        currentTurn: nextTurn,
        moveHistory: newMoveHistory,
        status: gameStatus,
        winner: winner
      });

      // Broadcast move to all clients in the room with complete game state
      broadcastToRoom(client.roomId, {
        type: 'move_made',
        move: {
          from: message.from,
          to: message.to,
          promotion: message.promotion,
          san: move.san,
          piece: move.piece,
          captured: move.captured || null
        },
        gameState: {
          fen: chess.fen(),
          currentTurn: nextTurn,
          moveHistory: newMoveHistory,
          status: gameStatus,
          winner: winner,
          check: chess.inCheck(),
          checkmate: chess.isCheckmate(),
          draw: false, // Never automatically declare draw
          stalemate: false, // Never automatically declare stalemate
          turn: chess.turn(),
          gameOver: gameStatus !== 'active'
        }
      }, wss);

      console.log(`Move made: ${move.san} by ${client.color} in room ${client.roomId}`);

    } catch (error) {
      console.error('Move handling error:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to make move' }));
    }
  }

  async function handleSendChat(ws: WebSocket, message: any, wss: WebSocketServer) {
    try {
      const client = clients.get(ws);
      if (!client || !client.roomId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not in a room' }));
        return;
      }

      const chatMessage = await storage.addChatMessage({
        roomId: client.roomId,
        playerId: client.playerId || null,
        playerName: client.playerName || 'Anonymous',
        message: message.message
      });

      broadcastToRoom(client.roomId, {
        type: 'chat_message',
        message: {
          id: chatMessage.id,
          playerName: chatMessage.playerName,
          message: chatMessage.message,
          createdAt: chatMessage.createdAt
        }
      }, wss);

    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to send chat message' }));
    }
  }

  async function handleResign(ws: WebSocket, wss: WebSocketServer) {
    try {
      const client = clients.get(ws);
      if (!client || !client.roomId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not in a room' }));
        return;
      }

      const game = await storage.getGameByRoomId(client.roomId);
      if (!game) {
        ws.send(JSON.stringify({ type: 'error', message: 'Game not found' }));
        return;
      }

      const winner = client.color === 'white' ? 'black' : 'white';
      
      await storage.updateGame(game.id, {
        status: 'resigned',
        winner: winner
      });

      broadcastToRoom(client.roomId, {
        type: 'game_ended',
        reason: 'resignation',
        winner: winner,
        resignedPlayer: client.color
      }, wss);

    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to resign' }));
    }
  }

  async function handleOfferDraw(ws: WebSocket, wss: WebSocketServer) {
    try {
      const client = clients.get(ws);
      if (!client || !client.roomId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not in a room' }));
        return;
      }

      broadcastToRoom(client.roomId, {
        type: 'draw_offered',
        offeredBy: client.color
      }, wss, ws);

    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', message: 'Failed to offer draw' }));
    }
  }

  function broadcastToRoom(roomId: number, message: any, wss: WebSocketServer, exclude?: WebSocket) {
    clients.forEach((client, ws) => {
      if (client.roomId === roomId && ws !== exclude && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }

  function generateRoomCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  return httpServer;
}
