import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { createPortal } from 'react-dom'
import type {
  ReguideContextValue,
  ReguidePersistenceOptions,
  ReguideProviderProps,
  ReguideStepChangeSource,
  ReguideStep,
  ReguideStepValidatorEventType,
  ReguideStepMode,
  ReguideTheme,
} from './types'
import './styles.css'

interface TargetRect {
  left: number
  top: number
  width: number
  height: number
}

interface ResolvedReguideTheme {
  backdrop: {
    color: string
    opacity: number
  }
  card: {
    background: string
    border: string
    padding: number | string
    verticalOffset: number
  }
  title: {
    fontFamily: string
    fontWeight: number | string
    color: string
  }
  body: {
    fontFamily: string
    fontWeight: number | string
    color: string
  }
  buttons: {
    secondary: {
      background: string
      border: string
      color: string
      fontFamily: string
      fontWeight: number | string
    }
    primary: {
      background: string
      border: string
      color: string
      fontFamily: string
      fontWeight: number | string
    }
  }
  stepCount: {
    show: boolean
  }
  highlight: {
    borderRadius: number | string
    padding: number
  }
}

const DEFAULT_THEME: ResolvedReguideTheme = {
  backdrop: {
    color: '#0f172a',
    opacity: 0.62,
  },
  card: {
    background: '#ffffff',
    border: '1px solid #d6dce7',
    padding: 16,
    verticalOffset: 12,
  },
  title: {
    fontFamily: 'inherit',
    fontWeight: 600,
    color: '#0f172a',
  },
  body: {
    fontFamily: 'inherit',
    fontWeight: 400,
    color: '#334155',
  },
  buttons: {
    secondary: {
      background: '#f8fafc',
      border: '1px solid #cbd5e1',
      color: '#0f172a',
      fontFamily: 'inherit',
      fontWeight: 500,
    },
    primary: {
      background: '#0f172a',
      border: '1px solid #0f172a',
      color: '#ffffff',
      fontFamily: 'inherit',
      fontWeight: 600,
    },
  },
  stepCount: {
    show: true,
  },
  highlight: {
    borderRadius: 12,
    padding: 8,
  },
}

const ReguideContext = createContext<ReguideContextValue | null>(null)

interface PersistedReguideState {
  stepId?: string
  stepIndex?: number
  isOpen?: boolean
}

function isSameTargetRect(nextRect: TargetRect | null, previousRect: TargetRect | null): boolean {
  if (nextRect === previousRect) {
    return true
  }

  if (!nextRect || !previousRect) {
    return false
  }

  return nextRect.left === previousRect.left
    && nextRect.top === previousRect.top
    && nextRect.width === previousRect.width
    && nextRect.height === previousRect.height
}

function toSize(value: number | string): string {
  return typeof value === 'number' ? `${value}px` : value
}

function clampOpacity(value: number): number {
  if (Number.isNaN(value)) {
    return DEFAULT_THEME.backdrop.opacity
  }

  return Math.max(0, Math.min(value, 1))
}

function getBackdropColor(color: string, opacity: number): string {
  return `color-mix(in srgb, ${color} ${clampOpacity(opacity) * 100}%, transparent)`
}

function getPersistenceStorage(persistence?: ReguidePersistenceOptions): Storage | null {
  if (persistence?.storage) {
    return persistence.storage
  }

  /* c8 ignore next 3 */
  if (typeof window === 'undefined') {
    return null
  }

  return window.localStorage
}

