import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  interactive?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { padded = true, interactive = false, className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={clsx(
        'bg-surface border border-border/40 rounded-lg',
        padded && 'p-5',
        interactive &&
          'transition-colors duration-transition ease-transition hover:bg-surface-hover cursor-pointer',
        className,
      )}
      {...rest}
    />
  );
});

Card.displayName = 'Card';
