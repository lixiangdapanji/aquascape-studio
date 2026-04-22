import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';

export type HeadingLevel = 1 | 2 | 3 | 4;

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
  display?: boolean;
}

const levelStyles: Record<HeadingLevel, string> = {
  1: 'text-4xl leading-tight tracking-tight',
  2: 'text-3xl leading-tight tracking-tight',
  3: 'text-2xl leading-snug',
  4: 'text-xl leading-snug',
};

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(function Heading(
  { level = 1, display = false, className, ...rest },
  ref,
) {
  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4';
  return (
    <Tag
      ref={ref}
      className={clsx(
        'text-foreground',
        display ? 'font-serif font-regular' : 'font-sans font-semibold',
        levelStyles[level],
        className,
      )}
      {...rest}
    />
  );
});

Heading.displayName = 'Heading';
