import { createRef, type RefObject } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
    <div>
      <button type="button" onClick={() => guide.goToStepById('finish')}>
        Go to finish
      </button>
      <button type="button" onClick={() => guide.goToStepById('missing')}>
        Go to missing
      </button>
    </div>
  )
}

function IndexControls() {
  const guide = useReguide()

  return (
    <div>
      <button type="button" onClick={() => guide.goToStep(99)}>
        Go to high index
      </button>
      <button type="button" onClick={() => guide.goToStep(-10)}>
        Go to low index
      </button>
    </div>
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

    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()

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

  it('goes back when Back is clicked on a later step', async () => {
    const user = userEvent.setup()
    const steps: ReguideStep[] = [
      {
        targetRef: createRef<HTMLElement>(),
        title: 'First',
        body: 'Move forward',
      },
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Second',
        body: 'Move backward',
      },
    ]

    render(<TestHarness steps={steps} />)

    await user.click(screen.getByRole('button', { name: 'Next' }))
    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByTestId('index')).toHaveTextContent('0')
  })

  it('closes on Escape key', () => {
    const steps: ReguideStep[] = [
      {
        targetRef: createRef<HTMLElement>(),
        title: 'First',
        body: 'Press escape',
      },
    ]

    render(<TestHarness steps={steps} />)

    fireEvent.keyDown(document, { key: 'Escape' })

    expect(screen.queryByRole('dialog', { name: 'First' })).not.toBeInTheDocument()
  })

  it('traps keyboard focus inside dialog with Tab and Shift+Tab', () => {
    const steps: ReguideStep[] = [
      {
        targetRef: createRef<HTMLElement>(),
        title: 'First',
        body: 'Check focus trap',
      },
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Second',
        body: 'Second step',
      },
    ]

    render(<TestHarness steps={steps} />)

    const closeSecondary = screen.getByRole('button', { name: 'Close' })
    const next = screen.getByRole('button', { name: 'Next' })

    closeSecondary.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(next).toHaveFocus()

    next.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(closeSecondary).toHaveFocus()
  })

  it('returns early on Tab when no focusable elements are found', () => {
    const querySpy = vi
      .spyOn(HTMLDivElement.prototype, 'querySelectorAll')
      .mockReturnValue([] as unknown as NodeListOf<HTMLElement>)

    const steps: ReguideStep[] = [
      {
        targetRef: createRef<HTMLElement>(),
        title: 'First',
        body: 'No focusables test',
      },
    ]

    render(<TestHarness steps={steps} />)

    expect(() => {
      fireEvent.keyDown(document, { key: 'Tab' })
    }).not.toThrow()

    querySpy.mockRestore()
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

  it('uses full step theme overrides including string sizes and NaN opacity fallback', () => {
    const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
      x: 0,
      y: 0,
      left: 20,
      top: 20,
      right: 120,
      bottom: 40,
      width: 100,
      height: 20,
      toJSON: () => ({}),
    }))

    const steps: ReguideStep[] = [
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Step themed',
        body: 'Theme details',
        theme: {
          backdrop: {
            color: '#0ea5e9',
            opacity: Number.NaN,
          },
          card: {
            background: '#111111',
            border: '3px solid #22c55e',
            padding: '2rem',
            verticalOffset: 18,
          },
          title: {
            fontFamily: 'Georgia, serif',
            fontWeight: 700,
            color: '#fafafa',
          },
          body: {
            fontFamily: 'Georgia, serif',
            fontWeight: 500,
            color: '#d4d4d4',
          },
          buttons: {
            secondary: {
              background: '#dcfce7',
              border: '1px solid #15803d',
              color: '#14532d',
              fontFamily: 'Georgia, serif',
              fontWeight: 600,
            },
            primary: {
              background: '#0369a1',
              border: '1px solid #075985',
              color: '#f8fafc',
              fontFamily: 'Georgia, serif',
              fontWeight: 700,
            },
          },
          stepCount: {
            show: true,
          },
          highlight: {
            borderRadius: '50%',
            padding: 10,
          },
        },
      },
    ]

    render(
      <ReguideProvider
        steps={steps}
        initialOpen
        theme={{
          backdrop: {
            color: '#ef4444',
            opacity: 0.2,
          },
        }}
      >
        <Targets steps={steps} />
      </ReguideProvider>,
    )

    const layer = document.querySelector('.reguide-layer') as HTMLElement
    const cutout = document.querySelector('.reguide-cutout') as HTMLElement

    expect(layer).toHaveStyle('--reguide-card-padding: 2rem')
    expect(layer).toHaveStyle('--reguide-card-background: #111111')
    expect(cutout).toHaveStyle('border-radius: 50%')
    expect(cutout).toHaveStyle(
      'box-shadow: 0 0 0 9999px color-mix(in srgb, #0ea5e9 62%, transparent), 0 8px 28px rgba(2, 6, 23, 0.5)',
    )

    rectSpy.mockRestore()
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

  it('keeps Next disabled when custom validator throws', async () => {
    const user = userEvent.setup()
    const steps: ReguideStep[] = [
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Step one',
        body: 'Go to validator step',
      },
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Throwing validation',
        body: 'Validator throws',
        mode: 'custom',
        validator: () => {
          throw new Error('Validation failed unexpectedly')
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
    fireEvent.input(screen.getByLabelText('Target 2'), { target: { value: 'boom' } })

    expect(next).toBeDisabled()
  })

  it('returns early if a custom step is mutated to a non-custom mode at runtime', async () => {
    const user = userEvent.setup()
    const validator = vi.fn(() => true)
    const steps: ReguideStep[] = [
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Step one',
        body: 'Go to validator step',
      },
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Custom step',
        body: 'Mutated mode',
        mode: 'custom',
        validator,
      },
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Complete',
        body: 'Done',
      },
    ]

    render(<TestHarness steps={steps} />)

    await user.click(screen.getByRole('button', { name: 'Next' }))

    ;(steps[1] as { mode?: string }).mode = 'default'
    fireEvent.input(screen.getByLabelText('Target 2'), { target: { value: 'abc' } })

    expect(validator).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('ignores stale validator rejection from an older run', async () => {
    const user = userEvent.setup()
    type ValidatorControl = {
      resolve: (value: boolean) => void
      reject: (error?: unknown) => void
    }
    const controls: ValidatorControl[] = []

    const steps: ReguideStep[] = [
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Step one',
        body: 'Go to validator step',
      },
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Async race validation',
        body: 'Latest run wins',
        mode: 'custom',
        validator: () => new Promise<boolean>((resolve, reject) => {
          controls.push({ resolve, reject })
        }),
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
    const input = screen.getByLabelText('Target 2')

    fireEvent.input(input, { target: { value: 'first' } })
    fireEvent.input(input, { target: { value: 'second' } })

    controls[1].resolve(true)
    await waitFor(() => {
      expect(next).toBeEnabled()
    })

    controls[0].reject(new Error('Late rejection from stale run'))

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
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()

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

  it('does not render a dialog when there are no steps', () => {
    render(
      <ReguideProvider steps={[]} initialOpen>
        <div>App content</div>
      </ReguideProvider>,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('positions card above target when there is not enough room below', () => {
    const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
      x: 0,
      y: 0,
      left: 100,
      top: 760,
      right: 220,
      bottom: 790,
      width: 120,
      height: 30,
      toJSON: () => ({}),
    }))

    const steps: ReguideStep[] = [
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Near bottom',
        body: 'Card should move above',
      },
    ]

    render(
      <ReguideProvider steps={steps} initialOpen>
        <Targets steps={steps} />
      </ReguideProvider>,
    )

    const card = document.querySelector('.reguide-card') as HTMLElement
    expect(card).toHaveStyle('top: 520px')

    rectSpy.mockRestore()
  })

  it('recalculates target position on window resize and scroll', () => {
    const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({
      x: 0,
      y: 0,
      left: 100,
      top: 100,
      right: 220,
      bottom: 130,
      width: 120,
      height: 30,
      toJSON: () => ({}),
    }))

    const steps: ReguideStep[] = [
      {
        targetRef: createRef<HTMLElement>(),
        title: 'Resizable',
        body: 'Recalculate on window changes',
      },
    ]

    render(
      <ReguideProvider steps={steps} initialOpen>
        <Targets steps={steps} />
      </ReguideProvider>,
    )

    const callsBefore = rectSpy.mock.calls.length
    fireEvent(window, new Event('resize'))
    fireEvent(window, new Event('scroll'))

    expect(rectSpy.mock.calls.length).toBeGreaterThan(callsBefore)

    rectSpy.mockRestore()
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

  it('does nothing when goToStepById receives an unknown id', async () => {
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

    await user.click(screen.getByRole('button', { name: 'Go to missing' }))

    expect(screen.getByTestId('index')).toHaveTextContent('0')
    expect(screen.getByText('Intro')).toBeInTheDocument()
  })

  it('clamps goToStep target index to valid range', async () => {
    const user = userEvent.setup()
    const steps: ReguideStep[] = [
      {
        id: 'intro',
        targetRef: createRef<HTMLElement>(),
        title: 'Intro',
        body: 'First',
      },
      {
        id: 'middle',
        targetRef: createRef<HTMLElement>(),
        title: 'Middle',
        body: 'Second',
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
        <IndexControls />
        <Targets steps={steps} />
      </ReguideProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Go to high index' }))
    expect(screen.getByTestId('index')).toHaveTextContent('2')
    expect(screen.getByText('Finish')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Go to low index' }))
    expect(screen.getByTestId('index')).toHaveTextContent('0')
    expect(screen.getByText('Intro')).toBeInTheDocument()
  })

  it('throws when useReguide is used outside the provider', () => {
    function RogueConsumer() {
      useReguide()
      return null
    }

    expect(() => render(<RogueConsumer />)).toThrow(
      'useReguide must be used within a ReguideProvider',
    )
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

  it('restores progress by persisted stepIndex when stepId is missing', () => {
    window.localStorage.setItem(
      'reguide:test-progress-index-only',
      JSON.stringify({
        stepIndex: 1,
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
      <ReguideProvider
        steps={steps}
        persistence={{ key: 'reguide:test-progress-index-only' }}
      >
        <Controls />
        <Targets steps={steps} />
      </ReguideProvider>,
    )

    expect(screen.getByTestId('index')).toHaveTextContent('1')
  })

  it('restores open state when persisted isOpen is true', () => {
    window.localStorage.setItem(
      'reguide:test-open-state',
      JSON.stringify({
        stepId: 'first',
        isOpen: true,
      }),
    )

    const steps: ReguideStep[] = [
      {
        id: 'first',
        targetRef: createRef<HTMLElement>(),
        title: 'First',
        body: 'One',
      },
    ]

    render(
      <ReguideProvider steps={steps} persistence={{ key: 'reguide:test-open-state' }}>
        <Controls />
        <Targets steps={steps} />
      </ReguideProvider>,
    )

    expect(screen.getByRole('dialog', { name: 'First' })).toBeInTheDocument()
  })

  it('ignores malformed persistence payloads', () => {
    window.localStorage.setItem('reguide:test-malformed', '{invalid json')

    const steps: ReguideStep[] = [
      {
        id: 'first',
        targetRef: createRef<HTMLElement>(),
        title: 'First',
        body: 'One',
      },
    ]

    expect(() => {
      render(
        <ReguideProvider steps={steps} persistence={{ key: 'reguide:test-malformed' }}>
          <Controls />
          <Targets steps={steps} />
        </ReguideProvider>,
      )
    }).not.toThrow()

    expect(screen.getByTestId('index')).toHaveTextContent('0')
  })

  it('ignores persistence write errors', () => {
    const setItem = vi.fn(() => {
      throw new Error('Storage unavailable')
    })

    const storage = {
      getItem: vi.fn(() => null),
      setItem,
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(() => null),
      length: 0,
    } as unknown as Storage

    const steps: ReguideStep[] = [
      {
        id: 'first',
        targetRef: createRef<HTMLElement>(),
        title: 'First',
        body: 'One',
      },
    ]

    expect(() => {
      render(
        <ReguideProvider steps={steps} persistence={{ key: 'reguide:test-write-fail', storage }}>
          <Targets steps={steps} />
        </ReguideProvider>,
      )
    }).not.toThrow()

    expect(setItem).toHaveBeenCalled()
  })

  it('skips persistence restore and write when localStorage is unavailable', () => {
    const localStorageSpy = vi
      .spyOn(window, 'localStorage', 'get')
      .mockReturnValue(null as unknown as Storage)

    const steps: ReguideStep[] = [
      {
        id: 'first',
        targetRef: createRef<HTMLElement>(),
        title: 'First',
        body: 'One',
      },
    ]

    expect(() => {
      render(
        <ReguideProvider steps={steps} persistence={{ key: 'reguide:test-no-storage' }}>
          <Controls />
          <Targets steps={steps} />
        </ReguideProvider>,
      )
    }).not.toThrow()

    expect(screen.getByTestId('index')).toHaveTextContent('0')

    localStorageSpy.mockRestore()
  })
})
