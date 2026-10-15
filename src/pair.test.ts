import { describe, expect, it } from 'vitest';
import {
  applyGate, basisLabels, concurrence, fidelity, marginals, matchesTarget, ONE, PLUS,
  probabilities, relativePhases, runCircuit, tensorProduct, ZERO,
  type PairGate, type PairState, type SingleState, type State,
} from './quantum';
import { pairStates, puzzles } from './puzzles';

const BASIS = [pairStates.zeroZero.state, pairStates.zeroOne.state, pairStates.oneZero.state, pairStates.oneOne.state];
const COMPLEX_PAIR: PairState = [
  { re: .5, im: 0 }, { re: 0, im: .5 }, { re: -.5, im: 0 }, { re: .5, im: 0 },
];
const GATES: readonly PairGate[] = ['X_A', 'H_A', 'Z_A', 'X_B', 'H_B', 'Z_B', 'CNOT_AB', 'CNOT_BA'];

function expectAmplitudes(actual: State, expected: State) {
  expect(actual.length).toBe(expected.length);
  actual.forEach((value, index) => {
    expect(value.re).toBeCloseTo(expected[index].re, 12);
    expect(value.im).toBeCloseTo(expected[index].im, 12);
  });
}

describe('two-qubit state space', () => {
  it('uses A as first bit and orders amplitudes 00, 01, 10, 11', () => {
    expect(basisLabels(BASIS[0])).toEqual(['00', '01', '10', '11']);
    expect(probabilities(tensorProduct(ONE, ZERO))).toEqual([0, 0, 1, 0]);
    expect(probabilities(tensorProduct(ZERO, ONE))).toEqual([0, 1, 0, 0]);
  });

  it('forms complex tensor products without discarding phase', () => {
    const a: SingleState = [{ re: Math.SQRT1_2, im: 0 }, { re: 0, im: Math.SQRT1_2 }];
    expectAmplitudes(tensorProduct(a, a), [
      { re: .5, im: 0 }, { re: 0, im: .5 }, { re: 0, im: .5 }, { re: -.5, im: 0 },
    ]);
  });

  it.each([
    ['X_A', [2, 3, 0, 1]],
    ['X_B', [1, 0, 3, 2]],
    ['CNOT_AB', [0, 1, 3, 2]],
    ['CNOT_BA', [0, 3, 2, 1]],
  ] satisfies [PairGate, number[]][])('%s applies the correct truth table', (gate, outputs) => {
    BASIS.forEach((state, index) => expectAmplitudes(applyGate(state, gate), BASIS[outputs[index]]));
  });

  it('targets local H and Z on the correct bit, independently of the other spin', () => {
    expectAmplitudes(applyGate(BASIS[0], 'H_A'), tensorProduct(PLUS, ZERO));
    expectAmplitudes(applyGate(BASIS[0], 'H_B'), tensorProduct(ZERO, PLUS));
    const both = pairStates.plusPlus.state;
    expectAmplitudes(applyGate(both, 'Z_A'), pairStates.minusPlus.state);
    expectAmplitudes(applyGate(both, 'Z_B'), pairStates.plusMinus.state);
    expectAmplitudes(runCircuit(COMPLEX_PAIR, ['H_A', 'Z_B']), runCircuit(COMPLEX_PAIR, ['Z_B', 'H_A']));
  });

  it.each(GATES)('%s is reversible on complex amplitudes and does not mutate input', gate => {
    const original = structuredClone(COMPLEX_PAIR);
    expectAmplitudes(applyGate(applyGate(COMPLEX_PAIR, gate), gate), COMPLEX_PAIR);
    expect(COMPLEX_PAIR).toEqual(original);
  });

  it('preserves normalization and reverses every circuit up to four gates', () => {
    let circuits: PairGate[][] = [[]];
    for (let depth = 0; depth <= 4; depth++) {
      for (const gates of circuits) {
        const output = runCircuit(COMPLEX_PAIR, gates);
        expect(probabilities(output).reduce((sum, p) => sum + p, 0)).toBeCloseTo(1, 12);
        expectAmplitudes(runCircuit(output, [...gates].reverse()), COMPLEX_PAIR);
      }
      if (depth < 4) circuits = circuits.flatMap(gates => GATES.map(gate => [...gates, gate]));
    }
  });

  it('rejects incompatible gate dimensions and state comparisons explicitly', () => {
    expect(() => applyGate(ZERO, 'H_A')).toThrow('requires two qubits');
    expect(() => applyGate(BASIS[0], 'H')).toThrow('explicit A or B');
    expect(() => fidelity(ZERO, BASIS[0])).toThrow('different qubit counts');
  });
});

