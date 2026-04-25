import TopNavbar from "@/components/TopNavbar";
import ProtectedPage from "@/components/ProtectedPage";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ProtectedPage loadingBG="">
      <div className="relative h-[100dvh] bg-background text-foreground flex flex-col overflow-hidden">
        <TopNavbar />
        <main className="flex-1 w-full overflow-hidden mt-16 relative">
          {children}
        </main>
      </div>
    </ProtectedPage>
  );
}
