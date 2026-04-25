export default function TypingIndicator({ username }: { username: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 animate-pulse">
      <div className="flex items-center gap-1 bg-secondary px-3 py-2.5 rounded-2xl rounded-bl-none">
        <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="text-xs text-muted-foreground font-medium italic">{username} is typing...</span>
    </div>
  );
}
