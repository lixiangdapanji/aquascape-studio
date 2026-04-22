import { forwardRef, type ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

export type ButtonVariant = 'primary' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const base =
  'inline-flex items-center justify-center font-medium rounded-md ' +
  'transition-colors duration-hover ease-out ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-focus-ring focus-visible:ring-offset-background ' +
  'disabled:opacity-50 disabled:pointer-events-none select-none';

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-bone-100 hover:bg-ink-700 active:bg-ink-700',
  ghost: 'bg-transparent text-bone-100 hover:bg-surface-hover',
  outline:
    'bg-transparent text-bone-100 border border-border hover:bg-surface-hover hover:border-accent',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-base',
  lg: 'h-12 px-5 text-md',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', fullWidth = false, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(
        base,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    />
  );
});

Button.displayName = 'Button';
