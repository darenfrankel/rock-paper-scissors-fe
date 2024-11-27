import React, { useState, useEffect, useCallback } from 'react';
import { Scissors, Hand, Square } from 'lucide-react';

const GameClient = () => {
  const [ws, setWs] = useState(null);
  const [gameState, setGameState] = useState('connecting');
  const [message, setMessage] = useState('Connecting to game server...');
  const [result, setResult] = useState(null);
  const [selectedMove, setSelectedMove] = useState(null);
  const [error, setError] = useState(null);
  
  const handleMessage = useCallback((data) => {
    console.log('Received WebSocket message:', data);
    try {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      
      switch (parsedData.type) {
        case 'GAME_START':
          console.log('Game start received:', parsedData);
          setGameState('playing');
          setMessage('Game started! Make your move.');
          setError(null);
          break;
        case 'GAME_RESULT':
          console.log('Game result received:', parsedData);
          setGameState('result');
          setResult(parsedData);
          setMessage(getResultMessage(parsedData));
          setTimeout(() => {
            setGameState('waiting');
            setMessage('Waiting for next game...');
            setResult(null);
            setSelectedMove(null);
          }, 3000);
          break;
        default:
          console.log('Unknown message type:', parsedData);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }, []);

  useEffect(() => {
    const wsUrl = process.env.REACT_APP_WEBSOCKET_URL;
    console.log('Connecting to WebSocket:', wsUrl);
    
    const websocket = new WebSocket(wsUrl);

    websocket.onopen = () => {
      console.log('WebSocket connected');
      setGameState('waiting');
      setMessage('Waiting for opponent...');
      setError(null);
    };

    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setGameState('connecting');
      setMessage('Connection lost. Reconnecting...');
      setError('Connection to game server lost');
    };

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Error connecting to game server');
    };

    websocket.onmessage = (event) => {
      console.log('Raw WebSocket message received:', event.data);
      handleMessage(event.data);
    };

    setWs(websocket);

    return () => {
      if (websocket) {
        websocket.close();
      }
    };
  }, [handleMessage]);

  const moveIcons = {
    ROCK: <Square className="w-8 h-8" />,
    PAPER: <Hand className="w-8 h-8" />,
    SCISSORS: <Scissors className="w-8 h-8" />
  };

  const makeMove = (move) => {
    if (gameState !== 'playing' || selectedMove) return;
    
    console.log('Making move:', move);
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