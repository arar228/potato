import { motion, useReducedMotion } from 'framer-motion';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import type { FairnessProofDto } from '@night-arcade/shared';
import { FairnessHash } from '../../components/FairnessHash';
import { LoadingSkeleton } from '../../components/LoadingSkeleton';
import { useFairnessProof } from './use-fairness';
import { verifyFairnessProof } from './verify-fairness';

export function FairnessPage() {
  const { roundId } = useParams();
  const proof = useFairnessProof(roundId);
  const reducedMotion = useReducedMotion();
  const [verification, setVerification] = useState<'IDLE' | 'CHECKING' | 'VALID' | 'INVALID'>('IDLE');
  const motionPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).has('motionPreview');
  const previewProof: FairnessProofDto = {
    roundId: '11111111-1111-4111-8111-111111111111',
    gameId: '22222222-2222-4222-8222-222222222222',
    gameType: 'COIN_FLIP',
    algorithm: 'HMAC_SHA256',
    serverSeedHash: 'a8ae6e6ee929abea3afcfc5258c8ccd6f85273e0d4626d26c7279f3250f77c8e',
    serverSeed: '0123456789abcdef'.repeat(4),
    clientSeed: '44444444-4444-4444-8444-444444444444',
    nonce: 0,
    fairValue: 6_752,
    selection: 'HEADS',
    result: 'HEADS',
    createdAt: '2026-08-30T00:00:00.000Z',
    revealedAt: '2026-08-30T00:00:01.000Z',
  };

  if (!motionPreview && proof.isPending) return <LoadingSkeleton className="fairness-loading" />;
  if (!motionPreview && !proof.data) return <div className="fairness-error"><h1>Доказательство недоступно</h1><p>Проверьте соединение и повторите позже.</p></div>;

  const data = motionPreview ? previewProof : proof.data as FairnessProofDto;
  const verify = async () => {
    setVerification('CHECKING');
    setVerification(await verifyFairnessProof(data) ? 'VALID' : 'INVALID');
  };

  return (
    <div className="fairness-page">
      <header className="fairness-hero">
        <span>PROVABLY FAIR</span>
        <h1>Проверка раунда</h1>
        <p>Результат рассчитан сервером через HMAC-SHA256 и может быть проверен прямо на устройстве.</p>
      </header>

      <section className="fairness-card">
        <div><small>Game ID</small><code>{data.roundId}</code></div>
        <div><small>Server seed hash</small><code>{data.serverSeedHash}</code></div>
        <div><small>Client seed</small><code>{data.clientSeed}</code></div>
        <div className="fairness-card__split"><span><small>Nonce</small><strong>{data.nonce}</strong></span><span><small>Fair value</small><strong>{data.fairValue}</strong></span></div>
        <div className="fairness-card__split"><span><small>Выбор</small><strong>{data.selection}</strong></span><span><small>Результат</small><strong>{data.result}</strong></span></div>
        <div><small>Revealed server seed</small><code>{data.serverSeed}</code></div>
      </section>

      <FairnessHash hash={data.serverSeedHash} label="Commitment" />
      <motion.button className={`fairness-verify fairness-verify--${verification.toLowerCase()}`} type="button" disabled={verification === 'CHECKING'} onClick={() => void verify()} whileTap={reducedMotion ? {} : { scale: .98 }}>
        {verification === 'CHECKING' ? 'Проверяем…' : verification === 'VALID' ? '✓ Раунд подтверждён' : verification === 'INVALID' ? 'Проверка не пройдена' : 'Verify'}
      </motion.button>
      <p className="fairness-note">Проверка выполняется локально. Server seed перед ставкой был скрыт его SHA-256 хэшем.</p>
    </div>
  );
}
