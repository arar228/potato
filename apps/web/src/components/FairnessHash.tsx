interface FairnessHashProps {
  hash: string;
  label?: string;
}

export function FairnessHash({ hash, label = 'Hash' }: FairnessHashProps) {
  const compact = hash.length > 16 ? `${hash.slice(0, 8)}…${hash.slice(-6)}` : hash;
  return <span className="fairness-hash" title={hash}>{label}: {compact}</span>;
}
