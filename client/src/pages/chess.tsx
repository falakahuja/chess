import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Crown, Users, MessageCircle, Flag, Handshake, Plus, Wifi, WifiOff } from "lucide-react";
import ChessBoard from "@/components/ChessBoard";
import RoomModal from "@/components/RoomModal";
import GameOverModal from "@/components/GameOverModal";
import { useWebSocket } from "@/hooks/useWebSocket";

interface ChatMessage {
  id: number;
  playerName: string;
  message: string;
  createdAt: string;
}

interface GameState {
  fen: string;
  currentTurn: 'white' | 'black';
  moveHistory: string[];
  status: string;
  winner?: string;
  check?: boolean;
  checkmate?: boolean;
  draw?: boolean;
}

export default function ChessGame() {
  const [showRoomModal, setShowRoomModal] = useState(true);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [playerColor, setPlayerColor] = useState<'white' | 'black' | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [gameState, setGameState] = useState<GameState>({
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    currentTurn: 'white',
    moveHistory: [],
    status: 'waiting'
  });
  const [gameResult, setGameResult] = useState<{ title: string; message: string } | null>(null);
  const [gameDuration, setGameDuration] = useState('00:00');

  const { socket, isConnected, sendMessage } = useWebSocket({
    onMessage: (message) => {
      switch (message.type) {
        case 'room_created':
          setRoomCode(message.roomCode);
          setPlayerColor(message.color);
          setGameState(message.gameState);
          setShowRoomModal(false);
          break;
        case 'room_joined':
          setRoomCode(message.roomCode);
          setPlayerColor(message.color);
          setGameState(message.gameState);
          setChatMessages(message.chatMessages || []);
          setShowRoomModal(false);
          break;
        case 'game_started':
          setGameState(message.gameState);
          break;
        case 'move_made':
          setGameState(message.gameState);
          if (message.gameState.checkmate || message.gameState.draw) {
            handleGameEnd(message.gameState);
          }
          break;
        case 'chat_message':
          setChatMessages(prev => [...prev, message.message]);
          break;
        case 'game_ended':
          handleGameEnd(undefined, message);
          break;
        case 'error':
          console.error('WebSocket error:', message.message);
          break;
      }
    }
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState.status === 'active') {
      const startTime = Date.now();
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        setGameDuration(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState.status]);

  const handleGameEnd = (gameStateData?: GameState | undefined, endData?: any) => {
    if (gameStateData?.checkmate) {
      setGameResult({
        title: 'Checkmate!',
        message: `${gameStateData.winner === 'white' ? 'White' : 'Black'} wins by checkmate`
      });
    } else if (gameStateData?.draw) {
      setGameResult({
        title: 'Draw!',
        message: 'Game ended in a draw'
      });
    } else if (endData?.reason === 'resignation') {
      setGameResult({
        title: 'Game Over!',
        message: `${endData.winner === 'white' ? 'White' : 'Black'} wins by resignation`
      });
    }
    setShowGameOverModal(true);
  };

  const handleCreateRoom = (name: string) => {
    setPlayerName(name);
    sendMessage({ type: 'create_room', playerName: name });
  };

  const handleJoinRoom = (code: string, name: string) => {
    setPlayerName(name);
    sendMessage({ type: 'join_room', roomCode: code, playerName: name });
  };

  const handleMove = (from: string, to: string, promotion?: string) => {
    if (playerColor === gameState.currentTurn) {
      const moveData: any = { type: 'make_move', from, to };
      if (promotion) {
        moveData.promotion = promotion;
      }
      sendMessage(moveData);
    }
  };

  const handleSendChat = () => {
    if (chatInput.trim()) {
      sendMessage({ type: 'send_chat', message: chatInput.trim() });
      setChatInput('');
    }
  };

  const handleResign = () => {
    sendMessage({ type: 'resign' });
  };

  const handleNewGame = () => {
    setShowRoomModal(true);
    setGameState({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      currentTurn: 'white',
      moveHistory: [],
      status: 'waiting'
    });
    setChatMessages([]);
    setPlayerColor(null);
    setRoomCode('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative">
      {/* Background decoration */}
      <div className="bg-decoration" />

      <div className="relative z-10 min-h-screen p-4">
        {/* Header */}
        <header className="mb-8">
          <Card className="glass border-white/20 max-w-7xl mx-auto">
            <div className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-center">
                <div className="flex items-center space-x-4 mb-4 md:mb-0">
                  <div className="w-12 h-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                    <Crown className="text-white text-xl" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-white">Multiplayer Chess</h1>
                    <p className="text-slate-300 text-sm">Real-time chess with friends</p>
                  </div>
                </div>
                
                {/* Connection Status */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {isConnected ? (
                      <>
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-green-400 text-sm font-medium flex items-center gap-1">
                          <Wifi className="w-4 h-4" />
                          Connected
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-red-400 text-sm font-medium flex items-center gap-1">
                          <WifiOff className="w-4 h-4" />
                          Disconnected
                        </span>
                      </>
                    )}
                  </div>
                  
                  {roomCode && (
                    <div className="glass-dark rounded-lg px-4 py-2">
                      <span className="text-slate-300 text-xs">Room:</span>
                      <span className="text-white font-mono ml-2">{roomCode}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </header>

        {/* Main Game Layout */}
        <div className="max-w-8xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Sidebar */}
            <div className="lg:col-span-3 space-y-6">
              {/* Current Turn */}
              <Card className="glass border-white/20 animate-slide-up">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Current Turn</h3>
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-full border-4 ${
                      gameState.currentTurn === 'white' 
                        ? 'bg-white border-indigo-500 animate-pulse-glow' 
                        : 'bg-slate-800 border-purple-500 animate-pulse-glow'
                    }`} />
                    <div>
                      <p className="text-white font-medium">
                        {gameState.currentTurn === 'white' ? "White's Turn" : "Black's Turn"}
                      </p>
                      <p className="text-slate-300 text-sm">
                        {playerColor === gameState.currentTurn ? "Your turn" : "Opponent's turn"}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Players */}
              <Card className="glass border-white/20">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Players
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                        <Crown className="text-slate-800 w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {playerColor === 'white' ? playerName : 'Opponent'}
                        </p>
                        <p className="text-slate-300 text-xs">White pieces</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center">
                        <Crown className="text-white w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-white font-medium">
                          {playerColor === 'black' ? playerName : 'Opponent'}
                        </p>
                        <p className="text-slate-300 text-xs">Black pieces</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Game Controls */}
              <Card className="glass border-white/20">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Controls</h3>
                  <div className="space-y-3">
                    <Button 
                      onClick={handleResign}
                      className="w-full bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 transition-all duration-300 hover:scale-105"
                      variant="outline"
                    >
                      <Flag className="mr-2 w-4 h-4" />
                      Resign Game
                    </Button>
                    <Button 
                      onClick={handleNewGame}
                      className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 transition-all duration-300 hover:scale-105"
                      variant="outline"
                    >
                      <Plus className="mr-2 w-4 h-4" />
                      New Game
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Chess Board */}
            <div className="lg:col-span-6">
              <Card className="glass border-white/20">
                <div className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-white">Game Board</h2>
                    <div className="text-slate-300 text-sm">
                      <span>Move: </span>
                      <span className="text-white font-mono">{Math.ceil(gameState.moveHistory.length / 2)}</span>
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <ChessBoard 
                      gameState={gameState}
                      playerColor={playerColor}
                      onMove={handleMove}
                    />
                  </div>
                  
                  <div className="mt-4 text-center">
                    <Badge variant="secondary" className="glass-dark border-white/20">
                      {gameState.status === 'waiting' ? 'Waiting for opponent...' : 
                       gameState.status === 'active' ? 'Game in progress' :
                       gameState.status}
                    </Badge>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Sidebar */}
            <div className="xl:col-span-3 space-y-6">
              {/* Move History */}
              <Card className="glass border-white/20">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Move History</h3>
                  <ScrollArea className="max-h-64">
                    <div className="space-y-2">
                      {gameState.moveHistory.length === 0 ? (
                        <p className="text-slate-400 text-sm">No moves yet</p>
                      ) : (
                        gameState.moveHistory.reduce((acc: any[], move, index) => {
                          if (index % 2 === 0) {
                            acc.push([move, gameState.moveHistory[index + 1] || '']);
                          }
                          return acc;
                        }, []).map(([whiteMove, blackMove], index) => (
                          <div key={index} className="flex justify-between items-center py-2 px-3 bg-slate-800/30 rounded-lg">
                            <span className="text-slate-400 text-sm">{index + 1}.</span>
                            <span className="text-white font-mono">{whiteMove}</span>
                            <span className="text-slate-300 font-mono">{blackMove || '-'}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </Card>

              {/* Chat */}
              <Card className="glass border-white/20">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    Chat
                  </h3>
                  <ScrollArea className="max-h-48 mb-4">
                    <div className="space-y-3">
                      {chatMessages.length === 0 ? (
                        <p className="text-slate-400 text-sm">No messages yet</p>
                      ) : (
                        chatMessages.map((msg, index) => (
                          <div key={index} className="flex flex-col space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-indigo-400 text-sm font-medium">{msg.playerName}:</span>
                              <span className="text-slate-300 text-sm">{msg.message}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  
                  <div className="flex space-x-2">
                    <Input 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                      placeholder="Type a message..." 
                      className="flex-1 bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <Button onClick={handleSendChat} className="bg-indigo-600 hover:bg-indigo-700">
                      <MessageCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Game Stats */}
              <Card className="glass border-white/20">
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Game Stats</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-300">Duration:</span>
                      <span className="text-white font-mono">{gameDuration}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Total Moves:</span>
                      <span className="text-white font-mono">{gameState.moveHistory.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-300">Status:</span>
                      <span className="text-white font-mono capitalize">{gameState.status}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <RoomModal 
        open={showRoomModal}
        onCreateRoom={handleCreateRoom}
        onJoinRoom={handleJoinRoom}
      />

      <GameOverModal 
        open={showGameOverModal}
        onClose={() => setShowGameOverModal(false)}
        gameResult={gameResult}
        onLeaveRoom={handleNewGame}
      />
    </div>
  );
}
