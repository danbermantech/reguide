# reguide

Lightweight guided onboarding for React apps.

`reguide` provides:

- A spotlight overlay around the active target element
- A floating step card with Back / Next / Close controls
- Step gating modes (`default`, `click`, `interact`, `custom`)
- Optional per-step autofocus behavior
- A small API surface centered around `ReguideProvider` and `useReguide`

## Installation

### In a pnpm workspace

```bash
pnpm add reguide@workspace:* react react-dom
```

### As a package dependency

```bash
pnpm add reguide react react-dom
```

Then include the library styles:

```ts
import 'reguide/style.css'
```

## Quick Start

```tsx
import { useMemo, useRef } from 'react'
import { ReguideProvider, useReguide, type ReguideStep } from 'reguide'
import 'reguide/style.css'

function TourControls() {
  const guide = useReguide()

  return (
    <div>
      <button type="button" onClick={guide.start}>Start tour</button>
      <button type="button" onClick={guide.stop}>Stop tour</button>
    </div>
  )
}

export function App() {
  const profileRef = useRef<HTMLButtonElement | null>(null)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const publishRef = useRef<HTMLButtonElement | null>(null)

  const steps = useMemo<ReguideStep[]>(
    () => [
      {
        targetRef: profileRef,
        title: 'Open your profile menu',
        body: 'Click this button to continue.',
        mode: 'click',
      },
      {
        targetRef: searchRef,
        title: 'Try the search input',
        body: 'Type or click in the input to unlock Next.',
        mode: 'interact',
        autoFocus: true,
      },
      {
        targetRef: publishRef,
        title: 'Publish when ready',
        body: 'Final step of onboarding.',
      },
    ],
    [],
  )

  return (
    <ReguideProvider steps={steps}>
      <button ref={profileRef} type="button">Profile</button>
      <input ref={searchRef} aria-label="Search" />
      <button ref={publishRef} type="button">Publish</button>
      <TourControls />
    </ReguideProvider>
  )
}
```

## Step Modes

`ReguideStep.mode` controls how the user moves forward.

- `default`: Next is enabled immediately.
- `click`: Clicking the target element advances to the next step automatically.
- `interact`: Next stays disabled until the target receives click, input, or keydown interaction.
- `custom`: Next stays disabled until the step validator returns `true` from an interaction event.

## API

### `ReguideProvider`

```tsx
<ReguideProvider steps={steps} initialOpen={false}>
  {children}
</ReguideProvider>
```

Props:

- `steps: ReguideStep[]` (required)
- `initialOpen?: boolean` (default: `false`)
- `theme?: ReguideTheme` (global visual defaults)
- `persistence?: { key: string; storage?: Storage; persistIsOpen?: boolean }`
- `onStart?: () => void`
- `onStop?: (event) => void`
- `onStepChange?: (event) => void`

### `useReguide`

`useReguide()` returns a context object:

- `isOpen`
- `steps`
- `currentStepIndex`
- `currentStep`
- `interactionSatisfied`
- `canGoNext`
- `canGoPrev`
- `start()`
- `stop()`
- `next()`
- `prev()`
- `goToStep(index)`
- `goToStepById(id)`

### `ReguideStep`

```ts
type ReguideStepMode = 'default' | 'click' | 'interact' | 'custom'

interface ReguideStep {
  id?: string
  targetRef?: RefObject<HTMLElement | null>
  title: string
  body: ReactNode
  mode?: ReguideStepMode
  autoFocus?: boolean
  theme?: ReguideTheme
}
```

`body` accepts plain text or any React component.

When `targetRef` is omitted, the step renders without a spotlight cutout and centers the card on the page.

### `goToStepById`

Use stable step ids for direct navigation:

```tsx
const guide = useReguide()

guide.goToStepById('publish')
```

If the id is not found, the call is ignored.

### Analytics callbacks

```tsx
<ReguideProvider
  steps={steps}
  onStart={() => track('guide_started')}
  onStop={(event) => track('guide_stopped', event)}
  onStepChange={(event) => track('guide_step_changed', event)}
>
  {children}
</ReguideProvider>
```

`onStepChange` includes:

- `source`
- `currentStepIndex`, `currentStepId`
- `previousStepIndex`, `previousStepId`

### Keyed progress persistence

Persist and restore progress using stable step ids:

