export type Complex = Readonly<{ re: number; im: number }>;
export type SingleState = readonly [Complex, Complex];
export type PairState = readonly [Complex, Complex, Complex, Complex];
export type State = SingleState | PairState;
export type SingleGate = 'X' | 'H' | 'Z';
export type PairGate = 'X_A' | 'H_A' | 'Z_A' | 'X_B' | 'H_B' | 'Z_B' | 'CNOT_AB' | 'CNOT_BA';
export type Gate = SingleGate | PairGate;

export const ZERO: SingleState = [{ re: 1, im: 0 }, { re: 0, im: 0 }];
export const ONE: SingleState = [{ re: 0, im: 0 }, { re: 1, im: 0 }];
export const PLUS: SingleState = [
  { re: Math.SQRT1_2, im: 0 },
  { re: Math.SQRT1_2, im: 0 },
];
export const MINUS: SingleState = [
  { re: Math.SQRT1_2, im: 0 },
  { re: -Math.SQRT1_2, im: 0 },
];

export interface CircuitTestCase {
  initial: State;
  target: State;
}

const magnitudeSquared = (value: Complex) => value.re ** 2 + value.im ** 2;
const multiply = (a: Complex, b: Complex): Complex => ({
  re: a.re * b.re - a.im * b.im,
  im: a.re * b.im + a.im * b.re,
});

export function tensorProduct(a: SingleState, b: SingleState): PairState {
  return [multiply(a[0], b[0]), multiply(a[0], b[1]), multiply(a[1], b[0]), multiply(a[1], b[1])];
}

function applySingleGate(state: SingleState, gate: SingleGate): SingleState {
  const [a, b] = state;
  switch (gate) {
    case 'X':
      return [b, a];
    case 'Z':
      return [a, { re: -b.re, im: -b.im }];
    case 'H':
      return [
        { re: (a.re + b.re) * Math.SQRT1_2, im: (a.im + b.im) * Math.SQRT1_2 },
        { re: (a.re - b.re) * Math.SQRT1_2, im: (a.im - b.im) * Math.SQRT1_2 },
      ];
    default:
      throw new Error(`Unsupported gate: ${String(gate)}`);
  }
}

function applyLocalGate(state: PairState, gate: SingleGate, target: 'A' | 'B'): PairState {
  if (target === 'A') {
    const first = applySingleGate([state[0], state[2]], gate);
    const second = applySingleGate([state[1], state[3]], gate);
    return [first[0], second[0], first[1], second[1]];
  }
  const first = applySingleGate([state[0], state[1]], gate);
  const second = applySingleGate([state[2], state[3]], gate);
  return [first[0], first[1], second[0], second[1]];
}

export function applyGate(state: SingleState, gate: SingleGate): SingleState;
export function applyGate(state: PairState, gate: PairGate): PairState;
export function applyGate(state: State, gate: Gate): State;
export function applyGate(state: State, gate: Gate): State {
  if (state.length === 2) {
    if (gate !== 'X' && gate !== 'H' && gate !== 'Z') {
      throw new Error(`Gate ${gate} requires two qubits.`);
    }
    return applySingleGate(state, gate);
  }
  // A is the first bit: amplitudes are ordered 00, 01, 10, 11.
  switch (gate) {
    case 'X_A': return applyLocalGate(state, 'X', 'A');
    case 'H_A': return applyLocalGate(state, 'H', 'A');
    case 'Z_A': return applyLocalGate(state, 'Z', 'A');
    case 'X_B': return applyLocalGate(state, 'X', 'B');
    case 'H_B': return applyLocalGate(state, 'H', 'B');
    case 'Z_B': return applyLocalGate(state, 'Z', 'B');
    case 'CNOT_AB': return [state[0], state[1], state[3], state[2]];
    case 'CNOT_BA': return [state[0], state[3], state[2], state[1]];
    default: throw new Error(`Gate ${gate} needs an explicit A or B target for two qubits.`);
  }
}

export function runCircuit(initial: SingleState, gates: readonly SingleGate[]): SingleState;
export function runCircuit(initial: PairState, gates: readonly PairGate[]): PairState;
export function runCircuit(initial: State, gates: readonly Gate[]): State;
export function runCircuit(initial: State, gates: readonly Gate[]): State {
  return gates.reduce<State>((state, gate) => applyGate(state, gate), initial);
}

export function probabilities(state: State): readonly number[] {
  return state.map(magnitudeSquared);
}

export function basisLabels(state: State): string[] {
  return state.map((_, index) => index.toString(2).padStart(state.length === 4 ? 2 : 1, '0'));
}

export function blochVector(state: SingleState) {
  const [a, b] = state;
  return {
    x: 2 * (a.re * b.re + a.im * b.im),
    y: 2 * (a.re * b.im - a.im * b.re),
    z: magnitudeSquared(a) - magnitudeSquared(b),
  };
}

export function fidelity(state: State, target: State): number {
  if (state.length !== target.length) throw new Error('Cannot compare states with different qubit counts.');
  let re = 0;
  let im = 0;
  state.forEach((value, index) => {
    re += value.re * target[index].re + value.im * target[index].im;
    im += value.re * target[index].im - value.im * target[index].re;
  });
  return Math.min(1, Math.max(0, re ** 2 + im ** 2));
}

export function matchesTarget(state: State, target: State): boolean {
  return fidelity(state, target) >= 1 - 1e-10;
}

export function evaluateCircuit(cases: readonly CircuitTestCase[], gates: readonly Gate[]) {
  return cases.map(testCase => {
    const output = runCircuit(testCase.initial, gates);
    return {
      output,
      fidelity: fidelity(output, testCase.target),
      matches: matchesTarget(output, testCase.target),
    };
  });
}

export function concurrence([a, b, c, d]: PairState): number {
  const ad = multiply(a, d);
  const bc = multiply(b, c);
  return Math.min(1, 2 * Math.hypot(ad.re - bc.re, ad.im - bc.im));
}

export function marginals(state: PairState) {
  const [p00, p01, p10, p11] = probabilities(state);
  return {
    A: [p00 + p01, p10 + p11],
    B: [p00 + p10, p01 + p11],
  };
}

export function relativePhases(state: State): readonly (number | null)[] {
  const reference = state.find(value => magnitudeSquared(value) > 1e-12);
  if (!reference) throw new Error('A zero-amplitude vector is not a quantum state.');
  const origin = Math.atan2(reference.im, reference.re);
  return state.map(value => magnitudeSquared(value) <= 1e-12 ? null
    : (Math.atan2(value.im, value.re) - origin + 2 * Math.PI) % (2 * Math.PI));
}
