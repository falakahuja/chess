import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Crown, Plus, Users } from "lucide-react";

interface RoomModalProps {
  open: boolean;
  onCreateRoom: (playerName: string) => void;
  onJoinRoom: (roomCode: string, playerName: string) => void;
}

export default function RoomModal({ open, onCreateRoom, onJoinRoom }: RoomModalProps) {
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;

    if (isJoining) {
      if (roomCode.trim()) {
        onJoinRoom(roomCode.trim().toUpperCase(), playerName.trim());
      }
    } else {
      onCreateRoom(playerName.trim());
    }
  };

  const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    setRoomCode(value);
  };

  return (
    <Dialog open={open}>
      <DialogContent className="glass border-white/20 text-white max-w-md">
        <DialogHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Crown className="text-white text-2xl" />
          </div>
          <DialogTitle className="text-2xl font-bold">
            {isJoining ? 'Join Chess Game' : 'Create Chess Game'}
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            {isJoining 
              ? 'Enter a room code to join an existing game'
              : 'Create a new room and invite a friend'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="playerName" className="text-slate-300">Your Name</Label>
            <Input
              id="playerName"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              className="bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
              required
            />
          </div>

          {isJoining && (
            <div>
              <Label htmlFor="roomCode" className="text-slate-300">Room Code</Label>
              <Input
                id="roomCode"
                value={roomCode}
                onChange={handleRoomCodeChange}
                placeholder="Enter 6-digit code"
                className="bg-slate-800/50 border-slate-600/50 text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-mono text-center uppercase tracking-widest"
                maxLength={6}
                required
              />
            </div>
          )}

          <Button 
            type="submit"
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white transition-all duration-300 hover:scale-105 font-medium"
          >
            {isJoining ? (
              <>
                <Users className="mr-2 w-4 h-4" />
                Join Room
              </>
            ) : (
              <>
                <Plus className="mr-2 w-4 h-4" />
                Create Room
              </>
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full bg-slate-600/50" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-slate-900 px-3 text-slate-400">or</span>
            </div>
          </div>

          <Button 
            type="button"
            onClick={() => setIsJoining(!isJoining)}
            className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 border-2 border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 transition-all duration-300 hover:scale-105 font-medium"
            variant="outline"
          >
            {isJoining ? (
              <>
                <Plus className="mr-2 w-4 h-4" />
                Create New Room Instead
              </>
            ) : (
              <>
                <Users className="mr-2 w-4 h-4" />
                Join Existing Room Instead
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
