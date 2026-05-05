/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, RefreshCw, Play, Pause, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

// --- Constants ---
const GRID_SIZE = 20;
const INITIAL_SNAKE = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION = { x: 0, y: -1 };
const BASE_SPEED = 150;
const SPEED_INCREMENT = 2;
const MIN_SPEED = 60;

type Point = { x: number; y: number };

export default function App() {
  // Game State
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Point>(INITIAL_DIRECTION);
  const [nextDirection, setNextDirection] = useState<Point>(INITIAL_DIRECTION);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'>('IDLE');
  const [speed, setSpeed] = useState(BASE_SPEED);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);

  // Load High Score
  useEffect(() => {
    const saved = localStorage.getItem('neon-snake-high-score');
    if (saved) setHighScore(parseInt(saved, 10));
  }, []);

  // Update High Score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('neon-snake-high-score', score.toString());
    }
  }, [score, highScore]);

  // --- Game Logic ---

  const generateFood = useCallback((currentSnake: Point[]): Point => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      // Check if food spawned on snake
      const onSnake = currentSnake.some(seg => seg.x === newFood.x && seg.y === newFood.y);
      if (!onSnake) break;
    }
    return newFood;
  }, []);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setNextDirection(INITIAL_DIRECTION);
    setScore(0);
    setGameState('PLAYING');
    setSpeed(BASE_SPEED);
    setFood(generateFood(INITIAL_SNAKE));
    lastUpdateTimeRef.current = performance.now();
  };

  const togglePause = () => {
    if (gameState === 'PLAYING') setGameState('PAUSED');
    else if (gameState === 'PAUSED') setGameState('PLAYING');
  };

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        if (direction.y === 0) setNextDirection({ x: 0, y: -1 });
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        if (direction.y === 0) setNextDirection({ x: 0, y: 1 });
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        if (direction.x === 0) setNextDirection({ x: -1, y: 0 });
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        if (direction.x === 0) setNextDirection({ x: 1, y: 0 });
        break;
      case ' ':
        togglePause();
        break;
    }
  }, [direction, gameState]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  const moveSnake = useCallback(() => {
    setSnake(prevSnake => {
      const head = prevSnake[0];
      const newHead = {
        x: head.x + nextDirection.x,
        y: head.y + nextDirection.y,
      };

      setDirection(nextDirection);

      // Check Wall Collision
      if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
        setGameState('GAME_OVER');
        return prevSnake;
      }

      // Check Self Collision
      if (prevSnake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
        setGameState('GAME_OVER');
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Check Food Collision
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + 10);
        setFood(generateFood(newSnake));
        setSpeed(prev => Math.max(MIN_SPEED, prev - SPEED_INCREMENT));
        // Don't pop tail if eating
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [nextDirection, food, generateFood]);

  // --- Rendering ---

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width / GRID_SIZE;

    // Clear background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid (Subtle)
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * size, 0);
      ctx.lineTo(i * size, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * size);
      ctx.lineTo(canvas.width, i * size);
      ctx.stroke();
    }

    // Draw Food
    ctx.fillStyle = '#ff00ff';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff00ff';
    ctx.beginPath();
    ctx.arc(
      food.x * size + size / 2,
      food.y * size + size / 2,
      size / 2.5,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw Snake
    snake.forEach((seg, i) => {
      const isHead = i === 0;
      ctx.fillStyle = isHead ? '#00ffaa' : '#00ff55';
      ctx.shadowBlur = isHead ? 20 : 10;
      ctx.shadowColor = '#00ff55';
      
      const padding = 1.5;
      ctx.fillRect(
        seg.x * size + padding,
        seg.y * size + padding,
        size - padding * 2,
        size - padding * 2
      );
    });
    ctx.shadowBlur = 0;
  }, [snake, food]);

  useEffect(() => {
    const loop = (time: number) => {
      if (gameState === 'PLAYING') {
        const deltaTime = time - lastUpdateTimeRef.current;
        if (deltaTime > speed) {
          moveSnake();
          lastUpdateTimeRef.current = time;
        }
      }
      draw();
      gameLoopRef.current = requestAnimationFrame(loop);
    };

    gameLoopRef.current = requestAnimationFrame(loop);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameState, speed, moveSnake, draw]);

  // Fix canvas size
  useEffect(() => {
    const updateSize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;
      
      const minDim = Math.min(parent.clientWidth - 40, 500);
      canvas.width = minDim;
      canvas.height = minDim;
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col items-center justify-center p-4 overflow-hidden select-none">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#00ff55] opacity-[0.03] rounded-full blur-[120px]" />
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.02]" 
             style={{ backgroundImage: 'radial-gradient(#00ff55 1px, transparent 0)', backgroundSize: '40px 40px' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="z-10 w-full max-w-lg flex flex-col items-center gap-6"
      >
        {/* Header/HUD */}
        <div className="w-full flex justify-between items-end px-4 border-b border-white/10 pb-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-4xl font-black tracking-tighter uppercase leading-none text-white flex items-center gap-2">
              Neon<span className="text-[#00ff55]">Snake</span>
            </h1>
            <div className="flex items-center gap-2 text-xs font-mono text-white/40 uppercase tracking-widest">
              <span>Ready for input</span>
              <div className="w-1.5 h-1.5 rounded-full bg-[#00ff55] animate-pulse" />
            </div>
          </div>
          <div className="flex gap-6">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#00ff55]">Score</span>
              <span className="text-3xl font-mono leading-none tracking-tighter">{score.toString().padStart(4, '0')}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase font-bold tracking-widest text-white/30">Best</span>
              <div className="flex items-center gap-2">
                <Trophy size={14} className="text-yellow-500" />
                <span className="text-2xl font-mono leading-none tracking-tighter text-white/50">{highScore.toString().padStart(4, '0')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Game Container */}
        <div className="relative group">
          <canvas 
            ref={canvasRef}
            className="rounded-lg border-4 border border-white/5 shadow-[0_0_50px_rgba(0,255,85,0.05)] cursor-none"
          />
          
          <AnimatePresence>
            {(gameState === 'IDLE' || gameState === 'PAUSED' || gameState === 'GAME_OVER') && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-[2px] rounded-lg border border-white/10"
              >
                {gameState === 'IDLE' && (
                  <div className="flex flex-col items-center gap-6 p-8">
                    <div className="text-center">
                      <p className="text-sm font-mono text-white/40 uppercase tracking-[0.2em] mb-2">Initialize System</p>
                      <h2 className="text-5xl font-black italic uppercase tracking-tight leading-none text-white">Press Play</h2>
                    </div>
                    <button 
                      onClick={resetGame}
                      className="group relative px-10 py-4 bg-[#00ff55] text-black font-black uppercase tracking-widest text-xl rounded-sm hover:-translate-y-1 transition-transform active:translate-y-0"
                    >
                      <div className="absolute inset-0 bg-[#00ff55] blur-xl opacity-40 group-hover:opacity-80 transition-opacity" />
                      <span className="relative flex items-center gap-3">
                        <Play fill="black" /> START GAME
                      </span>
                    </button>
                    <div className="mt-4 grid grid-cols-2 gap-8 text-[10px] font-mono text-white/25 uppercase tracking-widest">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex gap-1">
                          <kbd className="px-2 py-1 border border-white/20 rounded">W</kbd>
                          <kbd className="px-2 py-1 border border-white/20 rounded">A</kbd>
                          <kbd className="px-2 py-1 border border-white/20 rounded">S</kbd>
                          <kbd className="px-2 py-1 border border-white/20 rounded">D</kbd>
                        </div>
                        <span>Move</span>
                      </div>
                      <div className="flex flex-col items-center gap-2 text-center">
                        <kbd className="px-4 py-1 border border-white/20 rounded w-full">SPACE</kbd>
                        <span>Pause</span>
                      </div>
                    </div>
                  </div>
                )}

                {gameState === 'PAUSED' && (
                  <div className="flex flex-col items-center gap-4">
                    <h2 className="text-4xl font-black italic uppercase tracking-tight text-white flex items-center gap-3">
                      <Pause size={40} fill="white" /> Paused
                    </h2>
                    <button 
                      onClick={togglePause}
                      className="px-8 py-3 bg-white text-black font-bold uppercase tracking-widest text-sm rounded-sm"
                    >
                      Resume
                    </button>
                  </div>
                )}

                {gameState === 'GAME_OVER' && (
                  <div className="flex flex-col items-center gap-6 p-8">
                    <div className="text-center">
                      <p className="text-sm font-mono text-red-500 uppercase tracking-[0.2em] mb-2">System Failure</p>
                      <h2 className="text-6xl font-black italic uppercase tracking-tighter leading-none text-white">Game Over</h2>
                    </div>
                    <div className="flex flex-col items-center">
                       <span className="text-xs font-mono text-white/40 uppercase tracking-widest">Final Score</span>
                       <span className="text-5xl font-mono tracking-tighter text-[#00ff55]">{score.toString().padStart(4, '0')}</span>
                    </div>
                    <button 
                      onClick={resetGame}
                      className="group relative px-10 py-4 bg-white text-black font-black uppercase tracking-widest text-xl rounded-sm"
                    >
                      <div className="absolute inset-0 bg-white blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                      <span className="relative flex items-center gap-3">
                        <RefreshCw size={24} /> RESTART
                      </span>
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile Controls */}
        <div className="md:hidden grid grid-cols-3 gap-2 w-full max-w-[200px] mt-4">
          <div />
          <button onClick={() => setNextDirection(d => d.y === 0 ? { x: 0, y: -1 } : d)} className="p-4 bg-white/5 rounded-lg active:bg-white/10 flex items-center justify-center">
            <ChevronUp />
          </button>
          <div />
          <button onClick={() => setNextDirection(d => d.x === 0 ? { x: -1, y: 0 } : d)} className="p-4 bg-white/5 rounded-lg active:bg-white/10 flex items-center justify-center">
            <ChevronLeft />
          </button>
          <button onClick={togglePause} className="p-4 bg-white/5 rounded-lg active:bg-white/10 flex items-center justify-center">
            {gameState === 'PAUSED' ? <Play size={20} fill="white" /> : <Pause size={20} fill="white" />}
          </button>
          <button onClick={() => setNextDirection(d => d.x === 0 ? { x: 1, y: 0 } : d)} className="p-4 bg-white/5 rounded-lg active:bg-white/10 flex items-center justify-center">
            <ChevronRight />
          </button>
          <div />
          <button onClick={() => setNextDirection(d => d.y === 0 ? { x: 0, y: 1 } : d)} className="p-4 bg-white/5 rounded-lg active:bg-white/10 flex items-center justify-center">
            <ChevronDown />
          </button>
          <div />
        </div>

        {/* Footer */}
        <div className="mt-8 flex gap-8 text-[10px] font-mono uppercase tracking-[0.3em] text-white/20 font-medium">
          <span>v1.0.4-stable</span>
          <span className="hidden sm:inline">// system_neon_engine</span>
          <span>© 2024 AI Studio Build</span>
        </div>
      </motion.div>
    </div>
  );
}
