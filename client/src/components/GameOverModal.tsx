import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trophy, RotateCcw, LogOut } from "lucide-react";

interface GameOverModalProps {
  open: boolean;
  onClose: () => void;
  gameResult: { title: string; message: string } | null;
  onLeaveRoom: () => void;
}

export default function GameOverModal({ 
  open, 
  onClose, 
  gameResult, 
  onLeaveRoom 
}: GameOverModalProps) {
  if (!gameResult) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="glass border-white/20 text-white max-w-md">
        <DialogHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Trophy className="text-white text-2xl" />
          </div>
          <DialogTitle className="text-2xl font-bold">
            {gameResult.title}
          </DialogTitle>
          <DialogDescription className="text-slate-300">
            {gameResult.message}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-6">
          <Button 
            onClick={onLeaveRoom}
            className="w-full bg-slate-600/20 hover:bg-slate-600/30 border border-slate-500/30 text-slate-300 transition-all duration-300 hover:scale-105 font-medium"
            variant="outline"
          >
            <LogOut className="mr-2 w-4 h-4" />
            Leave Room
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
