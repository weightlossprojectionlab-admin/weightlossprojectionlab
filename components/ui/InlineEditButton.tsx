/**
 * InlineEditButton — canonical affordance for "tap to start
 * inline editing" on a field/row.
 *
 * Why this exists: the bare-text "Edit" link pattern (purple text
 * floated to the right of a row) reads as styled text rather than
 * a button on touch devices — hover doesn't fire, so there's no
 * affordance feedback. This component is the single source of
 * truth for what that trigger looks like: bordered chip, 44px
 * minimum hit target, visible press state.
 *
 * Use this anywhere a tap should swap a display row into an inline
 * editor. NOT for buttons that open modals or navigate — those are
 * different affordances (use a styled <button> directly).
 *
 * Semantic check: if the action is "edit this thing in place,"
 * this is the right primitive. If the action is "open a modal to
 * edit this thing," use a different button style — modals are
 * action surfaces, not inline-edit triggers.
 */

'use client'

import { forwardRef, type ButtonHTMLAttributes } from 'react'

interface InlineEditButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Optional override of the label. Defaults to "Edit". */
  label?: string
}

export const InlineEditButton = forwardRef<HTMLButtonElement, InlineEditButtonProps>(
  function InlineEditButton({ label = 'Edit', className = '', ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        data-write="true"
        // min-h-11 (44px) hits the WCAG / Apple HIG touch target
        // floor. The bordered chip + subtle fill makes the
        // affordance visible without hover (touch devices). -my-1
        // keeps the padded button from inflating row height when
        // placed inside a flex row.
        className={
          'inline-flex items-center min-h-11 px-3 -my-1 text-sm text-primary font-medium flex-shrink-0 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 active:bg-primary/15 disabled:opacity-50 ' +
          className
        }
        {...rest}
      >
        {label}
      </button>
    )
  }
)
