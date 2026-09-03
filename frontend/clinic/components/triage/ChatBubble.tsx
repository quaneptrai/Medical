import * as React from 'react';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  content: string;
  timestamp: string;
  isEmergency?: boolean;
}

export interface ChatBubbleProps {
  message: ChatMessage;
  className?: string;
}

export function ChatBubble({ message, className }: ChatBubbleProps) {
  const isUser = message.sender === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 max-w-[88%] md:max-w-[80%] transition-all duration-200 animate-[fadeInUp_200ms_ease-out]',
        isUser ? 'ml-auto flex-row-reverse' : 'mr-auto',
        className
      )}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 shadow-sm',
          isUser ? 'bg-brand-700 text-white' : 'bg-brand-100 text-brand-700 border border-brand-200'
        )}
        aria-hidden="true"
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div className="space-y-1">
        <div
          className={cn(
            'p-4 rounded-lg text-sm md:text-base leading-relaxed',
            isUser
              ? 'bg-brand-600 text-white rounded-br-none shadow-sm'
              : 'bg-neutral-100 text-neutral-800 rounded-bl-none border border-neutral-200 shadow-sm'
          )}
        >
          <p className="whitespace-pre-line">{message.content}</p>
        </div>
        <span
          className={cn(
            'text-[11px] text-neutral-400 block px-1',
            isUser ? 'text-right' : 'text-left'
          )}
        >
          {message.timestamp}
        </span>
      </div>
    </div>
  );
}
