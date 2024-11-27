import React, { useState, useEffect, useCallback } from 'react';
import { Scissors, Hand, Square } from 'lucide-react';

const GameClient = () => {
  const [ws, setWs] = useState(null);
  const [gameState, setGameState] = useState('connecting');
  const [message, setMessage] = useState('Connecting to game server...');
  const [result, setResult] = useState(null);
  const [selectedMove, setSelectedMove] = useState(null);
  const [error, setError] = useState(null);

  const moveIcons = {
    ROCK: <Square className="w-8 h-8" />,
    PAPER: <Hand className="w-8 h-8" />,
    SCISSORS: <Scissors className="w-8 h-8" />
  };

  useEffect(() => {
    const wsUrl = process.env.REACT_APP_WEBSOCKET_URL;
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      setGameState('waiting');
      setMessage('Waiting for opponent...');
      setError(null);
    };

    websocket.onclose = () => {
      setGameState('connecting');
      setMessage('Connection lost. Reconnecting...');
      setError('Connection to game server lost');
    };

    websocket.onerror = (error) => {
      setError('Error connecting to game server');
      console.error('WebSocket error:', error);
    };

    websocket.onmessage = (event) => handleMessage(JSON.parse(event.data));

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

const handleMessage = useCallback((data) => {
  console.log('Received WebSocket message:', data);
  switch (data.type) {
      case 'PING':
          console.log('Received ping');
          break;
      case 'GAME_START':
          console.log('Game start received:', data);
          setGameState('playing');
          setMessage('Game started! Make your move.');
          setError(null);
          break;
      case 'GAME_RESULT':
          console.log('Game result received:', data);
          setGameState('result');
          setResult(data);
          setMessage(getResultMessage(data));
          setTimeout(() => {
              setGameState('waiting');
              setMessage('Waiting for next game...');
              setResult(null);
              setSelectedMove(null);
          }, 3000);
          break;
      default:
          console.log('Unknown message type:', data);
  }
}, []);

  const makeMove = (move) => {
    if (gameState !== 'playing' || selectedMove) return;
    
    setSelectedMove(move);
    ws?.send(JSON.stringify({
      action: 'move',
      move: move
    }));
    setMessage('Waiting for opponent...');
  };

  const getResultMessage = (result) => {
    if (result.winner === 'TIE') return 'It\'s a tie!';
    if (result.winner === 'PLAYER1') return 'You won! 🎉';
    return 'Opponent won!';
  };

  return (
    <div className="max-w-md mx-auto p-4 bg-white shadow rounded">
      <h2 className="text-center text-2xl font-bold mb-4">Rock Paper Scissors</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="text-center mb-6">
        <p className="text-lg font-medium">{message}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {Object.entries(moveIcons).map(([move, icon]) => (
          <button
            key={move}
            onClick={() => makeMove(move)}
            disabled={gameState !== 'playing' || selectedMove}
            className={`h-24 flex flex-col items-center justify-center gap-2 p-4 rounded
              ${selectedMove === move ? 'bg-blue-100' : 'bg-gray-100'}
              ${gameState === 'playing' && !selectedMove ? 'hover:bg-gray-200' : ''}
              disabled:opacity-50`}
          >
            {icon}
            <span className="text-sm">{move}</span>
          </button>
        ))}
      </div>

      {result && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <div className="flex justify-between items-center">
            <div className="text-center">
              <p className="text-sm text-gray-600">Your move</p>
              <div className="mt-1">{moveIcons[result.moves.player1]}</div>
            </div>
            <div className="text-2xl font-bold">VS</div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Opponent's move</p>
              <div className="mt-1">{moveIcons[result.moves.player2]}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameClient;