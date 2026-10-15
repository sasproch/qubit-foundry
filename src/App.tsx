import { Fragment, useId, useState } from 'react';
import PairObservatory from './PairObservatory';
import { gateInfo, namedStates, puzzles, type Puzzle } from './puzzles';
import {
  applyGate, basisLabels, blochVector, concurrence, evaluateCircuit, matchesTarget, probabilities, relativePhases, runCircuit,
  type Complex, type Gate, type SingleState, type State,
} from './quantum';

const MAX_GATES = 8;
const percent = (value: number) => `${Math.round(value * 100)}%`;

function project(state: SingleState) {
  const { x, y, z } = blochVector(state);
  return { x: 160 + 88 * x - 50 * y, y: 147 + 25 * x + 44 * y - 105 * z };
}

function StateSphere({ state, target, preview }: { state: SingleState; target: SingleState; preview: SingleState | null }) {
  const gradientId = useId();
  const current = project(state);
  const goal = project(target);
  const ghost = preview ? project(preview) : null;
  return (
    <svg className="sphere" viewBox="0 0 320 300" role="img" aria-label="Bloch sphere: solid mint arrow is the current state; gold ring is the target; dashed purple arrow previews a gate">
      <defs>
        <radialGradient id={gradientId} cx="35%" cy="25%" r="75%">
          <stop offset="0%" stopColor="#284453" />
          <stop offset="100%" stopColor="#101d29" />
        </radialGradient>
      </defs>
      <circle cx="160" cy="147" r="108" fill={`url(#${gradientId})`} stroke="#4b6371" />
      <ellipse cx="160" cy="147" rx="106" ry="44" transform="rotate(16 160 147)" fill="none" stroke="#476070" />
      <ellipse cx="160" cy="147" rx="43" ry="107" transform="rotate(-20 160 147)" fill="none" stroke="#354d5c" />
      <path d="M160 34V260M52 116L267 178M100 198L222 95" stroke="#607786" strokeDasharray="3 5" opacity=".7" />
      <text x="169" y="27">0</text>
      <text x="170" y="280">1</text>
      <text x="259" y="199" className="axis-label">in phase</text>
      <text x="10" y="106" className="axis-label">opposite</text>
      <circle cx={goal.x} cy={goal.y} r="12" fill="none" stroke="#efc77b" strokeWidth="3" />
      <line x1="160" y1="147" x2={current.x} y2={current.y} stroke="#8de2ce" strokeWidth="4" strokeLinecap="round" />
      <circle cx={current.x} cy={current.y} r="6" fill="#8de2ce" />
      {ghost && <>
        <line x1="160" y1="147" x2={ghost.x} y2={ghost.y} stroke="#c7a8ff" strokeWidth="3" strokeDasharray="5 5" />
        <circle cx={ghost.x} cy={ghost.y} r="5" fill="#c7a8ff" />
      </>}
      <circle cx="160" cy="147" r="3" fill="#b0c5d0" />
    </svg>
  );
}

function QuantumView({ state, target, preview }: { state: State; target: State; preview: State | null }) {
  if (state.length === 4 && target.length === 4 && (!preview || preview.length === 4)) {
    return <PairObservatory state={state} target={target} preview={preview} />;
  }
  if (state.length === 2 && target.length === 2 && (!preview || preview.length === 2)) {
    return <>
      <StateSphere state={state} target={target} preview={preview} />
      <div className="legend"><span><i className="current-key" />Current</span><span><i className="target-key" />Target</span><span><i className="preview-key" />Preview</span></div>
      <p className="sphere-caption">A projected Bloch sphere: poles mean certain outcomes; the equator means equal probabilities. Direction around it carries relative phase.</p>
    </>;
  }
  throw new Error('The observatory cannot compare different qubit counts.');
}

function ProbabilityBars({ state, target, preview }: { state: State; target: State; preview: State | null }) {
  const values = probabilities(state);
  const targets = probabilities(target);
  const previews = preview ? probabilities(preview) : null;
  const labels = basisLabels(state);
  return (
    <div className="probabilities">
      {values.map((value, index) => (
        <div className="probability" key={index}>
          <div className="bar-label"><span>Measure {labels[index]}</span><strong>{percent(value)}</strong></div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: percent(value) }} />
            <span className="target-mark" style={{ left: `${1 + targets[index] * 98}%` }} />
          </div>
          {previews && <span className="preview-value">After gate: {percent(previews[index])}</span>}
        </div>
      ))}
    </div>
  );
}

function amplitude(value: Complex) {
  const clean = (part: number) => Math.abs(part) < 0.0005 ? 0 : Number(part.toFixed(3));
  const re = clean(value.re);
  const im = clean(value.im);
  if (!im) return String(re);
  if (!re) return `${im}i`;
  return `${re} ${im < 0 ? '-' : '+'} ${Math.abs(im)}i`;
}

function stateLabel(state: State) {
  return Object.values(namedStates).find(candidate => candidate.state.length === state.length && matchesTarget(state, candidate.state))?.label
    ?? (state.length === 4 ? concurrence(state) <= 1e-10 ? 'Product state' : 'Entangled state' : 'Other direction');
}

function stateExpression(state: State) {
  const labels = basisLabels(state);
  return state.map((value, index) => `(${amplitude(value)}) |${labels[index]}\u27e9`).join(' + ');
}

function GateSymbol({ gate }: { gate: Gate }) {
  const info = gateInfo[gate];
  return <span className={`gate-symbol gate-${info.family}`} data-gate={gate}>
    <span>{info.symbol}</span>{info.target && <small className="gate-target">{info.target}</small>}
  </span>;
}

function StateGlyph({ state }: { state: State }) {
  if (state.length === 4) {
    const values = probabilities(state);
    const phases = relativePhases(state);
    return <svg className="state-glyph joint-glyph" viewBox="0 0 40 40" aria-hidden="true">
      {values.map((value, index) => {
        const x = 11 + (index % 2) * 18;
        const y = 11 + Math.floor(index / 2) * 18;
        const radius = 6 * Math.sqrt(value);
        const phase = phases[index];
        return <g key={index}>
          <circle cx={x} cy={y} r="7" fill="#101a23" stroke="#354d5c" />
          {value > 1e-12 && <circle cx={x} cy={y} r={radius} fill="currentColor" fillOpacity=".35" />}
          {phase !== null && <line x1={x} y1={y} x2={x + radius * Math.cos(phase)} y2={y - radius * Math.sin(phase)} stroke="currentColor" strokeWidth="1.5" />}
        </g>;
      })}
    </svg>;
  }
  const point = project(state);
  return (
    <svg className="state-glyph" viewBox="0 0 40 40" aria-hidden="true">
      <circle cx="20" cy="20" r="14" fill="#101a23" stroke="#597180" />
      <ellipse cx="20" cy="20" rx="14" ry="5" fill="none" stroke="#354d5c" />
      <line x1="20" y1="20" x2={20 + (point.x - 160) * .12} y2={20 + (point.y - 147) * .12} stroke="currentColor" strokeWidth="2" />
      <circle cx={20 + (point.x - 160) * .12} cy={20 + (point.y - 147) * .12} r="2" fill="currentColor" />
    </svg>
  );
}

