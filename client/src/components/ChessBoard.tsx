import { useState, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import { Chess, Square } from "chess.js";
import { useToast } from "@/hooks/use-toast";

interface ChessBoardProps {
  gameState: {
    fen: string;
    currentTurn: 'white' | 'black';
    moveHistory: string[];
    status: string;
    check?: boolean;
    winner?: string;
  };
  playerColor: 'white' | 'black' | null;
  onMove: (from: string, to: string, promotion?: string) => void;
}

export default function ChessBoard({ gameState, playerColor, onMove }: ChessBoardProps) {
  const [moveFrom, setMoveFrom] = useState<string>('');
  const [moveTo, setMoveTo] = useState<string | null>(null);
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: string; to: string } | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, any>>({});
  const [rightClickedSquares, setRightClickedSquares] = useState<Record<string, any>>({});
  const { toast } = useToast();

  const chess = new Chess(gameState.fen);

  // Show check notification
  useEffect(() => {
    if (gameState.check && playerColor === gameState.currentTurn) {
      toast({
        title: "Check!",
        description: "Your king is in check. You must move to safety.",
        variant: "destructive",
      });
    }
  }, [gameState.check, gameState.currentTurn, playerColor, toast]);

  function onSquareClick(square: string) {
    const squareAsSquare = square as Square;
    
    // Don't allow moves if it's not the player's turn or game is not active
    if (playerColor !== gameState.currentTurn || gameState.status !== 'active') {
      return;
    }

    setRightClickedSquares({});

    // If no piece is selected
    if (!moveFrom) {
      const piece = chess.get(squareAsSquare);
      if (piece && piece.color === (playerColor === 'white' ? 'w' : 'b')) {
        setMoveFrom(square);
        getMoveOptions(square);
      }
      return;
    }

    // If clicking the same square, deselect
    if (moveFrom === square) {
      setMoveFrom('');
      setOptionSquares({});
      return;
    }

    // Validate the move
    const availableMoves = chess.moves({ square: moveFrom as Square, verbose: true });
    const validMove = availableMoves.find(m => m.to === square);
    
    if (validMove) {
      // Check if it's a promotion move
      if (validMove.flags.includes('p')) {
        setPendingPromotion({ from: moveFrom, to: square });
        setShowPromotionDialog(true);
        return;
      }
      // Make the valid move
      onMove(moveFrom, square, validMove.promotion);
    } else {
      // Invalid move - provide specific feedback
      const piece = chess.get(moveFrom as Square);
      const isInCheck = chess.inCheck();
      
      if (piece) {
        let errorMessage = `${piece.type.toUpperCase()} cannot move to ${square}.`;
        
        if (isInCheck) {
          errorMessage = "You're in check! You must move your king to safety or block the attack.";
        } else {
          // Check if the move would put own king in check
          try {
            const testChess = new Chess(gameState.fen);
            testChess.move({ from: moveFrom as Square, to: square as Square });
            if (testChess.inCheck()) {
              errorMessage = "This move would put your king in check.";
            }
          } catch (e) {
            // Move is simply invalid for this piece type
            errorMessage = `${piece.type.toUpperCase()} cannot move to ${square}. Check the movement rules for this piece.`;
          }
        }
        
        toast({
          title: "Invalid Move",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
    
    setMoveFrom('');
    setOptionSquares({});
  }

  function onSquareRightClick(square: string) {
    const colour = 'rgba(255, 255, 0, 0.4)';
    setRightClickedSquares({
      ...rightClickedSquares,
      [square]: rightClickedSquares[square] && rightClickedSquares[square].backgroundColor === colour
        ? undefined
        : { backgroundColor: colour }
    });
  }

  function getMoveOptions(square: string) {
    const squareAsSquare = square as Square;
    const moves = chess.moves({ square: squareAsSquare, verbose: true });
    if (moves.length === 0) {
      setOptionSquares({});
      return;
    }

    const newSquares: Record<string, any> = {};
    moves.map((move) => {
      newSquares[move.to] = {
        background: chess.get(move.to as Square) && chess.get(move.to as Square)?.color !== chess.get(squareAsSquare)?.color
          ? 'radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)'
          : 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
        borderRadius: '50%'
      };
      return move;
    });
    newSquares[square] = {
      background: 'rgba(255, 255, 0, 0.4)'
    };
    setOptionSquares(newSquares);
  }

  function onPromotionPieceSelect(piece: string) {
    if (pendingPromotion) {
      onMove(pendingPromotion.from, pendingPromotion.to, piece);
      setShowPromotionDialog(false);
      setPendingPromotion(null);
      setMoveFrom('');
      setOptionSquares({});
    }
  }

  return (
    <div className="gradient-border mx-auto w-fit">
      <div className="gradient-border-content p-4">
        <div className="relative">
          <Chessboard
            position={gameState.fen}
            onSquareClick={onSquareClick}
            onSquareRightClick={onSquareRightClick}
            boardOrientation={playerColor || 'white'}
            customSquareStyles={{
              ...optionSquares,
              ...rightClickedSquares
            }}
            customBoardStyle={{
              borderRadius: '8px',
              boxShadow: '0 5px 15px rgba(0, 0, 0, 0.5)'
            }}
            customDarkSquareStyle={{ backgroundColor: '#b58863' }}
            customLightSquareStyle={{ backgroundColor: '#f0d9b5' }}
            boardWidth={650}
            animationDuration={300}
            areArrowsAllowed={true}
            arePiecesDraggable={playerColor === gameState.currentTurn && gameState.status === 'active'}
            showBoardNotation={true}
            snapToCursor={true}
            dropOffBoardAction="bounce"
            onPieceDrop={(sourceSquare, targetSquare, piece) => {
              // Handle drag and drop moves
              if (playerColor !== gameState.currentTurn || gameState.status !== 'active') {
                toast({
                  title: "Not Your Turn",
                  description: "Wait for your opponent to make their move.",
                  variant: "default",
                });
                return false;
              }

              const sourceSquareTyped = sourceSquare as Square;
              const targetSquareTyped = targetSquare as Square;

              // Get all valid moves for the piece
              const validMoves = chess.moves({ square: sourceSquareTyped, verbose: true });
              const validMove = validMoves.find(m => m.to === targetSquare);
              
              if (!validMove) {
                // Invalid move - provide feedback
                const draggedPiece = chess.get(sourceSquareTyped);
                const isInCheck = chess.inCheck();
                
                let errorMessage = `Invalid move for ${draggedPiece?.type.toUpperCase()}.`;
                
                if (isInCheck) {
                  errorMessage = "You're in check! You must move your king to safety or block the attack.";
                } else {
                  // Check if the move would put own king in check
                  try {
                    const testChess = new Chess(gameState.fen);
                    testChess.move({ from: sourceSquareTyped, to: targetSquareTyped });
                    errorMessage = "This move would put your king in check.";
                  } catch (e) {
                    errorMessage = `${draggedPiece?.type.toUpperCase()} cannot move to ${targetSquare}.`;
                  }
                }
                
                toast({
                  title: "Invalid Move",
                  description: errorMessage,
                  variant: "destructive",
                });
                return false;
              }

              // Check if the move is a promotion
              if (validMove.flags.includes('p')) {
                setPendingPromotion({ from: sourceSquare, to: targetSquare });
                setShowPromotionDialog(true);
                return false; // Don't make the move yet, wait for promotion choice
              }

              // Valid move - execute it
              onMove(sourceSquare, targetSquare, validMove.promotion);
              return true;
            }}
          />

          {/* Promotion Dialog */}
          {showPromotionDialog && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center rounded-lg">
              <div className="bg-slate-800 p-6 rounded-xl border border-white/20">
                <h3 className="text-white text-lg font-semibold mb-4">Choose promotion piece</h3>
                <div className="flex space-x-4">
                  {['q', 'r', 'b', 'n'].map((piece) => (
                    <button
                      key={piece}
                      onClick={() => onPromotionPieceSelect(piece)}
                      className="w-16 h-16 bg-amber-100 hover:bg-amber-200 rounded-lg flex items-center justify-center text-3xl transition-colors"
                    >
                      {playerColor === 'white' 
                        ? { q: '♕', r: '♖', b: '♗', n: '♘' }[piece]
                        : { q: '♛', r: '♜', b: '♝', n: '♞' }[piece]
                      }
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Board Coordinates */}
        <div className="flex justify-between mt-2 px-1">
          {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(file => (
            <span key={file} className="text-slate-400 text-xs">{file}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
