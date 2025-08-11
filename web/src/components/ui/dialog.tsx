import React, { createContext, useContext, useEffect, useMemo, useState, cloneElement, isValidElement } from "react";

// Lightweight dialog primitives compatible with existing imports
// Adds proper mobile scrolling + larger desktop width option via className

type CtxType = { isOpen: boolean; setOpen: (v: boolean) => void };
const Ctx = createContext<CtxType>({ isOpen: false, setOpen: () => {} });

export const Dialog: React.FC<{ open?: boolean; onOpenChange?: (v: boolean) => void; children: React.ReactNode }>
= ({ open, onOpenChange, children }) => {
  const controlled = typeof open === 'boolean';
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlled ? (open as boolean) : internalOpen;
  const setOpen = (v: boolean) => {
    if (!controlled) setInternalOpen(v);
    onOpenChange && onOpenChange(v);
  };
  
  // Prevent background scroll when open
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  return <Ctx.Provider value={{ isOpen, setOpen }}>{children}</Ctx.Provider>;
};

export const DialogTrigger: React.FC<{ asChild?: boolean; children: React.ReactElement }>
= ({ asChild, children }) => {
  const { setOpen } = useContext(Ctx);
  if (asChild && isValidElement(children)) {
    return cloneElement(children, { onClick: (e: any) => { children.props.onClick?.(e); setOpen(true); } });
  }
  return <button onClick={() => setOpen(true)}>{children}</button>;
};

export const DialogContent: React.FC<{ className?: string; children: React.ReactNode }>
= ({ className = '', children }) => {
  const { isOpen, setOpen } = useContext(Ctx);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div
        role="dialog"
        aria-modal="true"
        className={
          [
            "relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:w-[95%]",
            // Critical: responsive height with internal scroll
            "max-h-[85vh] overflow-y-auto",
            // Default max width; can be overridden by passing className (e.g., md:max-w-2xl)
            "max-w-xl",
            className
          ].join(' ')
        }
      >
        {/* Mobile grabber */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur p-3 sm:hidden">
          <div className="mx-auto h-1 w-12 rounded-full bg-slate-200" />
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

export const DialogHeader: React.FC<{ children: React.ReactNode }>
= ({ children }) => <div className="mb-2">{children}</div>;

export const DialogTitle: React.FC<{ children: React.ReactNode }>
= ({ children }) => <div className="text-lg font-semibold tracking-tight">{children}</div>;
