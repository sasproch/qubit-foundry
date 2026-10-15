import { describe, expect, it } from 'vitest';
import {
  applyGate, blochVector, evaluateCircuit, fidelity, matchesTarget, MINUS, ONE, PLUS, probabilities, runCircuit, ZERO,
  type Gate, type SingleGate, type SingleState, type State,
} from './quantum';
import { puzzles } from './puzzles';

const Y_PLUS: SingleState = [{ re: Math.SQRT1_2, im: 0 }, { re: 0, im: Math.SQRT1_2 }];

function expectSameState(actual: State, expected: State) {
  actual.forEach((value, index) => {
    expect(value.re).toBeCloseTo(expected[index].re, 12);
    expect(value.im).toBeCloseTo(expected[index].im, 12);
  });
}

describe('single-qubit operators', () => {
  it('flips zero and one without mutating the input', () => {
    expectSameState(applyGate(ZERO, 'X'), ONE);
    expectSameState(applyGate(ONE, 'X'), ZERO);
    expectSameState(ZERO, [{ re: 1, im: 0 }, { re: 0, im: 0 }]);
  });

  it('creates equal in-phase amplitudes with H', () => {
    expectSameState(applyGate(ZERO, 'H'), PLUS);
    expect(probabilities(PLUS)[0]).toBeCloseTo(0.5, 12);
    expect(probabilities(PLUS)[1]).toBeCloseTo(0.5, 12);
  });

  it.each<SingleGate>(['X', 'H', 'Z'])('%s is its own inverse, including complex amplitudes', gate => {
    expectSameState(applyGate(applyGate(Y_PLUS, gate), gate), Y_PLUS);
  });

  it('changes relative phase without changing probabilities', () => {
    const opposite = applyGate(PLUS, 'Z');
    expect(probabilities(opposite)).toEqual(probabilities(PLUS));
    expect(fidelity(opposite, PLUS)).toBeCloseTo(0, 12);
    expect(matchesTarget(opposite, PLUS)).toBe(false);
  });

  it('converts phase into a certain outcome through interference, in circuit order', () => {
    expectSameState(runCircuit(ZERO, ['H', 'Z', 'H']), ONE);
    expectSameState(runCircuit(ZERO, ['H', 'H', 'Z']), ZERO);
  });

  it('handles an empty circuit', () => {
    expectSameState(runCircuit(Y_PLUS, []), Y_PLUS);
  });

  it('compares physical states independent of global phase', () => {
    const phaseShifted: State = [{ re: 0, im: Math.SQRT1_2 }, { re: 0, im: Math.SQRT1_2 }];
    expect(matchesTarget(phaseShifted, PLUS)).toBe(true);
    expect(matchesTarget(ZERO, ONE)).toBe(false);
  });

  it('does not accept a merely close state as solved', () => {
    const nearOne: State = [{ re: 0.01, im: 0 }, { re: Math.sqrt(1 - 0.01 ** 2), im: 0 }];
    expect(matchesTarget(nearOne, ONE)).toBe(false);
  });

  it('projects the Bloch axes with correct complex-phase orientation', () => {
    expect(blochVector(ZERO)).toEqual({ x: 0, y: 0, z: 1 });
    expect(blochVector(ONE)).toEqual({ x: 0, y: 0, z: -1 });
    expect(blochVector(PLUS).x).toBeCloseTo(1, 12);
    expect(blochVector(Y_PLUS).y).toBeCloseTo(1, 12);
  });

  it('preserves normalization and Bloch length for every circuit up to six gates', () => {
    let circuits: SingleGate[][] = [[]];
    for (let length = 0; length <= 6; length++) {
      for (const gates of circuits) {
        const state = runCircuit(Y_PLUS, gates);
        const [p0, p1] = probabilities(state);
        const { x, y, z } = blochVector(state);
        expect(p0 + p1).toBeCloseTo(1, 12);
        expect(x ** 2 + y ** 2 + z ** 2).toBeCloseTo(1, 12);
      }
      circuits = circuits.flatMap(gates => (['X', 'H', 'Z'] as const).map(gate => [...gates, gate]));
    }
  });
});

