import { rooms, games, chatMessages, users, type Room, type Game, type ChatMessage, type User, type InsertRoom, type InsertGame, type InsertChatMessage, type InsertUser } from "@shared/schema";
import { db } from "./db";
import { eq, sql } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Room methods
  createRoom(room: InsertRoom): Promise<Room>;
  getRoomByCode(code: string): Promise<Room | undefined>;
  updateRoom(id: number, updates: Partial<Room>): Promise<Room | undefined>;
  
  // Game methods
  createGame(game: InsertGame): Promise<Game>;
  getGameByRoomId(roomId: number): Promise<Game | undefined>;
  updateGame(id: number, updates: Partial<Game>): Promise<Game | undefined>;
  
  // Chat methods
  addChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(roomId: number): Promise<ChatMessage[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const [room] = await db
      .insert(rooms)
      .values(insertRoom)
      .returning();
    return room;
  }

  async getRoomByCode(code: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.code, code));
    return room || undefined;
  }

  async updateRoom(id: number, updates: Partial<Room>): Promise<Room | undefined> {
    const [room] = await db
      .update(rooms)
      .set(updates)
      .where(eq(rooms.id, id))
      .returning();
    return room || undefined;
  }

  async createGame(insertGame: InsertGame): Promise<Game> {
    try {
      const [game] = await db
        .insert(games)
        .values({
          roomId: insertGame.roomId,
          currentTurn: insertGame.currentTurn || 'white',
          boardState: insertGame.boardState,
          moveHistory: insertGame.moveHistory || [],
          status: insertGame.status || 'waiting',
          winner: insertGame.winner || null
        } as any)
        .returning();
      return game;
    } catch (error) {
      console.error('Database insert error:', error);
      throw error;
    }
  }

  async getGameByRoomId(roomId: number): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.roomId, roomId));
    return game || undefined;
  }

  async updateGame(id: number, updates: Partial<Game>): Promise<Game | undefined> {
    const [game] = await db
      .update(games)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(games.id, id))
      .returning();
    return game || undefined;
  }

  async addChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const [message] = await db
      .insert(chatMessages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async getChatMessages(roomId: number): Promise<ChatMessage[]> {
    return await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.roomId, roomId))
      .orderBy(chatMessages.createdAt);
  }
}

export const storage = new DatabaseStorage();
