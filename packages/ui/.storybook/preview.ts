import type { Preview } from '@storybook/react';
import { cssVariablesBlock } from '../src/theme/css.js';
import './preview.css';

// Inject the token CSS variables so every story renders on the ink-green canvas.
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.textContent = cssVariablesBlock();
  document.head.appendChild(styleEl);
  document.body.style.background = 'var(--color-background)';
  document.body.style.color = 'var(--color-foreground)';
  document.body.style.fontFamily = 'Inter, system-ui, sans-serif';
}

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'ink',
      values: [
        { name: 'ink', value: '#0A1F18' },
        { name: 'surface', value: '#0F2A20' },
      ],
    },
    a11y: {
      config: {
        rules: [{ id: 'color-contrast', enabled: true }],
      },
    },
  },
};

export default preview;
