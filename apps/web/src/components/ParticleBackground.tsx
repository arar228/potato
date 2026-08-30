const particles = [
  [8, 12, 2], [24, 5, 1], [44, 14, 1], [70, 7, 2], [91, 18, 1],
  [13, 38, 1], [35, 30, 2], [58, 42, 1], [82, 35, 1], [96, 51, 2],
  [6, 65, 1], [29, 73, 1], [52, 61, 2], [73, 78, 1], [89, 68, 1],
  [18, 92, 2], [47, 88, 1], [66, 96, 1], [94, 90, 2],
] as const;

export function ParticleBackground() {
  return (
    <div className="particle-background" aria-hidden="true">
      {particles.map(([left, top, size], index) => (
        <i key={`${left}-${top}`} style={{ left: `${left}%`, top: `${top}%`, width: size, height: size, animationDelay: `${(index % 6) * -0.7}s` }} />
      ))}
    </div>
  );
}
