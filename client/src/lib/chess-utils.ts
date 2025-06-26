export const chessPieceUnicode = {
  white: {
    king: '♔',
    queen: '♕',
    rook: '♖',
    bishop: '♗',
    knight: '♘',
    pawn: '♙'
  },
  black: {
    king: '♚',
    queen: '♛',
    rook: '♜',
    bishop: '♝',
    knight: '♞',
    pawn: '♟'
  }
} as const;

export function formatMoveTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function isValidRoomCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code);
}

export function formatGameResult(status: string, winner?: string): { title: string; message: string } {
  switch (status) {
    case 'checkmate':
      return {
        title: 'Checkmate!',
        message: `${winner === 'white' ? 'White' : 'Black'} wins by checkmate`
      };
    case 'draw':
      return {
        title: 'Draw!',
        message: 'Game ended in a draw'
      };
    case 'resigned':
      return {
        title: 'Game Over!',
        message: `${winner === 'white' ? 'White' : 'Black'} wins by resignation`
      };
    case 'timeout':
      return {
        title: 'Time Out!',
        message: `${winner === 'white' ? 'White' : 'Black'} wins on time`
      };
    default:
      return {
        title: 'Game Over!',
        message: 'Game has ended'
      };
  }
}

export function parseChessMove(moveString: string): { from: string; to: string; piece?: string; capture?: boolean } {
  // Basic parser for standard algebraic notation
  // This is a simplified version - chess.js handles the complex parsing
  const match = moveString.match(/([KQRBN])?([a-h])?([1-8])?x?([a-h][1-8])([=QRBN])?[+#]?/);
  
  if (!match) {
    return { from: '', to: moveString };
  }

  return {
    from: '',
    to: match[4] || moveString,
    piece: match[1],
    capture: moveString.includes('x')
  };
}
