import type { CSSProperties, PropsWithChildren, ReactNode, RefObject } from 'react'

export type ReguideStepMode = 'default' | 'click' | 'interact' | 'custom'

export type ReguideStepChangeSource =
  | 'start'
  | 'next'
  | 'prev'
  | 'goToStep'
  | 'goToStepById'
  | 'click'
  | 'custom-auto'
  | 'restore'

export type ReguideStepValidatorEventType = 'click' | 'input' | 'keydown'

export interface ReguideStepValidatorContext {
  target: HTMLElement
  eventType: ReguideStepValidatorEventType
  event: Event
}

export type ReguideStepValidator = (
  context: ReguideStepValidatorContext,
) => boolean | Promise<boolean>

export interface ReguideBackdropTheme {
  color?: string
  opacity?: number
}

export interface ReguideCardTheme {
  background?: string
  border?: string
  padding?: number | string
  verticalOffset?: number
  className?: string
  style?: CSSProperties
}

export interface ReguideTextTheme {
  fontFamily?: string
  fontWeight?: number | string
  color?: string
}

export interface ReguideButtonTheme {
  background?: string
  border?: string
  color?: string
  fontFamily?: string
  fontWeight?: number | string
}

export interface ReguideButtonsTheme {
  primary?: ReguideButtonTheme
  secondary?: ReguideButtonTheme
}

export interface ReguideStepCountTheme {
  show?: boolean
}

export interface ReguideHighlightTheme {
  borderRadius?: number | string
  padding?: number
}

export interface ReguideTheme {
  backdrop?: ReguideBackdropTheme
  card?: ReguideCardTheme
  title?: ReguideTextTheme
  body?: ReguideTextTheme
  buttons?: ReguideButtonsTheme
  stepCount?: ReguideStepCountTheme
  highlight?: ReguideHighlightTheme
}

export interface ReguideStepChangeEvent {
  source: ReguideStepChangeSource
  currentStepIndex: number
  currentStepId?: string
  previousStepIndex: number
  previousStepId?: string
}

export interface ReguideStopEvent {
  currentStepIndex: number
  currentStepId?: string
}

export interface ReguidePersistenceOptions {
  key: string
  storage?: Storage
  persistIsOpen?: boolean
}

export type ReguideLifecycleCallbackResult = void | Promise<void>

interface ReguideStepBase {
  id?: string
  targetRef?: RefObject<HTMLElement | null>
  title: string
  body: ReactNode
  autoFocus?: boolean
  theme?: ReguideTheme
}

export interface ReguideCustomStep extends ReguideStepBase {
  mode: 'custom'
  validator: ReguideStepValidator
  progressOnValidate?: boolean
}

export interface ReguideStandardStep extends ReguideStepBase {
  mode?: Exclude<ReguideStepMode, 'custom'>
}

export type ReguideStep = ReguideCustomStep | ReguideStandardStep

export interface ReguideProviderProps extends PropsWithChildren {
  steps: ReguideStep[]
  initialOpen?: boolean
  theme?: ReguideTheme
  persistence?: ReguidePersistenceOptions
  onStart?: () => ReguideLifecycleCallbackResult
  onStop?: (event: ReguideStopEvent) => ReguideLifecycleCallbackResult
  onStepChange?: (event: ReguideStepChangeEvent) => ReguideLifecycleCallbackResult
}

export interface ReguideContextValue {
  isOpen: boolean
  steps: ReguideStep[]
  currentStepIndex: number
  currentStep: ReguideStep | null
  interactionSatisfied: boolean
  canGoNext: boolean
  canGoPrev: boolean
  start: () => Promise<void>
  stop: () => Promise<void>
  next: () => Promise<void>
  prev: () => Promise<void>
  goToStep: (index: number) => Promise<void>
  goToStepById: (id: string) => Promise<void>
}