function resolveTheme(providerTheme?: ReguideTheme, stepTheme?: ReguideTheme): ResolvedReguideTheme {
  return {
    backdrop: {
      color: stepTheme?.backdrop?.color
        ?? providerTheme?.backdrop?.color
        ?? DEFAULT_THEME.backdrop.color,
      opacity: stepTheme?.backdrop?.opacity
        ?? providerTheme?.backdrop?.opacity
        ?? DEFAULT_THEME.backdrop.opacity,
    },
    card: {
      background: stepTheme?.card?.background
        ?? providerTheme?.card?.background
        ?? DEFAULT_THEME.card.background,
      border: stepTheme?.card?.border
        ?? providerTheme?.card?.border
        ?? DEFAULT_THEME.card.border,
      padding: stepTheme?.card?.padding
        ?? providerTheme?.card?.padding
        ?? DEFAULT_THEME.card.padding,
      verticalOffset: stepTheme?.card?.verticalOffset
        ?? providerTheme?.card?.verticalOffset
        ?? DEFAULT_THEME.card.verticalOffset,
    },
    title: {
      fontFamily: stepTheme?.title?.fontFamily
        ?? providerTheme?.title?.fontFamily
        ?? DEFAULT_THEME.title.fontFamily,
      fontWeight: stepTheme?.title?.fontWeight
        ?? providerTheme?.title?.fontWeight
        ?? DEFAULT_THEME.title.fontWeight,
      color: stepTheme?.title?.color
        ?? providerTheme?.title?.color
        ?? DEFAULT_THEME.title.color,
    },
    body: {
      fontFamily: stepTheme?.body?.fontFamily
        ?? providerTheme?.body?.fontFamily
        ?? DEFAULT_THEME.body.fontFamily,
      fontWeight: stepTheme?.body?.fontWeight
        ?? providerTheme?.body?.fontWeight
        ?? DEFAULT_THEME.body.fontWeight,
      color: stepTheme?.body?.color
        ?? providerTheme?.body?.color
        ?? DEFAULT_THEME.body.color,
    },
    buttons: {
      secondary: {
        background: stepTheme?.buttons?.secondary?.background
          ?? providerTheme?.buttons?.secondary?.background
          ?? DEFAULT_THEME.buttons.secondary.background,
        border: stepTheme?.buttons?.secondary?.border
          ?? providerTheme?.buttons?.secondary?.border
          ?? DEFAULT_THEME.buttons.secondary.border,
        color: stepTheme?.buttons?.secondary?.color
          ?? providerTheme?.buttons?.secondary?.color
          ?? DEFAULT_THEME.buttons.secondary.color,
        fontFamily: stepTheme?.buttons?.secondary?.fontFamily
          ?? providerTheme?.buttons?.secondary?.fontFamily
          ?? DEFAULT_THEME.buttons.secondary.fontFamily,
        fontWeight: stepTheme?.buttons?.secondary?.fontWeight
          ?? providerTheme?.buttons?.secondary?.fontWeight
          ?? DEFAULT_THEME.buttons.secondary.fontWeight,
      },
      primary: {
        background: stepTheme?.buttons?.primary?.background
          ?? providerTheme?.buttons?.primary?.background
          ?? DEFAULT_THEME.buttons.primary.background,
        border: stepTheme?.buttons?.primary?.border
          ?? providerTheme?.buttons?.primary?.border
          ?? DEFAULT_THEME.buttons.primary.border,
        color: stepTheme?.buttons?.primary?.color
          ?? providerTheme?.buttons?.primary?.color
          ?? DEFAULT_THEME.buttons.primary.color,
        fontFamily: stepTheme?.buttons?.primary?.fontFamily
          ?? providerTheme?.buttons?.primary?.fontFamily
          ?? DEFAULT_THEME.buttons.primary.fontFamily,
        fontWeight: stepTheme?.buttons?.primary?.fontWeight
          ?? providerTheme?.buttons?.primary?.fontWeight
          ?? DEFAULT_THEME.buttons.primary.fontWeight,
      },
    },
    stepCount: {
      show: stepTheme?.stepCount?.show
        ?? providerTheme?.stepCount?.show
        ?? DEFAULT_THEME.stepCount.show,
    },
    highlight: {
      borderRadius: stepTheme?.highlight?.borderRadius
        ?? providerTheme?.highlight?.borderRadius
        ?? DEFAULT_THEME.highlight.borderRadius,
      padding: stepTheme?.highlight?.padding
        ?? providerTheme?.highlight?.padding
        ?? DEFAULT_THEME.highlight.padding,
    },
  }
}

