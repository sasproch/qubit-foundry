# Qubit Foundry

A solo browser puzzle game about steering quantum states with small circuits.
Inspired by the experimental, machine-building spirit of Zachtronics games,
with original puzzles and presentation.

**Design principle:** visual intuition first; introduce notation gradually.

## Run locally

Requires Node.js 22.12+ (or 20.19+) and npm.

```powershell
npm ci
npm run dev
```

Open the localhost URL printed by Vite. To expose the development server to
another device, explicitly choose a host with Vite's `--host` option.

```powershell
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

The browser suite exercises desktop and mobile Chromium. `npm run preview`
serves the production build after `npm run build`.

If a sandbox redirects the default browser cache between commands, use a
project-local cache in the same PowerShell session:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $PWD 'node_modules\.cache\ms-playwright'
npx playwright install chromium
npm run test:e2e
```

## Introductory labs

Three self-contained, single-qubit puzzles:

1. **From zero to one:** use X to flip a certain zero to a certain one.
2. **Between certainties:** use H to create equal, in-phase superposition.
3. **The invisible difference:** use H, Z, H to turn relative phase into a
   certain outcome through interference.

Click operators to append and immediately apply them. Each addition runs the
updated circuit to the end, including any pending gates after a rewind or
partial replay. Hover or keyboard-focus an operator to preview the result of
appending it to the full circuit.

Rewind preserves the circuit and returns to the starting state; then use Step
or Run circuit to replay it from left to right. Moving or removing gates also
rewinds the state. Clear removes the circuit. Circuits hold up to eight gates.

The observatory shows a projected Bloch sphere, exact measurement
probabilities, and target-state fidelity. The gold ring is the target; the
solid mint arrow is the current state; a dashed purple arrow previews the
selected operator. Expand the math section for complex amplitudes and notation.
Completion requires the final state to match the target, not just its
measurement probabilities. Global phase is correctly ignored.

## Multi-input programs

Three further levels ask for a function, not a single state-to-state journey:

1. **A program, not a trick:** flip zero and one while preserving both
   in-phase and opposite-phase equator states.
2. **Change the language:** convert between the pole and equator bases in
   both directions with the same circuit.
3. **Build the missing operator:** synthesize Z using only H and X. Leave the
   poles physically unchanged while swapping the two equator states.

Every program has four visible input/output cases. The same gate sequence is
evaluated for each input; selecting a case changes only the inspection view,
never the program. A level is solved only when **every** case passes at the
end of a nonempty circuit. Matching the currently inspected case is not
enough. Pole-only tests would miss relative-phase errors, so superposition
cases are part of each specification.

The test bench shows input, expected output, actual output, and phase-aware
PASS / FAIL. Click Inspect on a failed row to follow that input in the
observatory, then Rewind and Step to diagnose the sequence. All cases advance
together during replay; their verdicts remain PENDING until the final gate.
Appending a gate still auto-applies the full updated circuit to every input.
Moving/removing gates rewinds every case and clears the current verdicts.

These programs are reversible quantum transformations, not arbitrary
irreversible classical functions.

## Two interacting spins

Five more puzzles introduce product and entangled states. In every two-spin
state, **A is the first bit and B the second**, with complex amplitudes ordered
`00, 01, 10, 11`.

1. **Two independent spins:** H on A and H on B prepare independent product
   superpositions. An additional ++ input checks the coherent return journey.
2. **One spin controls another:** CNOT A to B implements a controlled flip
   across four certain inputs and two coherent superposition inputs.
3. **More than two coins:** H on A, then CNOT A to B, creates the four Bell
   states from the four certain inputs. A ++ input also shows that this
   operation does not entangle every input.
4. **Same odds, different state:** a local Z swaps the relative-phase
   versions of the Bell states without changing measurement probabilities
   or entanglement strength.
5. **Bring the spins apart:** undo the Bell encoder with CNOT followed by
   H on A. The joint interaction removes entanglement before local
   interference resolves the remaining output bit.

The same input-selection test bench works for these programs. Gates on the
shelf and in the circuit explicitly identify their target spin; CNOT labels
identify control and target. Every gate still auto-applies, and Rewind/Step
replays every case together.

The two-spin observatory shows the **joint state**, not two misleading pure
Bloch spheres:

- Four amplitude disks: area represents probability; direction represents
  relative phase. Gold marks are the target, purple marks preview an append.
- Exact joint probabilities for 00, 01, 10, 11, plus same/different outcome
  correlations and each spin's marginal probabilities.
- Pure-state entanglement strength (concurrence), with product/entangled
  classification. Strength is not a measurement probability.

Phase directions are measured relative to each state's first nonzero
amplitude, so an unobservable global phase does not rotate the display.
Empty amplitudes have no phase. Expand the math details for all four complex
amplitudes and the concurrence formula.

Discovery badges last for the current page session only. Reloading starts over.

## Structure

```text
src/
  quantum.ts        One/two-qubit simulator, tensor products, phase, entanglement
  quantum.test.ts   Operator, phase, normalization, and program tests
  pair.test.ts      Two-qubit gates, joint phase, entanglement, reversibility
  puzzles.ts        Three series of puzzles and explicit gate descriptions
  App.tsx           Circuit editor, test bench, and SVG observatory
  PairObservatory.tsx Joint amplitude/phase map, correlations and marginals
  styles.css        Responsive lab interface
  main.tsx          React entry point
tests/
  game.spec.ts      Desktop/mobile interaction coverage
```

React + TypeScript + Vite handle the interface and build. The simulator has no
UI dependencies. The Bloch sphere is an SVG projection, not a WebGL scene;
there is no need for a 3D engine at this scope. The game uses system fonts
and does not require external services at runtime.

## Physics boundaries

The simulator tracks ideal normalized pure states of **one or two qubits**
with complex amplitudes. X, H, Z, and CNOT are unitary gates. Local gates
act on the explicitly named A or B spin. CNOT is a coherent joint operation,
not a measurement or a sampled classical conditional.

A Bloch sphere represents a single-qubit state, **not a general entangled
multi-qubit state**. The two-qubit view uses the full joint amplitudes.
Although the joint vector is pure, either spin's reduced state can be mixed
when the spins are entangled. Local marginal probabilities and correlations
alone cannot certify entanglement; the indicator uses the known pure-state
amplitudes and is not a general mixed-state entanglement detector.

Probabilities are calculated, not sampled: there is no simulated measurement
collapse, noise, or mixed joint-state evolution. The puzzles use real
amplitudes; the simulator and phase calculations also handle imaginary
components. More than two qubits is not supported yet.

## Deliberately deferred

Three or more qubits, measurement/collapse mechanics, noise, mixed-state
evolution, score optimization, accounts, persistent saves, level authoring,
sound, and deployment are not implemented yet.
