import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Scissors, Hand, Square } from 'lucide-react';

const GameClient = () => {
  const [ws, setWs] = useState(null);
  const [gameState, setGameState] = useState('connecting');
  const [message, setMessage] = useState('Connecting to game server...');
  const [result, setResult] = useState(null);
  const [selectedMove, setSelectedMove] = useState(null);
  const [error, setError] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

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
      
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        setWs(new WebSocket(wsUrl));
      }, 3000);
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
    switch (data.type) {
      case 'GAME_START':
        setGameState('playing');
        setMessage('Game started! Make your move.');
        setError(null);
        break;
      case 'GAME_RESULT':
        setIsAnimating(true);
        setTimeout(() => {
          setGameState('result');
          setResult(data);
          setMessage(getResultMessage(data));
          setIsAnimating(false);
          
          // Reset for next round
          setTimeout(() => {
            setGameState('waiting');
            setMessage('Waiting for next game...');
            setResult(null);
            setSelectedMove(null);
          }, 3000);
        }, 1000);
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

  const getStatusColor = () => {
    switch (gameState) {
      case 'connecting': return 'text-yellow-500';
      case 'waiting': return 'text-blue-500';
      case 'playing': return 'text-green-500';
      case 'result': return 'text-purple-500';
      default: return '';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Rock Paper Scissors</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="text-center mb-6">
          <p className={`text-lg font-medium ${getStatusColor()}`}>{message}</p>
        </div>

        <div className={`grid grid-cols-3 gap-4 ${isAnimating ? 'animate-bounce' : ''}`}>
          {Object.entries(moveIcons).map(([move, icon]) => (
            <Button
              key={move}
              onClick={() => makeMove(move)}
              disabled={gameState !== 'playing' || selectedMove}
              variant={selectedMove === move ? 'secondary' : 'default'}
              className={`h-24 flex flex-col items-center justify-center gap-2 
                ${selectedMove === move ? 'ring-2 ring-offset-2 ring-blue-500' : ''}
                transition-all duration-200 hover:scale-105`}
            >
              {icon}
              <span className="text-sm">{move}</span>
            </Button>
          ))}
        </div>

        {result && (
          <div className="mt-6 space-y-2">
            <div className="flex justify-between items-center p-4 bg-gray-100 rounded-lg">
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
      </CardContent>
    </Card>
  );
};

export default GameClient;