function joinClassNames(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

function getStepMode(step: ReguideStep | null): ReguideStepMode {
  return step?.mode ?? 'default'
}

function getTargetRect(target: HTMLElement | null, padding: number): TargetRect | null {
  if (!target) {
    return null
  }

  const rect = target.getBoundingClientRect()
  return {
    left: rect.left - padding,
    top: rect.top - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  }
}

function getCardPosition(
  targetRect: TargetRect | null,
  verticalOffset: number,
): { top: number; left: number } {
  if (!targetRect) {
    const cardWidth = Math.min(360, window.innerWidth - 24)
    return {
      top: Math.max(12, (window.innerHeight - 220) / 2),
      left: Math.max(12, (window.innerWidth - cardWidth) / 2),
    }
  }

  const cardWidth = Math.min(360, window.innerWidth - 24)
  const proposedTop = targetRect.top + targetRect.height + verticalOffset
  const fitBelow = proposedTop + 220 <= window.innerHeight
  const top = fitBelow
    ? proposedTop
    : Math.max(12, targetRect.top - 220 - verticalOffset)

  const centered = targetRect.left + targetRect.width / 2 - cardWidth / 2
  const left = Math.min(Math.max(12, centered), window.innerWidth - cardWidth - 12)

  return { top, left }
}

export function ReguideProvider({
  steps,
  children,
  initialOpen = false,
  theme,
  persistence,
  onStart,
  onStop,
  onStepChange,
}: ReguideProviderProps) {
  const [isOpen, setIsOpen] = useState(initialOpen)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null)
  const [interactionSatisfied, setInteractionSatisfied] = useState(false)
  const [customValidationSatisfied, setCustomValidationSatisfied] = useState(false)
  const dialogRef = useRef<HTMLDivElement | null>(null)
  const lastFocusedRef = useRef<HTMLElement | null>(null)
  const autoFocusedStepKeyRef = useRef<string | null>(null)
  const actionQueueRef = useRef<Promise<void>>(Promise.resolve())
  const validationRunIdRef = useRef(0)
  const hasRestoredRef = useRef(false)
  const currentStepIndexRef = useRef(0)

  const currentStep = steps[currentStepIndex] ?? null
  const stepMode = getStepMode(currentStep)
  const stepIndexById = useMemo(() => {
    const byId = new Map<string, number>()
    steps.forEach((step, index) => {
      if (step.id) {
        byId.set(step.id, index)
      }
    })
    return byId
  }, [steps])
  const resolvedTheme = useMemo(
    () => resolveTheme(theme, currentStep?.theme),
    [theme, currentStep],
  )
  const highlightPadding = Math.max(0, resolvedTheme.highlight.padding)

  const layerStyle = {
    '--reguide-card-background': resolvedTheme.card.background,
    '--reguide-card-border': resolvedTheme.card.border,
    '--reguide-card-padding': toSize(resolvedTheme.card.padding),
    '--reguide-card-vertical-offset': toSize(resolvedTheme.card.verticalOffset),
    '--reguide-title-font-family': resolvedTheme.title.fontFamily,
    '--reguide-title-font-weight': String(resolvedTheme.title.fontWeight),
    '--reguide-title-color': resolvedTheme.title.color,
    '--reguide-body-font-family': resolvedTheme.body.fontFamily,
    '--reguide-body-font-weight': String(resolvedTheme.body.fontWeight),
    '--reguide-body-color': resolvedTheme.body.color,
    '--reguide-button-secondary-background': resolvedTheme.buttons.secondary.background,
    '--reguide-button-secondary-border': resolvedTheme.buttons.secondary.border,
    '--reguide-button-secondary-color': resolvedTheme.buttons.secondary.color,
    '--reguide-button-secondary-font-family': resolvedTheme.buttons.secondary.fontFamily,
    '--reguide-button-secondary-font-weight': String(resolvedTheme.buttons.secondary.fontWeight),
    '--reguide-button-primary-background': resolvedTheme.buttons.primary.background,
    '--reguide-button-primary-border': resolvedTheme.buttons.primary.border,
    '--reguide-button-primary-color': resolvedTheme.buttons.primary.color,
    '--reguide-button-primary-font-family': resolvedTheme.buttons.primary.fontFamily,
    '--reguide-button-primary-font-weight': String(resolvedTheme.buttons.primary.fontWeight),
    '--reguide-highlight-radius': toSize(resolvedTheme.highlight.borderRadius),
    '--reguide-layer-z-index': '9999',
  } as CSSProperties

  const cardStyle: CSSProperties = {
    ...getCardPosition(targetRect, resolvedTheme.card.verticalOffset),
    ...theme?.card?.style,
    ...currentStep?.theme?.card?.style,
  }

  const cardClassName = joinClassNames(
    'reguide-card',
    theme?.card?.className,
    currentStep?.theme?.card?.className,
  )

  const enqueueAction = useCallback((action: () => Promise<void>) => {
    const run = actionQueueRef.current
      .catch(() => undefined)
      .then(action)
    actionQueueRef.current = run
    return run
  }, [])

  const updateTargetRect = useCallback((nextTargetRect: TargetRect | null) => {
    setTargetRect((previousTargetRect) => {
      if (isSameTargetRect(nextTargetRect, previousTargetRect)) {
        return previousTargetRect
      }

      return nextTargetRect
    })
  }, [])

  const setCurrentStepIndexState = useCallback((nextIndex: number) => {
    const nextStep = steps[nextIndex]
    const nextTheme = resolveTheme(theme, nextStep?.theme)
    const nextHighlightPadding = Math.max(0, nextTheme.highlight.padding)
    const nextTargetRect = getTargetRect(nextStep?.targetRef?.current ?? null, nextHighlightPadding)
    const nextStepMode = getStepMode(nextStep ?? null)
    const nextStepHasTargetRef = Boolean(nextStep?.targetRef)

    currentStepIndexRef.current = nextIndex
    updateTargetRect(nextTargetRect)
    setInteractionSatisfied(nextStepMode !== 'interact' || !nextStepHasTargetRef)
    setCustomValidationSatisfied(nextStepMode !== 'custom' || !nextStepHasTargetRef)
    validationRunIdRef.current += 1
    setCurrentStepIndex(nextIndex)
  }, [steps, theme, updateTargetRect])

  const invokeStart = useCallback(async () => {
    try {
      await onStart?.()
    } catch {
      // Ignore consumer callback failures.
    }
  }, [onStart])

  const invokeStop = useCallback(async (stepIndex: number) => {
    try {
      await onStop?.({
        currentStepIndex: stepIndex,
        currentStepId: steps[stepIndex]?.id,
      })
    } catch {
      // Ignore consumer callback failures.
    }
  }, [onStop, steps])

  const invokeStepChange = useCallback(async (
    nextStepIndex: number,
    source: ReguideStepChangeSource,
    previousStepIndex: number,
  ) => {
    if (nextStepIndex === previousStepIndex) {
      return
    }

    try {
      await onStepChange?.({
        source,
        currentStepIndex: nextStepIndex,
        currentStepId: steps[nextStepIndex]?.id,
        previousStepIndex,
        previousStepId: steps[previousStepIndex]?.id,
      })
    } catch {
      // Ignore consumer callback failures.
    }
  }, [onStepChange, steps])

  const transitionToStep = useCallback(async (
    nextStepIndex: number,
    source: ReguideStepChangeSource,
  ) => {
    const previousStepIndex = currentStepIndexRef.current
    setCurrentStepIndexState(nextStepIndex)
    await invokeStepChange(nextStepIndex, source, previousStepIndex)
  }, [invokeStepChange, setCurrentStepIndexState])

  const resolveTargetRect = useCallback(() => {
    if (!currentStep?.targetRef) {
      updateTargetRect(null)
      return true
    }

    const nextTargetRect = getTargetRect(currentStep.targetRef.current ?? null, highlightPadding)
    updateTargetRect(nextTargetRect)
    return Boolean(nextTargetRect)
  }, [currentStep, highlightPadding, updateTargetRect])

  useEffect(() => {
    if (!isOpen) {
      updateTargetRect(null)
      return
    }

    let frameId = 0
    let remainingAnimationFrames = 10
    let observer: MutationObserver | null = null

    const tryResolve = () => {
      const resolved = resolveTargetRect()
      if (!resolved && currentStep?.targetRef && remainingAnimationFrames > 0) {
        remainingAnimationFrames -= 1
        frameId = window.requestAnimationFrame(tryResolve)
      }

      return resolved
    }

    const onWindowChange = () => {
      void tryResolve()
    }

    const resolvedImmediately = tryResolve()

    if (!resolvedImmediately && currentStep?.targetRef && typeof MutationObserver !== 'undefined') {
      observer = new MutationObserver(() => {
        if (tryResolve()) {
          observer?.disconnect()
          observer = null
        }
      })

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      })
    }

    window.addEventListener('resize', onWindowChange)
    window.addEventListener('scroll', onWindowChange, true)

    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId)
      }

      observer?.disconnect()
      window.removeEventListener('resize', onWindowChange)
      window.removeEventListener('scroll', onWindowChange, true)
    }
  }, [currentStep, isOpen, resolveTargetRect, updateTargetRect])

  useEffect(() => {
    const hasTargetRef = Boolean(currentStep?.targetRef)
    setInteractionSatisfied(stepMode !== 'interact' || !hasTargetRef)
    setCustomValidationSatisfied(stepMode !== 'custom' || !hasTargetRef)
    validationRunIdRef.current += 1
  }, [stepMode, currentStep, currentStepIndex])

  useEffect(() => {
    if (!persistence || hasRestoredRef.current) {
      return
    }

    hasRestoredRef.current = true
    const storage = getPersistenceStorage(persistence)
    if (!storage) {
      return
    }

    try {
      const raw = storage.getItem(persistence.key)
      if (!raw) {
        return
      }

      const parsed = JSON.parse(raw) as PersistedReguideState
      const stepIndexFromId = parsed.stepId ? stepIndexById.get(parsed.stepId) : undefined
      const resolvedIndex = stepIndexFromId ?? parsed.stepIndex

      if (typeof resolvedIndex === 'number') {
        const safeIndex = Math.max(0, Math.min(resolvedIndex, steps.length - 1))
        const previousStepIndex = currentStepIndexRef.current
        setCurrentStepIndexState(safeIndex)
        void invokeStepChange(safeIndex, 'restore', previousStepIndex)
      }

      if ((persistence.persistIsOpen ?? true) && typeof parsed.isOpen === 'boolean') {
        setIsOpen(parsed.isOpen)
      }
    } catch {
      // Ignore malformed persistence data.
    }
  }, [invokeStepChange, persistence, setCurrentStepIndexState, stepIndexById, steps.length])

  useEffect(() => {
    if (!persistence) {
      return
    }

    const storage = getPersistenceStorage(persistence)
    if (!storage) {
      return
    }

    const current = steps[currentStepIndex]
    const state: PersistedReguideState = {
      stepId: current?.id,
      stepIndex: currentStepIndex,
    }

    if (persistence.persistIsOpen ?? true) {
      state.isOpen = isOpen
    }

    try {
      storage.setItem(persistence.key, JSON.stringify(state))
    } catch {
      // Ignore storage write failures.
    }
  }, [currentStepIndex, isOpen, persistence, steps])

  useEffect(() => {
    if (!isOpen || !currentStep?.autoFocus) {
      return
    }

    const focusTarget = currentStep.targetRef?.current
    const stepKey = `${currentStepIndex}:${currentStep.id ?? ''}`
    if (!focusTarget || autoFocusedStepKeyRef.current === stepKey) {
      return
    }

    focusTarget.focus()
    autoFocusedStepKeyRef.current = stepKey
  }, [currentStep, currentStepIndex, isOpen, targetRect])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const target = currentStep?.targetRef?.current
    if (!target) {
      return
    }

    const satisfy = () => {
      setInteractionSatisfied(true)
    }

    const runCustomValidation = async (eventType: ReguideStepValidatorEventType, event: Event) => {
      if (stepMode !== 'custom' || currentStep?.mode !== 'custom') {
        return
      }

      const runId = ++validationRunIdRef.current

      try {
        const result = await currentStep.validator({
          target,
          eventType,
          event,
        })

        if (runId !== validationRunIdRef.current) {
          return
        }

        const passed = Boolean(result)
        setCustomValidationSatisfied(passed)

        if (passed && currentStep.progressOnValidate) {
          const nextStepIndex = Math.min(currentStepIndexRef.current + 1, steps.length - 1)
          void enqueueAction(async () => {
            await transitionToStep(nextStepIndex, 'custom-auto')
          })
        }
      } catch {
        if (runId !== validationRunIdRef.current) {
          return
        }

        setCustomValidationSatisfied(false)
      }
    }

    const onClick = (event: Event) => {
      if (stepMode === 'click') {
        const nextStepIndex = Math.min(currentStepIndexRef.current + 1, steps.length - 1)
        void enqueueAction(async () => {
          await transitionToStep(nextStepIndex, 'click')
        })
      }

      if (stepMode === 'interact') {
        satisfy()
      }

      if (stepMode === 'custom') {
        void runCustomValidation('click', event)
      }
    }

    const onInput = (event: Event) => {
      if (stepMode === 'interact') {
        satisfy()
      }

      if (stepMode === 'custom') {
        void runCustomValidation('input', event)
      }
    }

    const onKeyDown = (event: Event) => {
      if (stepMode === 'interact') {
        satisfy()
      }

      if (stepMode === 'custom') {
        void runCustomValidation('keydown', event)
      }
    }

    target.addEventListener('click', onClick)
    target.addEventListener('input', onInput)
    target.addEventListener('keydown', onKeyDown)

    return () => {
      target.removeEventListener('click', onClick)
      target.removeEventListener('input', onInput)
      target.removeEventListener('keydown', onKeyDown)
    }
  }, [currentStep, enqueueAction, isOpen, stepMode, steps.length, transitionToStep])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        setIsOpen(false)
      }

      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )

        if (focusable.length === 0) {
          return
        }

        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        const active = document.activeElement

        if (event.shiftKey && active === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && active === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  const start = useCallback(() => enqueueAction(async () => {
    const previousStepIndex = currentStepIndexRef.current
    lastFocusedRef.current = document.activeElement as HTMLElement | null
    setCurrentStepIndexState(0)
    setIsOpen(true)
    await invokeStart()
    await invokeStepChange(0, 'start', previousStepIndex)
  }), [enqueueAction, invokeStart, invokeStepChange, setCurrentStepIndexState])

  const stop = useCallback(() => enqueueAction(async () => {
    const activeStepIndex = currentStepIndexRef.current
    setIsOpen(false)
    lastFocusedRef.current?.focus()
    await invokeStop(activeStepIndex)
  }), [enqueueAction, invokeStop])

  const next = useCallback(() => enqueueAction(async () => {
    const nextStepIndex = Math.min(currentStepIndexRef.current + 1, steps.length - 1)
    await transitionToStep(nextStepIndex, 'next')
  }), [enqueueAction, steps.length, transitionToStep])

  const prev = useCallback(() => enqueueAction(async () => {
    const previousStepIndex = Math.max(currentStepIndexRef.current - 1, 0)
    await transitionToStep(previousStepIndex, 'prev')
  }), [enqueueAction, transitionToStep])

  const goToStep = useCallback(
    (index: number) => enqueueAction(async () => {
      const safeIndex = Math.max(0, Math.min(index, steps.length - 1))
      await transitionToStep(safeIndex, 'goToStep')
    }),
    [enqueueAction, steps.length, transitionToStep],
  )

  const goToStepById = useCallback(
    (id: string) => enqueueAction(async () => {
      const stepIndex = stepIndexById.get(id)
      if (typeof stepIndex !== 'number') {
        return
      }

      await transitionToStep(stepIndex, 'goToStepById')
    }),
    [enqueueAction, stepIndexById, transitionToStep],
  )

  const canGoPrev = currentStepIndex > 0
  const isLastStep = currentStepIndex === steps.length - 1
  const hideNextButton = stepMode === 'click'
    || (stepMode === 'custom' && currentStep?.mode === 'custom' && Boolean(currentStep.progressOnValidate))
  const modeRequirement = stepMode === 'interact'
    ? interactionSatisfied
    : stepMode === 'custom'
      ? customValidationSatisfied
      : true
  const canGoNext = !isLastStep && modeRequirement

  const value = useMemo<ReguideContextValue>(
    () => ({
      isOpen,
      steps,
      currentStepIndex,
      currentStep,
      interactionSatisfied,
      canGoNext,
      canGoPrev,
      start,
      stop,
      next,
      prev,
      goToStep,
      goToStepById,
    }),
    [
      canGoNext,
      canGoPrev,
      currentStep,
      currentStepIndex,
      goToStep,
      goToStepById,
      interactionSatisfied,
      isOpen,
      next,
      prev,
      start,
      steps,
      stop,
    ],
  )

  const showCard = isOpen && currentStep
  const showStepCount = resolvedTheme.stepCount.show
  const bodyContent = currentStep?.body
  const isTextBody = typeof bodyContent === 'string' || typeof bodyContent === 'number'

  return (
    <ReguideContext.Provider value={value}>
      {children}
      {showCard
        ? createPortal(
            <div className="reguide-layer" aria-live="polite" style={layerStyle}>
              {targetRect
                ? (
                    <div
                      className="reguide-cutout"
                      style={{
                        left: targetRect.left,
                        top: targetRect.top,
                        width: targetRect.width,
                        height: targetRect.height,
                        borderRadius: toSize(resolvedTheme.highlight.borderRadius),
                        boxShadow: `0 0 0 9999px ${getBackdropColor(
                          resolvedTheme.backdrop.color,
                          resolvedTheme.backdrop.opacity,
                        )}, 0 8px 28px rgba(2, 6, 23, 0.5)`,
                      }}
                    />
                  )
                : (
                    <div
                      className="reguide-backdrop"
                      style={{
                        backgroundColor: getBackdropColor(
                          resolvedTheme.backdrop.color,
                          resolvedTheme.backdrop.opacity,
                        ),
                      }}
                    />
                  )}
              <div
                className={cardClassName}
                role="dialog"
                aria-modal="true"
                aria-label={currentStep.title}
                style={cardStyle}
                ref={dialogRef}
              >
                {showStepCount
                  ? (
                      <div className="reguide-progress">
                        Step {currentStepIndex + 1} of {steps.length}
                      </div>
                    )
                  : null}
                <h2>{currentStep.title}</h2>
                {isTextBody
                  ? <p className="reguide-body">{bodyContent}</p>
                  : <div className="reguide-body">{bodyContent}</div>}
                <div className="reguide-actions">
                  {!isLastStep
                    ? (
                        <button type="button" onClick={stop}>
                          Close
                        </button>
                      )
                    : null}
                  <button type="button" onClick={prev} disabled={!canGoPrev}>
                    Back
                  </button>
                  {isLastStep
                    ? (
                        <button
                          type="button"
                          data-kind="primary"
                          onClick={stop}
                        >
                          Close
                        </button>
                      )
                    : !hideNextButton
                      ? (
                        <button
                          type="button"
                          data-kind="primary"
                          onClick={next}
                          disabled={!canGoNext}
                        >
                          Next
                        </button>
                        )
                      : null}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </ReguideContext.Provider>
  )
}

export function useReguide() {
  const context = useContext(ReguideContext)

  if (!context) {
    throw new Error('useReguide must be used within a ReguideProvider')
  }

  return context
}
