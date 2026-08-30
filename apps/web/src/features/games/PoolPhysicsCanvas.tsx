import { useEffect, useRef } from 'react';
import {
  Bodies,
  Body,
  Composite,
  Engine,
  type Body as MatterBody,
} from 'matter-js';
import type { PoolResultDto } from '@night-arcade/shared';

const width = 300;
const height = 400;
const ballRadius = 13;
const ballColors = ['#ff5147', '#ffd24d', '#9c62ed', '#ff8f2e', '#3d9be9', '#f6f3dd'] as const;
const ballFaces = ['🐤', '🐥', '🦉', '🐦', '🐧', '🦅'] as const;
const pocketCenters = [
  { x: 7, y: 8 }, { x: 293, y: 8 }, { x: 5, y: 200 },
  { x: 295, y: 200 }, { x: 8, y: 392 }, { x: 292, y: 392 },
] as const;
const rackPositions = [
  { x: 150, y: 116 },
  { x: 136, y: 142 }, { x: 164, y: 142 },
  { x: 122, y: 168 }, { x: 150, y: 168 }, { x: 178, y: 168 },
] as const;

interface VisualBall {
  body: MatterBody;
  color: string;
  label: string;
  isCue: boolean;
  shouldSink: boolean;
  targetPocket: number;
  sinkStartedAt: number | null;
}

function shuffledIndices(seed: number): number[] {
  const indices = [0, 1, 2, 3, 4, 5];
  let state = seed || 1;
  for (let index = indices.length - 1; index > 0; index -= 1) {
    state = (state * 1_664_525 + 1_013_904_223) >>> 0;
    const target = state % (index + 1);
    const currentValue = indices[index];
    const targetValue = indices[target];
    if (currentValue !== undefined && targetValue !== undefined) {
      indices[index] = targetValue;
      indices[target] = currentValue;
    }
  }
  return indices;
}

function drawBall(
  context: CanvasRenderingContext2D,
  ball: VisualBall,
  now: number,
): void {
  const sinkProgress = ball.sinkStartedAt === null ? 0 : Math.min(1, (now - ball.sinkStartedAt) / 220);
  if (sinkProgress >= 1) return;
  const scale = 1 - sinkProgress * .82;
  const { x, y } = ball.body.position;

  context.save();
  context.translate(x, y);
  context.rotate(ball.body.angle);
  context.scale(scale, scale);
  context.beginPath();
  context.ellipse(2, 6, ballRadius * .82, ballRadius * .42, 0, 0, Math.PI * 2);
  context.fillStyle = 'rgba(0, 28, 18, .28)';
  context.fill();

  const gradient = context.createRadialGradient(-4, -5, 1, 0, 0, ballRadius);
  gradient.addColorStop(0, '#ffffff');
  gradient.addColorStop(.16, ball.color);
  gradient.addColorStop(.72, ball.color);
  gradient.addColorStop(1, '#13242a');
  context.beginPath();
  context.arc(0, 0, ballRadius, 0, Math.PI * 2);
  context.fillStyle = gradient;
  context.fill();
  context.lineWidth = 1.5;
  context.strokeStyle = 'rgba(255,255,255,.72)';
  context.stroke();

  context.beginPath();
  context.arc(0, 0, 5.5, 0, Math.PI * 2);
  context.fillStyle = ball.isCue ? 'rgba(255,255,255,.15)' : 'rgba(255,255,255,.88)';
  context.fill();
  context.fillStyle = ball.isCue ? '#d3a832' : '#24333a';
  context.font = ball.isCue ? '15px "Apple Color Emoji","Segoe UI Emoji"' : '14px "Apple Color Emoji","Segoe UI Emoji"';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(ball.label, 0, .5);
  context.restore();
}

function beginSink(ball: VisualBall, now: number): void {
  if (ball.sinkStartedAt !== null) return;
  ball.sinkStartedAt = now;
  Body.setVelocity(ball.body, { x: 0, y: 0 });
  Body.setAngularVelocity(ball.body, 0);
  ball.body.collisionFilter.mask = 0;
  Body.setStatic(ball.body, true);
}