describe('puzzle definitions', () => {
  it('has unique identities and nontrivial targets', () => {
    expect(new Set(puzzles.map(puzzle => puzzle.id)).size).toBe(puzzles.length);
    for (const puzzle of puzzles) {
      expect(new Set(puzzle.cases.map(testCase => testCase.id)).size).toBe(puzzle.cases.length);
      expect(puzzle.cases.some(testCase => !matchesTarget(testCase.initial, testCase.target))).toBe(true);
      for (const testCase of puzzle.cases) {
        expect(testCase.initial.length).toBe(2 ** puzzle.qubits);
        expect(testCase.target.length).toBe(testCase.initial.length);
        for (const state of [testCase.initial, testCase.target]) {
          expect(probabilities(state).reduce((total, value) => total + value, 0)).toBeCloseTo(1, 12);
        }
        for (const gate of puzzle.gates) expect(() => applyGate(testCase.initial, gate)).not.toThrow();
      }
    }
  });

  it.each([
    [0, ['X']],
    [1, ['H']],
    [2, ['H', 'Z', 'H']],
    [3, ['X']],
    [4, ['H']],
    [5, ['H', 'X', 'H']],
    [6, ['H_A', 'H_B']],
    [7, ['CNOT_AB']],
    [8, ['H_A', 'CNOT_AB']],
    [9, ['Z_A']],
    [10, ['CNOT_AB', 'H_A']],
  ] satisfies [number, Gate[]][])('puzzle %i is solvable with its available operators', (index, solution) => {
    const puzzle = puzzles[index];
    for (const gate of solution) expect(puzzle.gates).toContain(gate);
    expect(evaluateCircuit(puzzle.cases, solution).every(result => result.matches)).toBe(true);
  });
});

describe('program test bench', () => {
  it('returns the actual state and phase-aware result for each input', () => {
    const results = evaluateCircuit([
      { initial: ZERO, target: PLUS },
      { initial: ONE, target: MINUS },
      { initial: PLUS, target: ZERO },
      { initial: MINUS, target: ONE },
    ], ['H']);
    [PLUS, MINUS, ZERO, ONE].forEach((expected, index) => {
      expectSameState(results[index].output, expected);
      expect(results[index].fidelity).toBeCloseTo(1, 12);
      expect(results[index].matches).toBe(true);
    });
  });

  it.each([
    [3, ['Z', 'X']],
    [4, ['Z', 'H']],
    [5, []],
  ] satisfies [number, Gate[]][])('program %i rejects shortcuts that only pass the pole inputs', (index, gates) => {
    const results = evaluateCircuit(puzzles[index].cases, gates);
    expect(results.map(result => result.matches)).toEqual([true, true, false, false]);
    expect(results[2].fidelity).toBeCloseTo(0, 12);
  });

  it('evaluates prefixes without changing the input cases or full circuit', () => {
    const gates: Gate[] = ['H', 'X', 'H'];
    const cases = puzzles[5].cases;
    const before = structuredClone(cases);
    const prefix = evaluateCircuit(cases, gates.slice(0, 1));
    const complete = evaluateCircuit(cases, gates);
    expect(prefix.some(result => !result.matches)).toBe(true);
    expect(complete.every(result => result.matches)).toBe(true);
    expect(cases).toEqual(before);
    expect(gates).toEqual(['H', 'X', 'H']);
  });

  it('accepts global phase without mistaking relative phase for a pass', () => {
    const results = evaluateCircuit([
      { initial: MINUS, target: MINUS },
      { initial: PLUS, target: MINUS },
    ], ['X']);
    expect(results.map(result => result.matches)).toEqual([true, false]);
  });
});
