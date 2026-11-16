import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import './ToastProvider.css';

const ToastContext = createContext(null);

const DURATIONS = {
  success: 4200,
  error: 7000,
  warning: 6000,
  info: 4800,
};

const TITLES = {
  success: 'Success',
  error: 'Error',
  warning: 'Warning',
  info: 'Information',
};

function ToastIcon({ type }) {
  const common = {
    width: 21,
    height: 21,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
  };

  if (type === 'success') {
    return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16 9" /></svg>;
  }
  if (type === 'error') {
    return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="m9 9 6 6m0-6-6 6" /></svg>;
  }
  if (type === 'warning') {
    return <svg {...common}><path d="M10.3 3.9 2.7 17a2 2 0 0 0 1.7 3h15.2a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 3h.01" /></svg>;
  }
  return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 11v5m0-8h.01" /></svg>;
}

function ToastItem({ toast, onRemove }) {
  const [isClosing, setIsClosing] = useState(false);
  const exitTimer = useRef(null);
  const closing = useRef(false);
  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    setIsClosing(true);
    exitTimer.current = setTimeout(() => onRemove(toast.id), 180);
  }, [onRemove, toast.id]);

  useEffect(() => {
    if (toast.duration <= 0) return undefined;
    const timer = setTimeout(close, toast.duration);
    return () => clearTimeout(timer);
  }, [close, toast.duration]);

  useEffect(() => () => clearTimeout(exitTimer.current), []);

  return (
    <article
      className={`sn-toast sn-toast-${toast.type}${isClosing ? ' is-closing' : ''}`}
      role={toast.type === 'error' ? 'alert' : 'status'}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <span className="sn-toast-icon"><ToastIcon type={toast.type} /></span>
      <span className="sn-toast-copy">
        <strong className="sn-toast-title">{toast.title}</strong>
        <span className="sn-toast-message">{toast.message}</span>
      </span>
      <button className="sn-toast-close" type="button" onClick={close} aria-label="Dismiss notification">
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8m0-8-8 8" /></svg>
      </button>
      {toast.showProgress && toast.duration > 0 && (
        <span className="sn-toast-progress" style={{ animationDuration: `${toast.duration}ms` }} />
      )}
    </article>
  );
}

export function ToastProvider({ children, app = 'citizen' }) {
  const [toasts, setToasts] = useState([]);
  const recent = useRef(new Map());
  const activeKeys = useRef(new Set());
  const toastKeys = useRef(new Map());

  const remove = useCallback((id) => {
    const dedupeKey = toastKeys.current.get(id);
    if (dedupeKey) activeKeys.current.delete(dedupeKey);
    toastKeys.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback((type, message, options = {}) => {
    if (!message) return;
    const title = options.title || TITLES[type];
    const duration = options.duration ?? DURATIONS[type];
    const dedupeKey = options.dedupeKey || `${type}:${title}:${message}`;
    const now = Date.now();
    const lastShown = recent.current.get(dedupeKey) || 0;
    if (activeKeys.current.has(dedupeKey) || now - lastShown < 1200) return;
    recent.current.set(dedupeKey, now);
    activeKeys.current.add(dedupeKey);
    setTimeout(() => {
      if (recent.current.get(dedupeKey) === now) recent.current.delete(dedupeKey);
    }, 1200);

    const id = globalThis.crypto?.randomUUID?.() || `${now}-${Math.random().toString(36).slice(2)}`;
    toastKeys.current.set(id, dedupeKey);
    setToasts((current) => {
      const next = [...current, { id, dedupeKey, type, title, message, duration, showProgress: options.showProgress !== false }];
      while (next.length > 5) {
        const removed = next.shift();
        activeKeys.current.delete(removed.dedupeKey);
        toastKeys.current.delete(removed.id);
      }
      return next;
    });
  }, []);

  const success = useCallback((message, options) => notify('success', message, options), [notify]);
  const error = useCallback((message, options) => notify('error', message, options), [notify]);
  const warning = useCallback((message, options) => notify('warning', message, options), [notify]);
  const info = useCallback((message, options) => notify('info', message, options), [notify]);
  const value = useMemo(() => ({ success, error, warning, info }), [success, error, warning, info]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="sn-toast-viewport" data-app={app} aria-label="Notifications">
        {toasts.map((toast) => <ToastItem key={toast.id} toast={toast} onRemove={remove} />)}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}
