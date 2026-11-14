import React, { useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

export const ICON = { size: 18, strokeWidth: 1.75 } as const;
export const ICON_SM = { size: 16, strokeWidth: 1.75 } as const;

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Kbd({ keys }: { keys: string[] }) {
  return (
    <span className="kbd-combo">
      {keys.map((k) => (
        <kbd key={k} className="kbd">
          {k}
        </kbd>
      ))}
    </span>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <span className="switch">
      <input
        type="checkbox"
        role="switch"
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="switch__track" aria-hidden />
    </span>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label className="search">
      <Search {...ICON_SM} />
      <input
        className="input"
        type="search"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export function EmptyState({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon}</div>
      <div className="empty__title">{title}</div>
      {children && <div style={{ maxWidth: '44ch' }}>{children}</div>}
    </div>
  );
}

export function RadioOption({
  checked,
  onSelect,
  title,
  badge,
  children,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <button type="button" role="radio" aria-checked={checked} className="option" onClick={onSelect}>
      <span className="option__radio" aria-hidden />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="option__title">
          {title}
          {badge}
        </span>
        {children && <span className="option__desc" style={{ display: 'block' }}>{children}</span>}
      </span>
    </button>
  );
}

/** Modal shell: Escape closes, focus moves into the dialog and is restored on close. */
export function Dialog({
  label,
  onClose,
  width,
  height,
  children,
}: {
  label: string;
  onClose?: () => void;
  width: number;
  height?: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && onClose) onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className="dialog"
        style={{ width, height, maxWidth: 'calc(100vw - 48px)', maxHeight: 'calc(100vh - 48px)', outline: 'none' }}
      >
        {children}
      </div>
    </div>
  );
}

export function Toast({ children }: { children: React.ReactNode }) {
  return (
    <div className="toast" role="status" aria-live="polite">
      {children}
    </div>
  );
}
