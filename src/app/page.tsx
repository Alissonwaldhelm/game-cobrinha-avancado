"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Zap, Bomb, Droplet, Heart, Trophy, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Position = { x: number; y: number };
type Direction = "UP" | "DOWN" | "LEFT" | "RIGHT";
type PowerUpType = "dash" | "explosive" | "venom";

interface Enemy {
  id: string;
  position: Position;
  speed: number;
}

interface Food {
  id: string;
  position: Position;
}

interface PowerUp {
  id: string;
  type: PowerUpType;
  position: Position;
}

const GRID_SIZE = 20;
const CELL_SIZE = 20;
const INITIAL_SPEED = 150;
const DASH_SPEED = 50;

export default function SnakeGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [lives, setLives] = useState(3);
  
  const [snake, setSnake] = useState<Position[]>([{ x: 10, y: 10 }]);
  const [direction, setDirection] = useState<Direction>("RIGHT");
  const [nextDirection, setNextDirection] = useState<Direction>("RIGHT");
  
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [food, setFood] = useState<Food[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [activePowerUp, setActivePowerUp] = useState<PowerUpType | null>(null);
  const [isDashing, setIsDashing] = useState(false);
  const [shake, setShake] = useState(false);

  const speedRef = useRef(INITIAL_SPEED);

  // Initialize game
  const initializeGame = useCallback(() => {
    setSnake([{ x: 10, y: 10 }]);
    setDirection("RIGHT");
    setNextDirection("RIGHT");
    setScore(0);
    setMultiplier(1);
    setLives(3);
    setGameOver(false);
    setActivePowerUp(null);
    setIsDashing(false);
    speedRef.current = INITIAL_SPEED;

    // Spawn initial enemies
    const initialEnemies: Enemy[] = Array.from({ length: 3 }, (_, i) => ({
      id: `enemy-${i}`,
      position: {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      },
      speed: 0.5,
    }));
    setEnemies(initialEnemies);

    // Spawn initial food
    spawnFood();
    
    // Spawn power-ups
    spawnPowerUp();
  }, []);

  const spawnFood = () => {
    const newFood: Food = {
      id: `food-${Date.now()}`,
      position: {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      },
    };
    setFood((prev) => [...prev, newFood]);
  };

  const spawnPowerUp = () => {
    const types: PowerUpType[] = ["dash", "explosive", "venom"];
    const newPowerUp: PowerUp = {
      id: `powerup-${Date.now()}`,
      type: types[Math.floor(Math.random() * types.length)],
      position: {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      },
    };
    setPowerUps((prev) => [...prev, newPowerUp]);
  };

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!gameStarted || gameOver) return;

      switch (e.key) {
        case "ArrowUp":
          if (direction !== "DOWN") setNextDirection("UP");
          break;
        case "ArrowDown":
          if (direction !== "UP") setNextDirection("DOWN");
          break;
        case "ArrowLeft":
          if (direction !== "RIGHT") setNextDirection("LEFT");
          break;
        case "ArrowRight":
          if (direction !== "LEFT") setNextDirection("RIGHT");
          break;
        case " ":
          e.preventDefault();
          executePowerUp();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [gameStarted, gameOver, direction, activePowerUp]);

  const executePowerUp = () => {
    if (!activePowerUp) return;

    switch (activePowerUp) {
      case "dash":
        setIsDashing(true);
        speedRef.current = DASH_SPEED;
        setTimeout(() => {
          setIsDashing(false);
          speedRef.current = INITIAL_SPEED;
        }, 1000);
        break;
      case "explosive":
        // Clear enemies in radius
        setEnemies((prev) =>
          prev.filter((enemy) => {
            const dist = Math.abs(enemy.position.x - snake[0].x) + Math.abs(enemy.position.y - snake[0].y);
            return dist > 3;
          })
        );
        setScore((prev) => prev + 50 * multiplier);
        break;
      case "venom":
        // Leave trail that damages enemies
        setMultiplier((prev) => prev + 1);
        setTimeout(() => setMultiplier(1), 5000);
        break;
    }
    setActivePowerUp(null);
  };

  const checkCollision = (pos: Position, target: Position): boolean => {
    return pos.x === target.x && pos.y === target.y;
  };

  const takeDamage = () => {
    setLives((prev) => {
      const newLives = prev - 1;
      if (newLives <= 0) {
        setGameOver(true);
      }
      return newLives;
    });
    setShake(true);
    setTimeout(() => setShake(false), 300);
  };

  // Game loop
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const gameLoop = setInterval(() => {
      setDirection(nextDirection);

      setSnake((prevSnake) => {
        const head = prevSnake[0];
        let newHead: Position;

        switch (nextDirection) {
          case "UP":
            newHead = { x: head.x, y: (head.y - 1 + GRID_SIZE) % GRID_SIZE };
            break;
          case "DOWN":
            newHead = { x: head.x, y: (head.y + 1) % GRID_SIZE };
            break;
          case "LEFT":
            newHead = { x: (head.x - 1 + GRID_SIZE) % GRID_SIZE, y: head.y };
            break;
          case "RIGHT":
            newHead = { x: (head.x + 1) % GRID_SIZE, y: head.y };
            break;
        }

        // Check collision with own tail
        const hitTail = prevSnake.some((segment, index) => 
          index > 0 && checkCollision(newHead, segment)
        );
        
        if (hitTail) {
          takeDamage();
        }

        // Check collision with enemies
        enemies.forEach((enemy) => {
          if (checkCollision(newHead, enemy.position) && !isDashing) {
            takeDamage();
          }
        });

        // Check collision with food FIRST (before creating new snake)
        const eatenFood = food.find((f) => checkCollision(newHead, f.position));
        
        if (eatenFood) {
          setFood((prevFood) => prevFood.filter((f) => f.id !== eatenFood.id));
          setScore((prev) => prev + 20 * multiplier);
          setTimeout(spawnFood, 2000);
        }

        // Check collision with power-ups
        setPowerUps((prevPowerUps) => {
          const collectedPowerUp = prevPowerUps.find((pu) =>
            checkCollision(newHead, pu.position)
          );
          if (collectedPowerUp) {
            setActivePowerUp(collectedPowerUp.type);
            setScore((prev) => prev + 10 * multiplier);
            setTimeout(spawnPowerUp, 3000);
            return prevPowerUps.filter((pu) => pu.id !== collectedPowerUp.id);
          }
          return prevPowerUps;
        });

        const newSnake = [newHead, ...prevSnake];
        
        // Grow snake if ate food, otherwise remove tail
        if (eatenFood) {
          return newSnake; // Keep full length (grows)
        }
        
        return newSnake.slice(0, -1); // Remove tail (doesn't grow)
      });

      // Move enemies
      setEnemies((prevEnemies) =>
        prevEnemies.map((enemy) => {
          const head = snake[0];
          const dx = head.x - enemy.position.x;
          const dy = head.y - enemy.position.y;

          let newX = enemy.position.x;
          let newY = enemy.position.y;

          if (Math.random() < enemy.speed) {
            if (Math.abs(dx) > Math.abs(dy)) {
              newX += dx > 0 ? 1 : -1;
            } else {
              newY += dy > 0 ? 1 : -1;
            }
          }

          return {
            ...enemy,
            position: {
              x: (newX + GRID_SIZE) % GRID_SIZE,
              y: (newY + GRID_SIZE) % GRID_SIZE,
            },
          };
        })
      );
    }, speedRef.current);

    return () => clearInterval(gameLoop);
  }, [gameStarted, gameOver, nextDirection, enemies, snake, isDashing, multiplier, food]);

  // Render game
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, GRID_SIZE * CELL_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(GRID_SIZE * CELL_SIZE, i * CELL_SIZE);
      ctx.stroke();
    }

    // Draw food
    food.forEach((f) => {
      const gradient = ctx.createRadialGradient(
        f.position.x * CELL_SIZE + CELL_SIZE / 2,
        f.position.y * CELL_SIZE + CELL_SIZE / 2,
        0,
        f.position.x * CELL_SIZE + CELL_SIZE / 2,
        f.position.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2
      );
      gradient.addColorStop(0, "#22c55e");
      gradient.addColorStop(1, "#16a34a");
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(
        f.position.x * CELL_SIZE + CELL_SIZE / 2,
        f.position.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2 - 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });

    // Draw power-ups
    powerUps.forEach((powerUp) => {
      const gradient = ctx.createRadialGradient(
        powerUp.position.x * CELL_SIZE + CELL_SIZE / 2,
        powerUp.position.y * CELL_SIZE + CELL_SIZE / 2,
        0,
        powerUp.position.x * CELL_SIZE + CELL_SIZE / 2,
        powerUp.position.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2
      );
      
      if (powerUp.type === "dash") {
        gradient.addColorStop(0, "#fbbf24");
        gradient.addColorStop(1, "#f59e0b");
      } else if (powerUp.type === "explosive") {
        gradient.addColorStop(0, "#ef4444");
        gradient.addColorStop(1, "#dc2626");
      } else {
        gradient.addColorStop(0, "#10b981");
        gradient.addColorStop(1, "#059669");
      }
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(
        powerUp.position.x * CELL_SIZE + CELL_SIZE / 2,
        powerUp.position.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2 - 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    });

    // Draw enemies
    enemies.forEach((enemy) => {
      const gradient = ctx.createRadialGradient(
        enemy.position.x * CELL_SIZE + CELL_SIZE / 2,
        enemy.position.y * CELL_SIZE + CELL_SIZE / 2,
        0,
        enemy.position.x * CELL_SIZE + CELL_SIZE / 2,
        enemy.position.y * CELL_SIZE + CELL_SIZE / 2,
        CELL_SIZE / 2
      );
      gradient.addColorStop(0, "#dc2626");
      gradient.addColorStop(1, "#991b1b");
      ctx.fillStyle = gradient;
      ctx.fillRect(
        enemy.position.x * CELL_SIZE + 2,
        enemy.position.y * CELL_SIZE + 2,
        CELL_SIZE - 4,
        CELL_SIZE - 4
      );
    });

    // Draw snake with white color
    snake.forEach((segment, index) => {
      // White color for snake
      ctx.fillStyle = isDashing ? "#fbbf24" : "#ffffff";

      // Head with rounded corners
      if (index === 0) {
        ctx.beginPath();
        const x = segment.x * CELL_SIZE + 1;
        const y = segment.y * CELL_SIZE + 1;
        const width = CELL_SIZE - 2;
        const height = CELL_SIZE - 2;
        const radius = 8;

        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();

        // Draw eyes on head
        ctx.fillStyle = "#000000";
        const eyeSize = 3;
        const eyeOffset = 6;
        
        if (direction === "RIGHT") {
          ctx.beginPath();
          ctx.arc(segment.x * CELL_SIZE + CELL_SIZE - eyeOffset, segment.y * CELL_SIZE + 7, eyeSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(segment.x * CELL_SIZE + CELL_SIZE - eyeOffset, segment.y * CELL_SIZE + CELL_SIZE - 7, eyeSize, 0, Math.PI * 2);
          ctx.fill();
        } else if (direction === "LEFT") {
          ctx.beginPath();
          ctx.arc(segment.x * CELL_SIZE + eyeOffset, segment.y * CELL_SIZE + 7, eyeSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(segment.x * CELL_SIZE + eyeOffset, segment.y * CELL_SIZE + CELL_SIZE - 7, eyeSize, 0, Math.PI * 2);
          ctx.fill();
        } else if (direction === "UP") {
          ctx.beginPath();
          ctx.arc(segment.x * CELL_SIZE + 7, segment.y * CELL_SIZE + eyeOffset, eyeSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(segment.x * CELL_SIZE + CELL_SIZE - 7, segment.y * CELL_SIZE + eyeOffset, eyeSize, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(segment.x * CELL_SIZE + 7, segment.y * CELL_SIZE + CELL_SIZE - eyeOffset, eyeSize, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(segment.x * CELL_SIZE + CELL_SIZE - 7, segment.y * CELL_SIZE + CELL_SIZE - eyeOffset, eyeSize, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Body segments with rounded corners
        ctx.beginPath();
        const x = segment.x * CELL_SIZE + 1;
        const y = segment.y * CELL_SIZE + 1;
        const width = CELL_SIZE - 2;
        const height = CELL_SIZE - 2;
        const radius = 4;

        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.fill();
      }
    });
  }, [snake, enemies, food, powerUps, direction, isDashing]);

  const startGame = () => {
    initializeGame();
    setGameStarted(true);
  };

  const restartGame = () => {
    initializeGame();
    setGameStarted(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300 mb-2">
            🐍 Snake Game
          </h1>
          <p className="text-gray-400 text-sm">Use as setas para mover • Espaço para usar power-up</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 text-yellow-400 mb-1">
              <Trophy className="w-4 h-4" />
              <span className="text-xs font-medium">Pontos</span>
            </div>
            <p className="text-2xl font-bold text-white">{score}</p>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 text-purple-400 mb-1">
              <Zap className="w-4 h-4" />
              <span className="text-xs font-medium">Multiplicador</span>
            </div>
            <p className="text-2xl font-bold text-white">x{multiplier}</p>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 text-red-400 mb-1">
              <Heart className="w-4 h-4" />
              <span className="text-xs font-medium">Vidas</span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <Heart
                  key={i}
                  className={`w-6 h-6 ${
                    i < lives ? "fill-red-500 text-red-500" : "text-gray-600"
                  }`}
                />
              ))}
            </div>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 text-blue-400 mb-1">
              <span className="text-xs font-medium">Power-Up</span>
            </div>
            <div className="flex items-center gap-2">
              {activePowerUp === "dash" && (
                <>
                  <Zap className="w-6 h-6 text-yellow-400" />
                  <span className="text-sm text-white">Dash</span>
                </>
              )}
              {activePowerUp === "explosive" && (
                <>
                  <Bomb className="w-6 h-6 text-red-400" />
                  <span className="text-sm text-white">Explosivo</span>
                </>
              )}
              {activePowerUp === "venom" && (
                <>
                  <Droplet className="w-6 h-6 text-green-400" />
                  <span className="text-sm text-white">Veneno</span>
                </>
              )}
              {!activePowerUp && (
                <span className="text-sm text-gray-500">Nenhum</span>
              )}
            </div>
          </div>
        </div>

        {/* Game Canvas */}
        <div className="relative">
          <div
            className={`bg-gray-900 rounded-2xl border-4 border-gray-700 overflow-hidden shadow-2xl transition-transform ${
              shake ? "animate-shake" : ""
            }`}
          >
            <canvas
              ref={canvasRef}
              width={GRID_SIZE * CELL_SIZE}
              height={GRID_SIZE * CELL_SIZE}
              className="w-full h-auto"
            />
          </div>

          {/* Game Over / Start Overlay */}
          {(!gameStarted || gameOver) && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <div className="text-center space-y-6 p-8">
                {gameOver ? (
                  <>
                    <h2 className="text-4xl font-bold text-red-500 mb-2">Game Over!</h2>
                    <p className="text-2xl text-white">Pontuação Final: {score}</p>
                    <p className="text-lg text-gray-400">Tamanho da Cobra: {snake.length}</p>
                    <Button
                      onClick={restartGame}
                      size="lg"
                      className="bg-gradient-to-r from-white to-gray-300 hover:from-gray-200 hover:to-gray-400 text-gray-900 font-bold"
                    >
                      <RotateCcw className="w-5 h-5 mr-2" />
                      Jogar Novamente
                    </Button>
                  </>
                ) : (
                  <>
                    <h2 className="text-4xl font-bold text-white mb-4">Pronto para jogar?</h2>
                    <div className="space-y-3 text-left bg-gray-800/50 rounded-xl p-6 mb-6">
                      <p className="text-gray-300">
                        🍎 <strong>Coma a comida verde</strong> para crescer
                      </p>
                      <p className="text-gray-300">
                        ⚠️ <strong>Não bata na sua cauda</strong> ou você perde uma vida
                      </p>
                      <p className="text-gray-300 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-400" />
                        <span><strong>Dash:</strong> Velocidade extrema por 1 segundo</span>
                      </p>
                      <p className="text-gray-300 flex items-center gap-2">
                        <Bomb className="w-5 h-5 text-red-400" />
                        <span><strong>Explosivo:</strong> Elimina inimigos próximos</span>
                      </p>
                      <p className="text-gray-300 flex items-center gap-2">
                        <Droplet className="w-5 h-5 text-green-400" />
                        <span><strong>Veneno:</strong> Aumenta multiplicador por 5s</span>
                      </p>
                    </div>
                    <Button
                      onClick={startGame}
                      size="lg"
                      className="bg-gradient-to-r from-white to-gray-300 hover:from-gray-200 hover:to-gray-400 text-gray-900 font-bold"
                    >
                      <Play className="w-5 h-5 mr-2" />
                      Começar Jogo
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2 bg-gray-800/30 rounded-lg p-3">
            <div className="w-4 h-4 bg-white rounded-lg"></div>
            <span className="text-gray-300">Cobra</span>
          </div>
          <div className="flex items-center gap-2 bg-gray-800/30 rounded-lg p-3">
            <div className="w-4 h-4 bg-gradient-to-br from-green-500 to-green-600 rounded-full"></div>
            <span className="text-gray-300">Comida</span>
          </div>
          <div className="flex items-center gap-2 bg-gray-800/30 rounded-lg p-3">
            <div className="w-4 h-4 bg-gradient-to-br from-red-600 to-red-800 rounded"></div>
            <span className="text-gray-300">Inimigos</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}