function TestBench({ puzzle, results, caseIndex, onSelect, finished, step, circuitLength }: {
  puzzle: Puzzle;
  results: ReturnType<typeof evaluateCircuit>;
  caseIndex: number;
  onSelect: (index: number) => void;
  finished: boolean;
  step: number;
  circuitLength: number;
}) {
  const passed = results.filter(result => result.matches).length;
  return (
    <section className="panel test-bench" aria-labelledby="bench-title">
      <div className="panel-heading">
        <span className="eyebrow">{puzzle.qubits === 2 ? 'Two-spin program' : 'Program specification'} / test bench</span>
        <span className="bench-summary">{finished ? `${passed} / ${results.length} passed` : circuitLength ? `Replay: ${step} / ${circuitLength} gates` : `${results.length} input cases ready`}</span>
      </div>
      <h2 id="bench-title">One circuit. Every input.</h2>
      <p className="bench-intro">Your program must satisfy every row, including the superpositions. Inspect a case to follow it in the observatory. Replay advances all cases together.</p>
      <table className="bench-table" aria-label="Program test cases">
        <thead><tr><th scope="col">Input</th><th scope="col">Expected output</th><th scope="col">Actual output</th><th scope="col">Result</th><th scope="col"><span className="sr-only">Inspect case</span></th></tr></thead>
        <tbody>
          {puzzle.cases.map((testCase, index) => (
            <tr key={testCase.id} data-case={testCase.id} className={caseIndex === index ? 'selected-case' : undefined}>
              <td data-label="Input"><span className="state-cell"><StateGlyph state={testCase.initial} /><span>{testCase.inputLabel}</span></span></td>
              <td data-label="Expected output"><span className="state-cell expected-state"><StateGlyph state={testCase.target} /><span>{testCase.targetLabel}</span></span></td>
              <td data-label="Actual output"><span className="state-cell actual-state"><StateGlyph state={results[index].output} /><span>{stateLabel(results[index].output)}</span></span></td>
              <td data-label="Result"><span className={`case-result ${finished ? results[index].matches ? 'pass' : 'fail' : 'pending'}`}>{finished ? results[index].matches ? 'PASS' : 'FAIL' : 'PENDING'}</span><small className="case-fidelity">{percent(results[index].fidelity)} match</small></td>
              <td><button className="inspect-button" aria-label={`Inspect ${testCase.inputLabel}`} aria-pressed={caseIndex === index} onClick={() => onSelect(index)}>{caseIndex === index ? 'Inspecting' : 'Inspect'}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="microcopy">Actual outputs show the current replay step. PASS / FAIL is awarded only at the end of a nonempty circuit. State comparisons include relative phase, not just probability bars.</p>
    </section>
  );
}

export default function App() {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [caseIndex, setCaseIndex] = useState(0);
  const [circuit, setCircuit] = useState<Gate[]>([]);
  const [step, setStep] = useState(0);
  const [previewGate, setPreviewGate] = useState<Gate | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [showHint, setShowHint] = useState(false);
  const puzzle = puzzles[puzzleIndex];
  const testCase = puzzle.cases[caseIndex];
  const results = evaluateCircuit(puzzle.cases, circuit.slice(0, step));
  const state = results[caseIndex].output;
  const preview = previewGate ? applyGate(runCircuit(testCase.initial, circuit), previewGate) : null;
  const finished = circuit.length > 0 && step === circuit.length;
  const solved = finished && results.every(result => result.matches);
  const isProgram = puzzle.kind === 'program';
  const passed = results.filter(result => result.matches).length;

  function editCircuit(gates: Gate[]) {
    setCircuit(gates);
    setStep(0);
    setPreviewGate(null);
  }

  function execute(nextStep: number, gates = circuit) {
    setStep(nextStep);
    setPreviewGate(null);
    if (gates.length > 0 && nextStep === gates.length && evaluateCircuit(puzzle.cases, gates).every(result => result.matches)) {
      setCompleted(previous => previous.includes(puzzle.id) ? previous : [...previous, puzzle.id]);
    }
  }

  function addGate(gate: Gate) {
    const next = [...circuit, gate];
    setCircuit(next);
    execute(next.length, next);
  }

  function selectPuzzle(index: number) {
    setPuzzleIndex(index);
    setCaseIndex(0);
    editCircuit([]);
    setShowHint(false);
  }

  function selectCase(index: number) {
    setCaseIndex(index);
    setPreviewGate(null);
  }

  function moveGate(index: number, direction: -1 | 1) {
    const next = [...circuit];
    const destination = index + direction;
    [next[index], next[destination]] = [next[destination], next[index]];
    editCircuit(next);
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="./" aria-label="Qubit Foundry home"><span className="brand-mark">qf</span> QUBIT FOUNDRY</a>
        <span className="build-tag">STATES / PROGRAMS / ENTANGLEMENT</span>
      </header>
      <main>
        <section className="intro">
          <div><p className="eyebrow">A small machine for quantum intuition</p><h1>Think in possibilities.<br /><span>Build with interference.</span></h1></div>
          <p>From one spin to entangled pairs.<br />Steer a state, program a transformation, then explore a joint quantum world. No physics degree required.</p>
        </section>

        <nav className="puzzle-nav" aria-label="Puzzles">
          {puzzles.map((item, index) => (
            <Fragment key={item.id}>
            {(index === 0 || puzzles[index - 1].qubits !== item.qubits || puzzles[index - 1].kind !== item.kind) &&
              <h2 className="chapter-heading">{item.qubits === 2 ? '03 / Two interacting spins' : item.kind === 'program' ? '02 / Programs across inputs' : '01 / Single-spin intuition'}</h2>}
            <button key={item.id} className={index === puzzleIndex ? 'puzzle-tab active' : 'puzzle-tab'} aria-current={index === puzzleIndex ? 'step' : undefined} onClick={() => selectPuzzle(index)}>
              <span className="tab-number">{completed.includes(item.id) ? '\u2713' : String(index + 1).padStart(2, '0')}</span>
              <span><small>{item.qubits === 2 ? 'Two spins / ' : item.kind === 'program' ? 'Program / ' : 'Lab / '}{item.concept}</small><strong>{item.title}</strong></span>
            </button>
            </Fragment>
          ))}
        </nav>

        <div className={`workbench ${isProgram ? 'program-workbench' : ''}`}>
          {isProgram && <TestBench puzzle={puzzle} results={results} caseIndex={caseIndex} onSelect={selectCase} finished={finished} step={step} circuitLength={circuit.length} />}
          <section className="panel circuit-panel" aria-labelledby="puzzle-title">
            <div className="panel-heading"><span className="eyebrow">Your assignment</span><span className="muted">{String(puzzleIndex + 1).padStart(2, '0')} / {String(puzzles.length).padStart(2, '0')}</span></div>
            <h2 id="puzzle-title">{puzzle.title}</h2>
            <p className="brief">{puzzle.brief}</p>
            <div className="target-summary"><span className="target-dot" />{isProgram ? 'CASE TARGET' : 'TARGET'} <strong>{testCase.targetLabel}</strong></div>

            <div className="section-heading"><h3>Operator shelf</h3><span>Click to add & apply</span></div>
            <div className="gate-shelf">
              {puzzle.gates.map(gate => (
                <button key={gate} className="gate-card" aria-label={`Add ${gateInfo[gate].label} gate`} disabled={circuit.length >= MAX_GATES}
                  onMouseEnter={() => setPreviewGate(gate)} onMouseLeave={() => setPreviewGate(null)}
                  onFocus={() => setPreviewGate(gate)} onBlur={() => setPreviewGate(null)}
                  onClick={() => addGate(gate)}>
                  <GateSymbol gate={gate} />
                  <span><strong>{gateInfo[gate].name}</strong><small>{gateInfo[gate].description}</small></span>
                  <span className="add-symbol" aria-hidden="true">+</span>
                </button>
              ))}
            </div>
            <p className="microcopy">Each added operator applies immediately. Hover or focus to preview appending it to your circuit.</p>

            <div className="section-heading"><h3>Your circuit</h3><span>{circuit.length} / {MAX_GATES} gates</span></div>
            <div className="circuit" aria-label="Circuit, applied left to right">
              <span className="input-label" aria-label={`Input: ${testCase.inputLabel}`}>IN<br /><strong>{testCase.inputSymbol}</strong></span>
              {circuit.length === 0 ? <p className="empty-circuit">Add an operator to begin</p> : (
                <ol className="circuit-gates">
                  {circuit.map((gate, index) => (
                    <li key={index} className={index < step ? 'gate-slot executed' : 'gate-slot'}>
                      <GateSymbol gate={gate} />
                      <span className="gate-index">{index + 1}</span>
                      <div className="gate-tools">
                        <button aria-label={`Move gate ${index + 1} left`} disabled={index === 0} onClick={() => moveGate(index, -1)}>{'\u2190'}</button>
                        <button aria-label={`Remove gate ${index + 1}`} onClick={() => editCircuit(circuit.filter((_, itemIndex) => itemIndex !== index))}>{'\u00d7'}</button>
                        <button aria-label={`Move gate ${index + 1} right`} disabled={index === circuit.length - 1} onClick={() => moveGate(index, 1)}>{'\u2192'}</button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <div className="transport">
              <button className="primary" disabled={!circuit.length || finished} onClick={() => execute(circuit.length)}>Run circuit <span aria-hidden="true">{'\u2192'}</span></button>
              <button className="secondary" disabled={!circuit.length || finished} onClick={() => execute(step + 1)}>Step</button>
              <button className="quiet" disabled={!step} onClick={() => { setStep(0); setPreviewGate(null); }}>Rewind</button>
              <button className="quiet" disabled={!circuit.length} onClick={() => editCircuit([])}>Clear</button>
            </div>
            <p className="microcopy">Applied {step} of {circuit.length} gates. Moving or removing gates rewinds the state. Adding a gate runs the updated circuit to the end.</p>
            <div className={`result ${solved ? 'success' : ''}`} role="status" aria-live="polite">
              {solved ? <><strong>{isProgram ? 'All inputs passed.' : 'Target reached.'}</strong><p>{puzzle.discovery}</p>{puzzleIndex < puzzles.length - 1
                ? <button className="text-button" onClick={() => selectPuzzle(puzzleIndex + 1)}>Next puzzle {'\u2192'}</button>
                : <p className="graduation">{completed.length === puzzles.length ? 'Foundry complete.' : 'Program mastered.'} Try removing or rearranging a gate to explain why this circuit works for every input.</p>}</>
                : finished ? <><strong>{isProgram ? 'Some inputs still fail.' : 'Not quite the target.'}</strong><p>{isProgram ? `${passed} of ${puzzle.cases.length} cases passed. Inspect a failed row, then rewind and step through it. The program must pass every case, not just the selected one.` : 'Compare the arrow with the gold ring. Change the circuit and try again.'}</p></>
                : <><strong>Experiment, then observe.</strong><p>Add an operator to see its effect immediately. Rewind, then Step or Run circuit to replay your sequence.</p></>}
            </div>
            <button className="text-button hint-toggle" aria-expanded={showHint} aria-controls="puzzle-hint" onClick={() => setShowHint(!showHint)}>{showHint ? 'Hide hint' : 'Need a nudge?'}</button>
            {showHint && <p id="puzzle-hint" className="hint">{puzzle.hint}</p>}
          </section>

          <section className="panel state-panel" aria-labelledby="state-title">
            <div className="panel-heading"><span className="eyebrow">State observatory</span><span className="live-indicator">{puzzle.qubits}-QUBIT SIMULATION</span></div>
            {isProgram && <p className="inspection-label">Inspecting input: <strong>{testCase.inputLabel}</strong></p>}
            <div className="state-title"><h2 id="state-title">{puzzle.qubits === 2 ? 'See the joint state.' : 'See the whole state.'}</h2><span className="match-value">{percent(results[caseIndex].fidelity)}<small>{isProgram ? 'case match' : 'target match'}</small></span></div>
            <QuantumView state={state} target={testCase.target} preview={preview} />
            <h3>{puzzle.qubits === 2 ? 'If you measured both spins now' : 'If you measured now'}</h3>
            <ProbabilityBars state={state} target={testCase.target} preview={preview} />
            <p className="microcopy">Exact probabilities, not sampled measurements. Gold ticks mark the target. Matching bars alone is not enough: phase matters.</p>
            <div className="preview-note" aria-live="polite">{previewGate ? <><strong>{gateInfo[previewGate].label} preview:</strong> {gateInfo[previewGate].description}</> : 'Preview an operator to ask: what would change next?'}</div>
            <details className="math-details">
              <summary>Under the hood: amplitudes & notation</summary>
              <p>{puzzle.qubits === 2 ? 'A two-qubit pure state has four complex amplitudes in the order |00>, |01>, |10>, |11>, with A first and B second.' : 'A qubit has two complex amplitudes.'} Squaring their magnitudes gives measurement probabilities; their relative phase controls interference.</p>
              <code>Input: {stateExpression(testCase.initial)}</code>
              <code>Current: {stateExpression(state)}</code>
              <code>Target: {stateExpression(testCase.target)}</code>
              <p>Target match is the squared magnitude of the states' inner product (fidelity). States differing only by a global phase count as the same physical state.</p>
              {puzzle.qubits === 2 && <p>For normalized pure states, entanglement strength is concurrence: 2 |a00 a11 - a01 a10|. Zero means a product state, one means maximal entanglement. This is not the probability of being entangled. The full vector is pure even when either spin alone has a mixed reduced state.</p>}
              <p>This simulator uses ideal pure states of one or two qubits. It does not sample measurement collapse, noise, or mixed joint-state evolution.</p>
            </details>
          </section>
        </div>
      </main>
      <footer><span>QUBIT FOUNDRY <span className="muted">/ first principles, hands on</span></span><span>{completed.length} / {puzzles.length} discoveries made <span className="muted">(this session)</span></span></footer>
    </div>
  );
}