export function PoolPhysicsCanvas({ result, reducedMotion }: {
  result: PoolResultDto | null;
  reducedMotion: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) return undefined;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    const context = canvas.getContext('2d');
    if (context === null) return undefined;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const engine = Engine.create({ gravity: { x: 0, y: 0 } });
    engine.positionIterations = 9;
    engine.velocityIterations = 8;
    const walls = [
      Bodies.rectangle(width / 2, -8, width + 24, 20, { isStatic: true, restitution: .94 }),
      Bodies.rectangle(width / 2, height + 8, width + 24, 20, { isStatic: true, restitution: .94 }),
      Bodies.rectangle(-8, height / 2, 20, height + 24, { isStatic: true, restitution: .94 }),
      Bodies.rectangle(width + 8, height / 2, 20, height + 24, { isStatic: true, restitution: .94 }),
    ];
    const lossPottedCount = result === null ? 0 : 1 + result.trajectorySeed % 4;
    const lossOrder = shuffledIndices(result?.trajectorySeed ?? 1);
    const lossPotted = new Set(lossOrder.slice(0, lossPottedCount));
    const balls: VisualBall[] = rackPositions.map((position, index) => {
      const body = Bodies.circle(position.x, position.y, ballRadius, {
        restitution: .96,
        friction: .006,
        frictionAir: .008,
        density: .0022,
        slop: .01,
      });
      return {
        body,
        color: ballColors[index] ?? '#ffffff',
        label: ballFaces[index] ?? '🐦',
        isCue: false,
        shouldSink: result?.win === true || lossPotted.has(index),
        targetPocket: result === null ? index : (result.targetPocket + index) % 6,
        sinkStartedAt: null,
      };
    });
    const cueBody = Bodies.circle(150, 330, ballRadius, {
      restitution: .93,
      friction: .004,
      frictionAir: .011,
      density: .0024,
      slop: .01,
    });
    const cueBall: VisualBall = {
      body: cueBody,
      color: '#f4f7f5',
      label: '🐣',
      isCue: true,
      shouldSink: result !== null && !result.win && result.trajectorySeed % 3 === 0,
      targetPocket: result?.targetPocket ?? 4,
      sinkStartedAt: null,
    };
    const allBalls = [...balls, cueBall];
    Composite.add(engine.world, [...walls, ...allBalls.map((ball) => ball.body)]);

    let animationFrame = 0;
    let previousTime = performance.now();
    const startedAt = previousTime;
    let shotApplied = false;

    const render = (now: number) => {
      const delta = Math.min(24, now - previousTime);
      previousTime = now;
      const speedMultiplier = reducedMotion ? 2.4 : 1;
      const elapsed = (now - startedAt) * speedMultiplier;

      if (result !== null) {
        if (!shotApplied && elapsed >= 420) {
          shotApplied = true;
          const sideSpin = result.trajectorySeed % 9 - 4;
          Body.setVelocity(cueBody, { x: sideSpin * .11, y: -13.8 });
          Body.setAngularVelocity(cueBody, sideSpin * .015);
        }

        if (elapsed >= 1_080) {
          for (const ball of allBalls) {
            if (!ball.shouldSink || ball.sinkStartedAt !== null) continue;
            const pocket = pocketCenters[ball.targetPocket] ?? pocketCenters[0];
            const offsetX = pocket.x - ball.body.position.x;
            const offsetY = pocket.y - ball.body.position.y;
            const distance = Math.hypot(offsetX, offsetY);
            if (distance < 20 || elapsed >= 3_250) {
              beginSink(ball, now);
              continue;
            }
            const magnetStrength = elapsed < 1_700 ? .085 : elapsed < 2_500 ? .14 : .24;
            const desiredSpeed = elapsed < 1_700 ? 4.8 : 7.3;
            const desiredX = offsetX / distance * desiredSpeed;
            const desiredY = offsetY / distance * desiredSpeed;
            Body.setVelocity(ball.body, {
              x: ball.body.velocity.x * (1 - magnetStrength) + desiredX * magnetStrength,
              y: ball.body.velocity.y * (1 - magnetStrength) + desiredY * magnetStrength,
            });
          }
        }
      }

      Engine.update(engine, delta);
      context.clearRect(0, 0, width, height);
      for (const ball of allBalls) drawBall(context, ball, now);
      animationFrame = window.requestAnimationFrame(render);
    };

    animationFrame = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(animationFrame);
      Composite.clear(engine.world, false);
      Engine.clear(engine);
    };
  }, [reducedMotion, result]);

  return <canvas ref={canvasRef} className="pool-physics-canvas" aria-hidden="true" />;
}
