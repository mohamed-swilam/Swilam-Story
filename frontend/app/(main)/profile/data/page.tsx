"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, Database, Trash2, Globe, Cpu, Download, Loader2 } from "lucide-react";
import ConfirmModal from "@/components/modals/ConfirmModal";

export default function DataUsagePage() {
  const router = useRouter();
  const [quality, setQuality] = useState("auto");
  const [clearing, setClearing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleClearCache = async () => {
    setIsModalOpen(false);
    setClearing(true);
    try {
      // Clear localStorage
      localStorage.clear();
      
      // Clear IndexedDB (if any)
      const databases = await window.indexedDB.databases();
      databases.forEach(db => {
        if (db.name) window.indexedDB.deleteDatabase(db.name);
      });

      // Clear SessionStorage
      sessionStorage.clear();

      alert("Cache cleared successfully. The app will now reload.");
      window.location.href = "/login";
    } catch (err) {
      console.error(err);
      alert("Failed to clear some data.");
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-background/50 backdrop-blur-sm">
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8 pb-32">
        {/* Top Bar */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-white/5 rounded-full text-muted-foreground hover:text-white transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-white">Data & Storage</h1>
        </div>

        <section className="space-y-6">
          {/* Storage Summary */}
          <div className="bg-gradient-to-br from-primary/20 to-purple-600/20 rounded-3xl p-6 border border-primary/20 shadow-xl">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/30">
                <Database size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-primary uppercase tracking-widest">Total Storage Used</p>
                <h2 className="text-2xl font-black text-white">124.5 MB</h2>
              </div>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="w-1/3 h-full bg-primary rounded-full shadow-[0_0_10px_var(--color-primary)]"></div>
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
              <span>Used: 124MB</span>
              <span>Total Capacity: 5GB</span>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-2">Media Quality</h3>
            <div className="bg-card/50 rounded-3xl border border-white/5 divide-y divide-white/5 overflow-hidden backdrop-blur-md">
              <SelectionRow 
                active={quality === "auto"} 
                onClick={() => setQuality("auto")} 
                title="Auto (Recommended)" 
                desc="Adjusts based on your connection speed"
              />
              <SelectionRow 
                active={quality === "high"} 
                onClick={() => setQuality("high")} 
                title="Best Quality" 
                desc="Uses more data, but everything looks crisp"
              />
              <SelectionRow 
                active={quality === "low"} 
                onClick={() => setQuality("low")} 
                title="Data Saver" 
                desc="Compresses images to save bandwidth"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest px-2">System</h3>
            <div className="bg-card/50 rounded-3xl border border-white/5 divide-y divide-white/5 overflow-hidden backdrop-blur-md">
              <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-secondary rounded-xl text-primary">
                    <Globe size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-white">Browser Cache</p>
                    <p className="text-xs text-muted-foreground">Cached images and scripts</p>
                  </div>
                </div>
                <button onClick={() => setIsModalOpen(true)} className="text-xs font-bold text-destructive hover:underline">Clear</button>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setIsModalOpen(true)}
            disabled={clearing}
            className="w-full flex items-center justify-center gap-3 p-5 rounded-3xl bg-destructive/5 text-destructive border border-destructive/10 hover:bg-destructive hover:text-white transition-all duration-300 font-bold group disabled:opacity-50"
          >
            {clearing ? <Loader2 className="animate-spin" /> : <Trash2 size={20} className="group-hover:rotate-12 transition-transform" />}
            Delete All Cached Data
          </button>
        </section>

        <ConfirmModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onConfirm={handleClearCache}
          isLoading={clearing}
          title="Clear App Cache?"
          description="Are you sure you want to clear all cached data? This will log you out and remove all local messages and settings."
          confirmText="Yes, Clear All"
          type="danger"
        />
      </main>
    </div>
  );
}

function SelectionRow({ active, onClick, title, desc }: { active: boolean, onClick: () => void, title: string, desc: string }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between p-5 hover:bg-white/5 transition-all text-left">
      <div className="flex-1">
        <p className={`font-bold transition-colors ${active ? "text-primary" : "text-white"}`}>{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${active ? "border-primary bg-primary" : "border-white/20"}`}>
        {active && <div className="w-2 h-2 bg-white rounded-full"></div>}
      </div>
    </button>
  );
}
