import React from 'react'
import { cn } from '@/utils/cn'

// ─── Button ──────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'success' | 'danger'
type ButtonSize    = 'sm' | 'md'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  full?: boolean
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:   'bg-accent text-white hover:bg-blue-400',
  secondary: 'bg-bg border border-border-2 text-text hover:border-accent hover:text-accent',
  ghost:     'bg-transparent border border-border text-text-2 hover:text-text hover:border-border-2',
  success:   'bg-accent-3 text-black hover:brightness-110',
  danger:    'border border-red-500 text-red-500 hover:bg-red-500 hover:text-white',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1 text-[11px]',
  md: 'px-3.5 py-1.5 text-[12px]',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  full = false,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md font-semibold font-sans',
        'transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        full && 'w-full justify-center',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

// ─── Badge ────────────────────────────────────────────────────────────────────

type BadgeVariant = 'blue' | 'green' | 'purple' | 'gray'

const badgeClasses: Record<BadgeVariant, string> = {
  blue:   'bg-blue-500/15 text-blue-400',
  green:  'bg-emerald-500/15 text-emerald-400',
  purple: 'bg-violet-500/15 text-violet-400',
  gray:   'bg-white/5 text-text-3',
}

export function Badge({ variant = 'gray', children, className }: {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}) {
  return (
    <span className={cn(
      'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
      badgeClasses[variant],
      className,
    )}>
      {children}
    </span>
  )
}

// ─── Section card ─────────────────────────────────────────────────────────────

export function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-bg-3 overflow-hidden', className)}>
      {children}
    </div>
  )
}

export function SectionHeader({
  title,
  accent = 'blue',
  children,
}: {
  title: string
  accent?: 'blue' | 'green' | 'purple' | 'amber'
  children?: React.ReactNode
}) {
  const dotColor = { blue: 'bg-accent', green: 'bg-accent-3', purple: 'bg-violet-400', amber: 'bg-amber-400' }[accent]
  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 bg-bg border-b border-border">
      <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-text-2">
        <span className={cn('w-1.5 h-1.5 rounded-full', dotColor)} />
        {title}
      </span>
      {children}
    </div>
  )
}

// ─── Input / Textarea ─────────────────────────────────────────────────────────

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'w-full bg-bg border border-border rounded-md text-text font-mono text-[12px] px-3 py-2.5',
        'outline-none focus:border-accent resize-y transition-colors placeholder:text-text-3',
        className,
      )}
      {...props}
    />
  )
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full bg-bg border border-border rounded-md text-text font-mono text-[12px] px-3 py-2.5',
        'outline-none focus:border-accent transition-colors placeholder:text-text-3',
        className,
      )}
      {...props}
    />
  )
}

export function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block text-[11px] text-text-2 mb-1.5 uppercase tracking-wider', className)}>
      {children}
    </label>
  )
}

export function FormGroup({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 last:mb-0">{children}</div>
}

// ─── Divider ──────────────────────────────────────────────────────────────────

export function Divider() {
  return <div className="border-t border-border my-3" />
}
