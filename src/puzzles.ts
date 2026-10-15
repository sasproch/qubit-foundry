import { MINUS, ONE, PLUS, ZERO, tensorProduct, type CircuitTestCase, type Gate, type PairState, type State } from './quantum';

interface NamedState {
  state: State;
  label: string;
  symbol: string;
}

interface PairNamedState extends NamedState {
  state: PairState;
}

export const pairStates = {
  zeroZero: { state: tensorProduct(ZERO, ZERO), label: 'Certain 00', symbol: '00' },
  zeroOne: { state: tensorProduct(ZERO, ONE), label: 'Certain 01', symbol: '01' },
  oneZero: { state: tensorProduct(ONE, ZERO), label: 'Certain 10', symbol: '10' },
  oneOne: { state: tensorProduct(ONE, ONE), label: 'Certain 11', symbol: '11' },
  plusPlus: { state: tensorProduct(PLUS, PLUS), label: 'Product ++', symbol: '++' },
  plusMinus: { state: tensorProduct(PLUS, MINUS), label: 'Product +-', symbol: '+-' },
  minusPlus: { state: tensorProduct(MINUS, PLUS), label: 'Product -+', symbol: '-+' },
  minusMinus: { state: tensorProduct(MINUS, MINUS), label: 'Product --', symbol: '--' },
  plusZero: { state: tensorProduct(PLUS, ZERO), label: 'Product +0', symbol: '+0' },
  zeroPlus: { state: tensorProduct(ZERO, PLUS), label: 'Product 0+', symbol: '0+' },
  minusZero: { state: tensorProduct(MINUS, ZERO), label: 'Product -0', symbol: '-0' },
  bellSamePlus: {
    state: [{ re: Math.SQRT1_2, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }, { re: Math.SQRT1_2, im: 0 }],
    label: 'Bell: same, in phase', symbol: 'B+',
  },
  bellSameMinus: {
    state: [{ re: Math.SQRT1_2, im: 0 }, { re: 0, im: 0 }, { re: 0, im: 0 }, { re: -Math.SQRT1_2, im: 0 }],
    label: 'Bell: same, opposite phase', symbol: 'B-',
  },
  bellDifferentPlus: {
    state: [{ re: 0, im: 0 }, { re: Math.SQRT1_2, im: 0 }, { re: Math.SQRT1_2, im: 0 }, { re: 0, im: 0 }],
    label: 'Bell: different, in phase', symbol: 'D+',
  },
  bellDifferentMinus: {
    state: [{ re: 0, im: 0 }, { re: Math.SQRT1_2, im: 0 }, { re: -Math.SQRT1_2, im: 0 }, { re: 0, im: 0 }],
    label: 'Bell: different, opposite phase', symbol: 'D-',
  },
} satisfies Record<string, PairNamedState>;

export const namedStates = {
  zero: { state: ZERO, label: 'Certain zero', symbol: '0' },
  one: { state: ONE, label: 'Certain one', symbol: '1' },
  plus: { state: PLUS, label: 'Equal, in phase', symbol: '+' },
  minus: { state: MINUS, label: 'Equal, opposite phase', symbol: '-' },
  ...pairStates,
} satisfies Record<string, NamedState>;

export interface PuzzleCase extends CircuitTestCase {
  id: string;
  inputLabel: string;
  inputSymbol: string;
  targetLabel: string;
}

function testCase(id: string, input: NamedState, target: NamedState): PuzzleCase {
  return {
    id,
    initial: input.state,
    target: target.state,
    inputLabel: input.label,
    inputSymbol: input.symbol,
    targetLabel: target.label,
  };
}

export interface Puzzle {
  id: string;
  qubits: 1 | 2;
  kind: 'state' | 'program';
  title: string;
  concept: string;
  brief: string;
  hint: string;
  discovery: string;
  cases: readonly [PuzzleCase, ...PuzzleCase[]];
  gates: readonly Gate[];
}

