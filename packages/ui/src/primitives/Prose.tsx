import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';

export interface ProseProps extends HTMLAttributes<HTMLDivElement> {
  muted?: boolean;
}

export const Prose = forwardRef<HTMLDivElement, ProseProps>(function Prose(
  { muted = false, className, ...rest },
  ref,
) {
  return (
    <div
      ref={ref}
      className={clsx(
        'font-sans text-base leading-body',
        muted ? 'text-muted-foreground' : 'text-foreground',
        // Nested element styles — kept tight to honor the "quiet, dense" brief.
        '[&_p]:my-4 [&_a]:text-accent [&_a:hover]:text-moss-300 [&_a]:underline [&_a]:underline-offset-4',
        '[&_code]:font-mono [&_code]:text-sm [&_code]:bg-ink-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded-sm',
        className,
      )}
      {...rest}
    />
  );
});

Prose.displayName = 'Prose';
