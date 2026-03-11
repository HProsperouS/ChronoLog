import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, X } from 'lucide-react';

export type AlertType = 'success' | 'error' | 'warning';

export interface FlashMessage {
  id: number;
  type: AlertType;
  message: string;
}

interface FlashAlertProps {
  flash: FlashMessage;
  onDismiss: (id: number) => void;
}

const CONFIG: Record<AlertType, { icon: React.ElementType; classes: string }> = {
  success: {
    icon: CheckCircle2,
    classes: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  },
  error: {
    icon: XCircle,
    classes: 'bg-red-500/10 border-red-500/30 text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    classes: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  },
};

export function FlashAlert({ flash, onDismiss }: FlashAlertProps) {
  const { icon: Icon, classes } = CONFIG[flash.type];

  useEffect(() => {
    const t = setTimeout(() => onDismiss(flash.id), 3500);
    return () => clearTimeout(t);
  }, [flash.id, onDismiss]);

  return (
    <div
      className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border text-xs font-medium shadow-lg animate-in slide-in-from-bottom-2 fade-in duration-200 ${classes}`}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span className="flex-1">{flash.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(flash.id)}
        className="opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

interface FlashContainerProps {
  messages: FlashMessage[];
  onDismiss: (id: number) => void;
}

export function FlashContainer({ messages, onDismiss }: FlashContainerProps) {
  if (!messages.length) return null;
  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 w-72">
      {messages.map((f) => (
        <FlashAlert key={f.id} flash={f} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

let _id = 0;

export function useFlash() {
  const [messages, setMessages] = useState<FlashMessage[]>([]);

  function flash(type: AlertType, message: string) {
    const id = ++_id;
    setMessages((prev) => [...prev, { id, type, message }]);
  }

  function dismiss(id: number) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  return { messages, flash, dismiss };
}
