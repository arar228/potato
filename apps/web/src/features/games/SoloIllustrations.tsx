export function DailyMachineIllustration() {
  return <img className="daily-machine-card-art" src="/assets/daily-freebie-machine-v2.png" alt="" />;
}

const balls = ['🐤', '🐥', '🦉', '🐦', '🐧', '🦅', '🐣'];

export function PoolIllustration() {
  return (
    <div className="mini-pool-table">
      <i className="pocket pocket--tl" /><i className="pocket pocket--tr" /><i className="pocket pocket--bl" /><i className="pocket pocket--br" />
      <div className="pool-balls">
        {balls.map((ball, index) => <span key={ball} style={{ '--ball-index': index } as React.CSSProperties}>{ball}</span>)}
      </div>
      <div className="cue-line" />
      <div className="cue-ball">🐣</div>
    </div>
  );
}

export function CoinIllustration() {
  return (
    <div className="hero-coin">
      <div className="hero-coin__rim"><span>🐥</span></div>
      <i className="coin-spark coin-spark--one" /><i className="coin-spark coin-spark--two" /><i className="coin-spark coin-spark--three" />
    </div>
  );
}
