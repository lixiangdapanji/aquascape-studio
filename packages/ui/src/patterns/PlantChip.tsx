import { forwardRef, type HTMLAttributes } from 'react';
import clsx from 'clsx';

export type PlantDifficulty = 'easy' | 'medium' | 'hard';

export interface PlantChipProps extends HTMLAttributes<HTMLSpanElement> {
  /** Scientific name, e.g. "Eleocharis acicularis". */
  name: string;
  /** Optional Simplified Chinese name, rendered muted. */
  nameZh?: string;
  difficulty?: PlantDifficulty;
}

const difficultyDot: Record<PlantDifficulty, string> = {
  easy: 'bg-moss-300',
  medium: 'bg-moss-500',
  hard: 'bg-bone-300',
};

export const PlantChip = forwardRef<HTMLSpanElement, PlantChipProps>(function PlantChip(
  { name, nameZh, difficulty, className, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      className={clsx(
        'inline-flex items-center gap-2 px-3 h-8 rounded-full',
        'bg-ink-800 border border-border/40 text-bone-100 text-sm',
        'transition-colors duration-hover ease-out hover:bg-surface-hover',
        className,
      )}
      {...rest}
    >
      {difficulty ? (
        <span
          aria-hidden="true"
          className={clsx('inline-block w-1.5 h-1.5 rounded-full', difficultyDot[difficulty])}
        />
      ) : null}
      <span className="font-sans">{name}</span>
      {nameZh ? <span className="font-serif text-muted-foreground">{nameZh}</span> : null}
    </span>
  );
});

PlantChip.displayName = 'PlantChip';
