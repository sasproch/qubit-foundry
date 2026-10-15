import { basisLabels, concurrence, marginals, probabilities, relativePhases, type PairState } from './quantum';

const percent = (value: number) => `${Math.round(value * 100)}%`;
const stateKind = (value: number) => value <= 1e-10 ? 'Product state' : 'Entangled state';

function PhaseVector({ angle, radius, color, dashed = false }: { angle: number | null; radius: number; color: string; dashed?: boolean }) {
  if (angle === null) return null;
  const x = 32 + radius * Math.cos(angle);
  const y = 32 - radius * Math.sin(angle);
  return <>
    <line x1="32" y1="32" x2={x} y2={y} stroke={color} strokeWidth="2" strokeDasharray={dashed ? '3 2' : undefined} />
    <circle cx={x} cy={y} r="2" fill={color} />
  </>;
}

export default function PairObservatory({ state, target, preview }: { state: PairState; target: PairState; preview: PairState | null }) {
  const values = probabilities(state);
  const goals = probabilities(target);
  const previews = preview ? probabilities(preview) : null;
  const phases = relativePhases(state);
  const goalPhases = relativePhases(target);
  const previewPhases = preview ? relativePhases(preview) : null;
  const strength = concurrence(state);
  const local = marginals(state);
  const same = values[0] + values[3];

  return (
    <div className="pair-observatory">
      <div className="entanglement-summary">
        <strong className="state-kind">{stateKind(strength)}</strong>
        <span className="entanglement-strength">{percent(strength)} entanglement strength</span>
      </div>
      <div className="entanglement-track" aria-hidden="true"><span style={{ width: percent(strength) }} /></div>
      {preview && <p className="pair-preview-kind">If appended: {stateKind(concurrence(preview)).toLowerCase()} ({percent(concurrence(preview))} strength)</p>}
      <h3>Joint amplitude map</h3>
      <p className="joint-axis-note">A is the first bit; B is the second. Disk area shows probability; arrows show relative phase.</p>
      <div className="joint-grid">
        {basisLabels(state).map((label, index) => (
          <div className="joint-cell" data-basis={label} key={label}>
            <span className="joint-outcome">{label}</span>
            <svg viewBox="0 0 64 64" role="img" aria-label={`Outcome ${label}: ${percent(values[index])} probability; ${phases[index] === null ? 'no amplitude' : `${Math.round(phases[index] * 180 / Math.PI) % 360} degrees relative phase`}`}>
              <circle cx="32" cy="32" r="25" fill="#101a23" stroke="#354d5c" />
              {values[index] > 1e-12 && <circle cx="32" cy="32" r={22 * Math.sqrt(values[index])} fill="#8de2ce" fillOpacity=".22" />}
              {goals[index] > 1e-12 && <circle cx="32" cy="32" r={22 * Math.sqrt(goals[index])} fill="none" stroke="#efc77b" strokeWidth="1.5" strokeDasharray="3 2" />}
              <PhaseVector angle={goalPhases[index]} radius={22 * Math.sqrt(goals[index])} color="#efc77b" dashed />
              <PhaseVector angle={phases[index]} radius={22 * Math.sqrt(values[index])} color="#8de2ce" />
              {previews && previewPhases && <PhaseVector angle={previewPhases[index]} radius={22 * Math.sqrt(previews[index])} color="#c7a8ff" dashed />}
            </svg>
            <strong className="joint-probability">{percent(values[index])}</strong>
            <span className="joint-phase">{phases[index] === null ? 'No amplitude' : `Phase ${Math.round(phases[index] * 180 / Math.PI) % 360}\u00b0`}</span>
            {previews && <span className="joint-preview">After gate: {percent(previews[index])}</span>}
          </div>
        ))}
      </div>
      <div className="legend"><span><i className="current-key" />Current</span><span><i className="target-key" />Target</span><span><i className="preview-key" />Preview</span></div>
      <p className="joint-phase-note">Phase is relative to each state's first nonzero amplitude. A global phase changes nothing; empty amplitudes have no phase.</p>
      <div className="correlation-summary">
        <span>Same outcomes <strong>{percent(same)}</strong></span>
        <span>Different outcomes <strong>{percent(1 - same)}</strong></span>
      </div>
      <h3>Each spin, viewed alone</h3>
      <div className="marginal-grid">
        {(['A', 'B'] as const).map(spin => <div className="marginal-card" data-spin={spin} key={spin}>
          <strong>Spin {spin}</strong>
          <span>0: <b>{percent(local[spin][0])}</b> / 1: <b>{percent(local[spin][1])}</b></span>
        </div>)}
      </div>
      <p className="microcopy">Local probabilities are not separate pure states. Entanglement and phase belong to the joint state. Correlations alone do not certify entanglement; the strength here is calculated from the full pure-state amplitudes, not sampled outcomes.</p>
    </div>
  );
}