```tsx
<ReguideProvider
  steps={steps}
  persistence={{
    key: 'my-app:onboarding',
    persistIsOpen: true,
  }}
>
  {children}
</ReguideProvider>
```

Stored payload includes step id, fallback step index, and optional open/closed state.

For `mode: 'custom'`, provide a `validator`:

```ts
type ReguideStepValidator = (context: {
  target: HTMLElement
  eventType: 'click' | 'input' | 'keydown'
  event: Event
}) => boolean | Promise<boolean>

interface ReguideCustomStep {
  mode: 'custom'
  validator: ReguideStepValidator
  progressOnValidate?: boolean
}
```

## Custom Validation Mode

Use `mode: 'custom'` when progression should depend on your own logic.

```tsx
const searchRef = useRef<HTMLInputElement | null>(null)
const publishRef = useRef<HTMLButtonElement | null>(null)
const didPublishRef = useRef(false)

const steps: ReguideStep[] = [
  {
    targetRef: searchRef,
    title: 'Enter details',
    body: 'Type something to prepare your draft.',
    mode: 'interact',
  },
  {
    targetRef: publishRef,
    title: 'Publish draft',
    body: 'You must have entered text and clicked Publish.',
    mode: 'custom',
    progressOnValidate: true,
    validator: () => {
      const hasSearchValue = Boolean(searchRef.current?.value.trim())
      return hasSearchValue && didPublishRef.current
    },
  },
]

<button
  ref={publishRef}
  type="button"
  onClick={() => {
    didPublishRef.current = true
  }}
>
  Publish
</button>
```

Notes for custom mode:

- The validator runs on target interactions (`click`, `input`, `keydown`).
- Set `progressOnValidate: true` to automatically move to the next step immediately after validation passes.
- Validation failures only block progression; no built-in error UI is rendered.
- Validators are step-local.

## Theme Customization

Use `theme` on `ReguideProvider` for global defaults, then override any subset on a step.

```tsx
const steps: ReguideStep[] = [
  {
    targetRef: profileRef,
    title: 'Profile',
    body: 'Open your profile menu.',
  },
  {
    targetRef: publishRef,
    title: 'Publish',
    body: 'Finalize your first action.',
    theme: {
      stepCount: { show: true },
      card: {
        background: '#0b1020',
        border: '1px solid #1e293b',
      },
      title: {
        color: '#f8fafc',
      },
    },
  },
]

<ReguideProvider
  steps={steps}
  theme={{
    backdrop: { color: '#020617', opacity: 0.7 },
    card: {
      background: '#ffffff',
      border: '1px solid #d6dce7',
      padding: 20,
      verticalOffset: 18,
      className: 'my-card',
      style: { maxWidth: 420 },
    },
    title: {
      fontFamily: 'Georgia, serif',
      fontWeight: 700,
      color: '#111827',
    },
    body: {
      fontFamily: 'Georgia, serif',
      fontWeight: 400,
      color: '#334155',
    },
    stepCount: { show: false },
    highlight: { borderRadius: 20, padding: 12 },
    buttons: {
      secondary: {
        background: '#f8fafc',
        border: '1px solid #cbd5e1',
        color: '#0f172a',
        fontFamily: 'Georgia, serif',
        fontWeight: 500,
      },
      primary: {
        background: '#0f172a',
        border: '1px solid #0f172a',
        color: '#ffffff',
        fontFamily: 'Georgia, serif',
        fontWeight: 700,
      },
    },
  }}
>
  {children}
</ReguideProvider>
```

`theme.card.verticalOffset` controls the vertical gap (in pixels) between the highlighted target and the guide card.

Supported options:

- `backdrop`: `color`, `opacity`
- `card`: `background`, `border`, `padding`, `className`, `style`
- `title`: `fontFamily`, `fontWeight`, `color`
- `body`: `fontFamily`, `fontWeight`, `color`
- `stepCount`: `show`
- `highlight`: `borderRadius`, `padding`
- `buttons.secondary` and `buttons.primary`: `background`, `border`, `fontFamily`, `fontWeight`, `color`

## Notes

- `useReguide` must be used inside `ReguideProvider`.
- Each step needs a stable `targetRef` pointing to a mounted element.
- Pressing Escape closes the guide.
- On the last step, Next is replaced with Close.

## Development (this repository)

From the workspace root:

```bash
pnpm --filter reguide dev
pnpm --filter reguide build
pnpm --filter reguide test
```
