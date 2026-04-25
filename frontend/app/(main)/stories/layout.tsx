import StorySidebar from "@/components/stories/StorySidebar";

export default function StoriesLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex w-full h-full">
      <StorySidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {children}
      </div>
    </div>
  );
}