export const puzzles: readonly Puzzle[] = [
  {
    id: 'flip',
    qubits: 1,
    kind: 'state',
    title: 'From zero to one',
    concept: 'Control',
    brief: 'The qubit starts at the north pole: a certain zero. Move it to the south pole so a measurement would always give one.',
    hint: 'Try the flip operator. Watch both the arrow and the probability bars.',
    discovery: 'X swaps the zero and one amplitudes. Starting from a certain zero, you now have a certain one.',
    cases: [testCase('zero', namedStates.zero, namedStates.one)],
    gates: ['X'],
  },
  {
    id: 'superposition',
    qubits: 1,
    kind: 'state',
    title: 'Between certainties',
    concept: 'Superposition',
    brief: 'Make an equal, in-phase superposition. The target sits on the equator: zero and one are equally likely, but the qubit is not just a hidden coin flip.',
    hint: 'The H operator takes a certain zero to the bright side of the equator. This is a coherent state, not classical uncertainty.',
    discovery: 'H creates equal amplitudes with the same phase. Both outcomes have a 50% chance if measured, while the phase still controls what the next gate can do.',
    cases: [testCase('zero', namedStates.zero, namedStates.plus)],
    gates: ['H', 'X'],
  },
  {
    id: 'interference',
    qubits: 1,
    kind: 'state',
    title: 'The invisible difference',
    concept: 'Phase & interference',
    brief: 'Reach a certain one using only H and Z. Z cannot change the probability bars directly. Find a way to turn its hidden phase change into a visible outcome.',
    hint: 'First split with H, then shift the relative phase with Z, then recombine with H. Step through each gate: the middle operation matters even when the bars stay still.',
    discovery: 'H, Z, H makes the zero amplitudes cancel and the one amplitudes reinforce. Relative phase changes interference, even when measurement probabilities initially look identical.',
    cases: [testCase('zero', namedStates.zero, namedStates.one)],
    gates: ['H', 'Z'],
  },
  {
    id: 'inverter',
    qubits: 1,
    kind: 'program',
    title: 'A program, not a trick',
    concept: 'Inversion',
    brief: 'Build one circuit that flips certain zero to certain one AND certain one to certain zero. It must also preserve the two equator states. Every input goes through the same program, with no branching or per-case edits.',
    hint: 'X swaps the amplitudes for any input. A circuit that also shifts their relative phase can pass the pole tests while failing the equator tests.',
    discovery: 'Your circuit now implements a transformation, not just a single journey. The superposition cases check that the program preserves coherence as well as flipping the certain outcomes.',
    cases: [
      testCase('zero', namedStates.zero, namedStates.one),
      testCase('one', namedStates.one, namedStates.zero),
      testCase('plus', namedStates.plus, namedStates.plus),
      testCase('minus', namedStates.minus, namedStates.minus),
    ],
    gates: ['X', 'H', 'Z'],
  },
  {
    id: 'basis-converter',
    qubits: 1,
    kind: 'program',
    title: 'Change the language',
    concept: 'Basis conversion',
    brief: 'Translate the poles into the equator: zero becomes in phase, one becomes opposite phase. The same circuit must translate back too: in phase becomes zero, opposite phase becomes one.',
    hint: 'H changes between these two bases. Test the equator inputs too: putting Z before H can get the pole cases right while breaking the return journey.',
    discovery: 'The same H operation splits and recombines. What it does depends on the input, but the program itself does not change. This basis conversion is reversible.',
    cases: [
      testCase('zero', namedStates.zero, namedStates.plus),
      testCase('one', namedStates.one, namedStates.minus),
      testCase('plus', namedStates.plus, namedStates.zero),
      testCase('minus', namedStates.minus, namedStates.one),
    ],
    gates: ['H', 'X', 'Z'],
  },
  {
    id: 'phase-program',
    qubits: 1,
    kind: 'program',
    title: 'Build the missing operator',
    concept: 'Operator synthesis',
    brief: 'Swap the in-phase and opposite-phase equator states while leaving both poles physically unchanged. The Z operator is missing from your shelf. Build its behavior using only H and X.',
    hint: 'Change basis with H, flip with X, then change back with H. The pole cases alone cannot tell a real phase operation from doing nothing.',
    discovery: 'H, X, H synthesizes Z. The pole probabilities are unchanged, but the superposition cases prove the program changes relative phase. A global phase alone never counts as a different state.',
    cases: [
      testCase('zero', namedStates.zero, namedStates.zero),
      testCase('one', namedStates.one, namedStates.one),
      testCase('plus', namedStates.plus, namedStates.minus),
      testCase('minus', namedStates.minus, namedStates.plus),
    ],
    gates: ['H', 'X'],
  },
  {
    id: 'product-states',
    qubits: 2,
    kind: 'program',
    title: 'Two independent spins',
    concept: 'Product states',
    brief: 'A is the first bit, B the second. Put each spin into its own superposition: 00 becomes ++, 01 becomes +-, 10 becomes -+, and 11 becomes --. The same program must take ++ back to 00. These are product states: the joint amplitudes factor into separate states for A and B.',
    hint: 'Apply H to A and H to B. Four possible outcomes do not imply entanglement. Compare the joint map and the entanglement indicator.',
    discovery: 'Both spins are uncertain, but still independent. In ++, all four outcomes have a 25% probability and the entanglement strength is zero. Superposition and entanglement are different ideas.',
    cases: [
      testCase('00', pairStates.zeroZero, pairStates.plusPlus),
      testCase('01', pairStates.zeroOne, pairStates.plusMinus),
      testCase('10', pairStates.oneZero, pairStates.minusPlus),
      testCase('11', pairStates.oneOne, pairStates.minusMinus),
      testCase('++', pairStates.plusPlus, pairStates.zeroZero),
    ],
    gates: ['H_A', 'H_B', 'X_A', 'X_B'],
  },
  {
    id: 'controlled-flip',
    qubits: 2,
    kind: 'program',
    title: 'One spin controls another',
    concept: 'Controlled operations',
    brief: 'Build a program that flips B only when A is one. Pass all four certain inputs and two superposition inputs. A is never measured: the rule must act coherently on every joint amplitude.',
    hint: 'CNOT A to B keeps 00 and 01 unchanged, and swaps 10 with 11. Inspect Product +0: its two branches take different paths and become entangled.',
    discovery: 'A controlled operation is not a measurement or a classical if-statement. It can entangle a superposition input, while the certain inputs remain product states.',
    cases: [
      testCase('00', pairStates.zeroZero, pairStates.zeroZero),
      testCase('01', pairStates.zeroOne, pairStates.zeroOne),
      testCase('10', pairStates.oneZero, pairStates.oneOne),
      testCase('11', pairStates.oneOne, pairStates.oneZero),
      testCase('+0', pairStates.plusZero, pairStates.bellSamePlus),
      testCase('-0', pairStates.minusZero, pairStates.bellSameMinus),
    ],
    gates: ['CNOT_AB', 'X_A', 'X_B'],
  },
  {
    id: 'bell-encoder',
    qubits: 2,
    kind: 'program',
    title: 'More than two coins',
    concept: 'Entangled states',
    brief: 'Turn the four certain inputs into the four Bell states. For 00, only 00 and 11 should remain, equally weighted and in phase. Both spins look 50/50 alone, but their outcomes are linked in the joint state. The ++ input must become 0+: the same operation does not entangle every input.',
    hint: 'Split A with H, then use A to control B. H on both spins creates an independent ++ state instead: the local probabilities look the same, but the joint amplitudes are wrong.',
    discovery: 'A Bell state cannot be factored into separate pure states for A and B. The full amplitudes and their relative phase describe its entanglement; the per-spin probabilities alone cannot.',
    cases: [
      testCase('00', pairStates.zeroZero, pairStates.bellSamePlus),
      testCase('01', pairStates.zeroOne, pairStates.bellDifferentPlus),
      testCase('10', pairStates.oneZero, pairStates.bellSameMinus),
      testCase('11', pairStates.oneOne, pairStates.bellDifferentMinus),
      testCase('++', pairStates.plusPlus, pairStates.zeroPlus),
    ],
    gates: ['H_A', 'H_B', 'CNOT_AB', 'X_A', 'X_B'],
  },
  {
    id: 'bell-phase',
    qubits: 2,
    kind: 'program',
    title: 'Same odds, different state',
    concept: 'Joint relative phase',
    brief: 'Swap the in-phase and opposite-phase versions of each Bell state. Keep every joint measurement probability unchanged. The phase arrows must change even when the bars and entanglement strength do not.',
    hint: 'Try Z on A or B. A local phase operation changes the relative phase between the two branches without removing their entanglement.',
    discovery: 'Bell states can have identical probabilities and entanglement strength yet be orthogonal. Their relative phase changes how a later circuit recombines the branches. Correlation bars are not the whole quantum state.',
    cases: [
      testCase('same-plus', pairStates.bellSamePlus, pairStates.bellSameMinus),
      testCase('same-minus', pairStates.bellSameMinus, pairStates.bellSamePlus),
      testCase('different-plus', pairStates.bellDifferentPlus, pairStates.bellDifferentMinus),
      testCase('different-minus', pairStates.bellDifferentMinus, pairStates.bellDifferentPlus),
    ],
    gates: ['Z_A', 'Z_B', 'X_A', 'X_B', 'CNOT_AB'],
  },
  {
    id: 'bell-decoder',
    qubits: 2,
    kind: 'program',
    title: 'Bring the spins apart',
    concept: 'Disentangling',
    brief: 'Decode all four Bell states into the certain inputs that created them. The program must remove their entanglement and convert the joint phase and correlation into two definite output bits. Preserve coherence too: the 0+ input must become ++.',
    hint: 'Undo the encoder in reverse order: CNOT A to B first, then H on A. Local gates alone cannot remove entanglement.',
    discovery: 'Entanglement is reversible here. The joint CNOT operation removes the link; H then turns the remaining phase information into a definite bit. No measurement or information erasure was needed.',
    cases: [
      testCase('same-plus', pairStates.bellSamePlus, pairStates.zeroZero),
      testCase('different-plus', pairStates.bellDifferentPlus, pairStates.zeroOne),
      testCase('same-minus', pairStates.bellSameMinus, pairStates.oneZero),
      testCase('different-minus', pairStates.bellDifferentMinus, pairStates.oneOne),
      testCase('0+', pairStates.zeroPlus, pairStates.plusPlus),
    ],
    gates: ['CNOT_AB', 'H_A', 'H_B', 'X_A', 'X_B'],
  },
];

