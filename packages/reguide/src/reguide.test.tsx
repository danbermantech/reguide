import { createRef, type RefObject } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { ReguideProvider, useReguide } from './reguide'
import type { ReguideStep } from './types'

function TestHarness({ steps }: { steps: ReguideStep[] }) {
  return (
    <ReguideProvider steps={steps} initialOpen>
      <Controls />
      <Targets steps={steps} />
    </ReguideProvider>
  )
}

function Controls() {
  const guide = useReguide()

  return (
    <div>
      <button type="button" onClick={guide.start}>
        Start
      </button>
      <span data-testid="index">{guide.currentStepIndex}</span>
    </div>
  )
}

function IdControls() {
  const guide = useReguide()

  return (
    <button type="button" onClick={() => guide.goToStepById('finish')}>
      Go to finish
    </button>
  )
}

function Targets({ steps }: { steps: ReguideStep[] }) {
  const firstTargetRef = steps[0]?.targetRef as RefObject<HTMLButtonElement | null> | undefined
  const secondTargetRef = steps[1]?.targetRef as RefObject<HTMLInputElement | null> | undefined

  return (
    <div>
      <button ref={firstTargetRef}>
        Target 1
      </button>
      {steps[1]
        ? (
            <input
              ref={secondTargetRef}
              aria-label="Target 2"
            />
          )
        : null}
    </div>
  )
}