describe('entanglement and joint phase', () => {
  it('distinguishes independent uncertainty from Bell entanglement despite identical marginals', () => {
    const product = pairStates.plusPlus.state;
    const bell = pairStates.bellSamePlus.state;
    expect(concurrence(product)).toBeCloseTo(0, 12);
    expect(concurrence(bell)).toBeCloseTo(1, 12);
    for (const state of [product, bell]) {
      expect(marginals(state).A[0]).toBeCloseTo(.5, 12);
      expect(marginals(state).B[0]).toBeCloseTo(.5, 12);
    }
    probabilities(product).forEach(p => expect(p).toBeCloseTo(.25, 12));
    const joint = probabilities(bell);
    expect(joint[0] + joint[3]).toBeCloseTo(1, 12);
    expect(joint[1] + joint[2]).toBeCloseTo(0, 12);
  });

  it('handles partial entanglement, not just Bell states', () => {
    const partial: PairState = [
      { re: Math.cos(Math.PI / 8), im: 0 }, { re: 0, im: 0 },
      { re: 0, im: 0 }, { re: Math.sin(Math.PI / 8), im: 0 },
    ];
    expect(concurrence(partial)).toBeCloseTo(Math.SQRT1_2, 12);
    expect(concurrence(COMPLEX_PAIR)).toBeCloseTo(Math.SQRT1_2, 12);
  });

  it('local gates cannot change pure-state entanglement', () => {
    for (const gate of GATES.filter(gate => !gate.startsWith('CNOT'))) {
      expect(concurrence(applyGate(COMPLEX_PAIR, gate))).toBeCloseTo(concurrence(COMPLEX_PAIR), 12);
      expect(concurrence(applyGate(pairStates.bellSamePlus.state, gate))).toBeCloseTo(1, 12);
      expect(concurrence(applyGate(pairStates.plusPlus.state, gate))).toBeCloseTo(0, 12);
    }
  });

  it('CNOT entangles some product inputs, not every input', () => {
    expect(matchesTarget(applyGate(pairStates.plusZero.state, 'CNOT_AB'), pairStates.bellSamePlus.state)).toBe(true);
    expect(concurrence(applyGate(pairStates.plusPlus.state, 'CNOT_AB'))).toBeCloseTo(0, 12);
    expect(concurrence(applyGate(BASIS[2], 'CNOT_AB'))).toBeCloseTo(0, 12);
  });

  it('decodes each Bell state into the correct product bits', () => {
    const bells = [pairStates.bellSamePlus.state, pairStates.bellDifferentPlus.state, pairStates.bellSameMinus.state, pairStates.bellDifferentMinus.state];
    bells.forEach((state, index) => {
      const output = runCircuit(state, ['CNOT_AB', 'H_A']);
      expect(matchesTarget(output, BASIS[index])).toBe(true);
      expect(concurrence(output)).toBeCloseTo(0, 12);
    });
  });

  it('distinguishes orthogonal Bell phases with identical joint odds and entanglement', () => {
    const plus = pairStates.bellSamePlus.state;
    const minus = pairStates.bellSameMinus.state;
    expect(probabilities(plus)).toEqual(probabilities(minus));
    expect(concurrence(plus)).toBeCloseTo(concurrence(minus), 12);
    expect(fidelity(plus, minus)).toBeCloseTo(0, 12);
    expect(relativePhases(plus)).toEqual([0, null, null, 0]);
    expect(relativePhases(minus)).toEqual([0, null, null, Math.PI]);
  });

  it('ignores global phase in fidelity and the phase display', () => {
    const imaginaryPlus: SingleState = [{ re: 0, im: Math.SQRT1_2 }, { re: 0, im: Math.SQRT1_2 }];
    const shifted = tensorProduct(imaginaryPlus, PLUS);
    expect(matchesTarget(shifted, pairStates.plusPlus.state)).toBe(true);
    expect(relativePhases(shifted)).toEqual(relativePhases(pairStates.plusPlus.state));
  });

  it('does not assign a phase to empty amplitudes or accept an all-zero vector', () => {
    expect(relativePhases(BASIS[1])).toEqual([null, 0, null, null]);
    expect(() => relativePhases([{ re: 0, im: 0 }, { re: 0, im: 0 }])).toThrow('not a quantum state');
  });

  it('has at least three new two-qubit puzzles, including product and entangled inputs', () => {
    const series = puzzles.filter(puzzle => puzzle.qubits === 2);
    expect(series.length).toBeGreaterThanOrEqual(3);
    expect(series.some(puzzle => puzzle.cases.some(testCase => testCase.initial.length === 4 && concurrence(testCase.initial) > .99))).toBe(true);
    expect(series.some(puzzle => puzzle.cases.some(testCase => testCase.target.length === 4 && concurrence(testCase.target) > .99))).toBe(true);
  });
});