export const gateInfo: Record<Gate, { label: string; symbol: string; target: string; family: string; name: string; description: string }> = {
  X: { label: 'X', symbol: 'X', target: '', family: 'X', name: 'Flip', description: 'Swap the zero and one amplitudes. A half-turn around the X axis.' },
  H: { label: 'H', symbol: 'H', target: '', family: 'H', name: 'Split / recombine', description: 'Create a superposition, or let its amplitudes interfere. Applying H twice returns the original state.' },
  Z: { label: 'Z', symbol: 'Z', target: '', family: 'Z', name: 'Phase shift', description: 'Turn the one amplitude by half a cycle. Probabilities stay the same; relative phase can change.' },
  X_A: { label: 'X on A', symbol: 'X', target: 'A', family: 'X', name: 'Flip A', description: 'Swap the A bit in every joint amplitude. B is untouched.' },
  X_B: { label: 'X on B', symbol: 'X', target: 'B', family: 'X', name: 'Flip B', description: 'Swap the B bit in every joint amplitude. A is untouched.' },
  H_A: { label: 'H on A', symbol: 'H', target: 'A', family: 'H', name: 'Split / recombine A', description: 'Mix the A=0 and A=1 amplitudes separately for each value of B.' },
  H_B: { label: 'H on B', symbol: 'H', target: 'B', family: 'H', name: 'Split / recombine B', description: 'Mix the B=0 and B=1 amplitudes separately for each value of A.' },
  Z_A: { label: 'Z on A', symbol: 'Z', target: 'A', family: 'Z', name: 'Shift phase on A', description: 'Turn the phase of the 10 and 11 amplitudes by half a cycle.' },
  Z_B: { label: 'Z on B', symbol: 'Z', target: 'B', family: 'Z', name: 'Shift phase on B', description: 'Turn the phase of the 01 and 11 amplitudes by half a cycle.' },
  CNOT_AB: { label: 'CNOT A to B', symbol: 'CX', target: 'A>B', family: 'CX', name: 'A controls B', description: 'Coherently flip B when A is one: swap 10 and 11 without measuring A.' },
  CNOT_BA: { label: 'CNOT B to A', symbol: 'CX', target: 'B>A', family: 'CX', name: 'B controls A', description: 'Coherently flip A when B is one: swap 01 and 11 without measuring B.' },
};
