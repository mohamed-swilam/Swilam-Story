import ChatSidebar from "@/components/messages/ChatSidebar";

export default function MessagesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex w-full h-full">
      <ChatSidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {children}
      </div>
    </div>
  );
}
