'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';

const KEY = 'bloomo.theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const saved = (localStorage.getItem(KEY) as 'light' | 'dark' | null) ?? 'light';
    setTheme(saved);
    document.documentElement.dataset.theme = saved;
  }, []);

  function toggle(): void {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem(KEY, next);
  }

  return (
    <Button
      type="button"
      onClick={toggle}
      variant="ghost"
      size="icon"
      aria-label="Toggle theme"
      className="relative overflow-hidden"
    >
      <Sun
        className={`size-4 transition-all duration-300 ${
          theme === 'light' ? 'rotate-0 scale-100' : '-rotate-90 scale-0'
        }`}
      />
      <Moon
        className={`absolute size-4 transition-all duration-300 ${
          theme === 'dark' ? 'rotate-0 scale-100' : 'rotate-90 scale-0'
        }`}
      />
    </Button>
  );
}