describe('ReguideProvider', () => {
  it('advances automatically on click mode', async () => {
    const user = userEvent.setup()
    const steps: ReguideStep[] = [
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Click target',
        body: 'Click to continue',
        mode: 'click',
      },
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Second step',
        body: 'Done',
      },
    ]

    render(<TestHarness steps={steps} />)

    await user.click(screen.getByRole('button', { name: 'Target 1' }))

    expect(screen.getByText('Second step')).toBeInTheDocument()
  })

  it('keeps next disabled until interact event happens', async () => {
    const user = userEvent.setup()
    const steps: ReguideStep[] = [
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Click target',
        body: 'Click to continue',
        mode: 'click',
      },
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Interact here',
        body: 'Type to unlock next',
        mode: 'interact',
      },
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Last step',
        body: 'Done',
      },
    ]

    render(<TestHarness steps={steps} />)

    await user.click(screen.getByRole('button', { name: 'Target 1' }))

    const next = screen.getByRole('button', { name: 'Next' })
    expect(next).toBeDisabled()

    await user.type(screen.getByLabelText('Target 2'), 'hello')

    expect(next).toBeEnabled()
  })

  it('focuses target when autoFocus is enabled', async () => {
    const user = userEvent.setup()
    const firstRef = createRef<HTMLElement>()
    const secondRef = createRef<HTMLElement>()

    const steps: ReguideStep[] = [
      {
        targetRef: firstRef,
        title: 'First',
        body: 'Go next',
      },
      {
        targetRef: secondRef,
        title: 'Second',
        body: 'Focus target',
        autoFocus: true,
      },
    ]

    render(<TestHarness steps={steps} />)

    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.getByLabelText('Target 2')).toHaveFocus()
  })

  it('replaces Next with Close on the last step', async () => {
    const user = userEvent.setup()
    const steps: ReguideStep[] = [
      {
        targetRef: createRef<HTMLElement>(),
        title: 'First',
        body: 'Move forward',
      },
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Last',
        body: 'Finish tour',
      },
    ]

    render(<TestHarness steps={steps} />)

    await user.click(screen.getByRole('button', { name: 'Next' }))

    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Close' })).toHaveLength(1)
  })

  it('applies global theme tokens', () => {
    const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 100,
      bottom: 20,
      width: 100,
      height: 20,
      toJSON: () => ({}),
    }))

    const steps: ReguideStep[] = [
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Themed title',
        body: 'Themed body',
      },
    ]

    render(
      <ReguideProvider
        steps={steps}
        initialOpen
        theme={{
          backdrop: {
            color: '#ef4444',
            opacity: 0.4,
          },
          card: {
            background: '#010101',
            border: '2px solid #14b8a6',
            padding: 28,
            verticalOffset: 30,
          },
          title: {
            fontFamily: 'Georgia, serif',
            fontWeight: 700,
            color: '#f8fafc',
          },
          body: {
            fontFamily: 'Georgia, serif',
            fontWeight: 500,
            color: '#e2e8f0',
          },
          buttons: {
            secondary: {
              background: '#dcfce7',
              border: '1px solid #16a34a',
              color: '#14532d',
              fontFamily: 'Georgia, serif',
              fontWeight: 600,
            },
            primary: {
              background: '#0ea5e9',
              border: '1px solid #0284c7',
              color: '#f8fafc',
              fontFamily: 'Georgia, serif',
              fontWeight: 700,
            },
          },
          highlight: {
            borderRadius: 24,
            padding: 0,
          },
        }}
      >
        <Targets steps={steps} />
      </ReguideProvider>,
    )

    const layer = document.querySelector('.reguide-layer') as HTMLElement
    expect(layer).toHaveStyle('--reguide-card-background: #010101')
    expect(layer).toHaveStyle('--reguide-card-border: 2px solid #14b8a6')
    expect(layer).toHaveStyle('--reguide-card-padding: 28px')
    expect(layer).toHaveStyle('--reguide-card-vertical-offset: 30px')
    expect(layer).toHaveStyle('--reguide-title-color: #f8fafc')
    expect(layer).toHaveStyle('--reguide-body-color: #e2e8f0')

    const card = document.querySelector('.reguide-card') as HTMLElement
    expect(card).toHaveStyle('top: 50px')

    const cutout = document.querySelector('.reguide-cutout') as HTMLElement
    expect(cutout).toHaveStyle('border-radius: 24px')

    rectSpy.mockRestore()
  })

  it('uses per-step theme over global theme and can toggle step count per step', async () => {
    const user = userEvent.setup()
    const steps: ReguideStep[] = [
      {
        targetRef: createRef<HTMLElement>(),
        title: 'First',
        body: 'One',
      },
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Second',
        body: 'Two',
        theme: {
          card: {
            background: '#0b1020',
          },
          stepCount: {
            show: true,
          },
        },
      },
    ]

    render(
      <ReguideProvider
        steps={steps}
        initialOpen
        theme={{
          card: {
            background: '#f8fafc',
          },
          stepCount: {
            show: false,
          },
        }}
      >
        <Targets steps={steps} />
      </ReguideProvider>,
    )

    expect(screen.queryByText('Step 1 of 2')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next' }))

    const layer = document.querySelector('.reguide-layer') as HTMLElement
    expect(layer).toHaveStyle('--reguide-card-background: #0b1020')
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
  })

  it('gates Next in custom mode until validator passes', async () => {
    const user = userEvent.setup()
    const steps: ReguideStep[] = [
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Step one',
        body: 'Go to validator step',
      },
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Custom validation',
        body: 'Must type at least 3 chars',
        mode: 'custom',
        validator: ({ target }) => {
          const input = target as HTMLInputElement
          return input.value.trim().length >= 3
        },
      },
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Complete',
        body: 'Done',
      },
    ]

    render(<TestHarness steps={steps} />)

    await user.click(screen.getByRole('button', { name: 'Next' }))

    const next = screen.getByRole('button', { name: 'Next' })
    expect(next).toBeDisabled()

    await user.type(screen.getByLabelText('Target 2'), 'ab')
    expect(next).toBeDisabled()

    await user.type(screen.getByLabelText('Target 2'), 'c')
    expect(next).toBeEnabled()
  })

  it('supports async validators in custom mode', async () => {
    const user = userEvent.setup()
    const steps: ReguideStep[] = [
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Step one',
        body: 'Go to validator step',
      },
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Async custom validation',
        body: 'Must match expected token',
        mode: 'custom',
        validator: async ({ target }) => {
          const input = target as HTMLInputElement
          return input.value === 'publish'
        },
      },
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Complete',
        body: 'Done',
      },
    ]

    render(<TestHarness steps={steps} />)

    await user.click(screen.getByRole('button', { name: 'Next' }))
    const next = screen.getByRole('button', { name: 'Next' })

    await user.type(screen.getByLabelText('Target 2'), 'publish')

    await waitFor(() => {
      expect(next).toBeEnabled()
    })
  })

  it('can auto-progress when custom validation passes', async () => {
    const user = userEvent.setup()
    const steps: ReguideStep[] = [
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Step one',
        body: 'Go to validator step',
      },
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Custom validation',
        body: 'Type unlock to continue automatically',
        mode: 'custom',
        progressOnValidate: true,
        validator: async ({ target }) => {
          const input = target as HTMLInputElement
          return input.value === 'unlock'
        },
      },
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Auto progressed',
        body: 'Success',
      },
    ]

    render(<TestHarness steps={steps} />)

    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.type(screen.getByLabelText('Target 2'), 'unlock')

    await waitFor(() => {
      expect(screen.getByTestId('index')).toHaveTextContent('2')
    })
  })

  it('renders component body content', () => {
    const steps: ReguideStep[] = [
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Component body',
        body: <strong data-testid="body-component">Rich content</strong>,
      },
    ]

    render(
      <ReguideProvider steps={steps} initialOpen>
        <Targets steps={steps} />
      </ReguideProvider>,
    )

    expect(screen.getByTestId('body-component')).toBeInTheDocument()
  })

  it('centers card when step has no target', () => {
    const steps: ReguideStep[] = [
      {
        title: 'Announcement',
        body: 'Welcome to the product tour.',
      },
    ]

    render(
      <ReguideProvider
        steps={steps}
        initialOpen
        theme={{
          backdrop: {
            color: '#111827',
            opacity: 0.4,
          },
        }}
      >
        <div>App content</div>
      </ReguideProvider>,
    )

    const card = document.querySelector('.reguide-card') as HTMLElement
    const backdrop = document.querySelector('.reguide-backdrop') as HTMLElement
    expect(card).toHaveStyle('top: 274px')
    expect(card).toHaveStyle('left: 332px')
    expect(backdrop).toHaveStyle(
      'background-color: color-mix(in srgb, #111827 40%, transparent)',
    )
    expect(document.querySelector('.reguide-cutout')).not.toBeInTheDocument()
  })

  it('supports goToStepById navigation', async () => {
    const user = userEvent.setup()
    const steps: ReguideStep[] = [
      {
        id: 'intro',
        targetRef: createRef<HTMLElement>(),
        title: 'Intro',
        body: 'First',
      },
      {
        id: 'finish',
        targetRef: createRef<HTMLElement>(),
        title: 'Finish',
        body: 'Last',
      },
    ]

    render(
      <ReguideProvider steps={steps} initialOpen>
        <Controls />
        <IdControls />
        <Targets steps={steps} />
      </ReguideProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Go to finish' }))

    expect(screen.getByTestId('index')).toHaveTextContent('1')
    expect(screen.getByText('Finish')).toBeInTheDocument()
  })

  it('fires analytics callbacks for start, stop, and step changes', async () => {
    const user = userEvent.setup()
    const onStart = vi.fn()
    const onStop = vi.fn()
    const onStepChange = vi.fn()

    const steps: ReguideStep[] = [
      {
        id: 'first',
        targetRef: createRef<HTMLElement>(),
        title: 'First',
        body: 'One',
      },
      {
        id: 'second',
        targetRef: createRef<HTMLElement>(),
        title: 'Second',
        body: 'Two',
      },
    ]

    render(
      <ReguideProvider
        steps={steps}
        onStart={onStart}
        onStop={onStop}
        onStepChange={onStepChange}
      >
        <Controls />
        <Targets steps={steps} />
      </ReguideProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Start' }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Close' }))

    expect(onStart).toHaveBeenCalledTimes(1)
    expect(onStepChange).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'next',
        previousStepId: 'first',
        currentStepId: 'second',
      }),
    )
    expect(onStop).toHaveBeenCalledWith(
      expect.objectContaining({
        currentStepId: 'second',
      }),
    )
  })

  it('restores progress by step id with persistence key', () => {
    window.localStorage.setItem(
      'reguide:test-progress',
      JSON.stringify({
        stepId: 'second',
        stepIndex: 0,
      }),
    )

    const steps: ReguideStep[] = [
      {
        id: 'first',
        targetRef: createRef<HTMLElement>(),
        title: 'First',
        body: 'One',
      },
      {
        id: 'second',
        targetRef: createRef<HTMLElement>(),
        title: 'Second',
        body: 'Two',
      },
    ]

    render(
      <ReguideProvider steps={steps} persistence={{ key: 'reguide:test-progress' }}>
        <Controls />
        <Targets steps={steps} />
      </ReguideProvider>,
    )

    expect(screen.getByTestId('index')).toHaveTextContent('1')
  })
})
