"use client";

import { API } from "@/lib/api";
import { ReactNode, useEffect, useState } from "react";
import NotFound from "../app/not-found";
interface ProtectedPageProps {
  children: ReactNode;
  loadingBG:string | ""
}

import { useAuth } from "@/hooks/useAuth";

const ProtectedPage: React.FC<ProtectedPageProps> = ({ children, loadingBG }) => {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading)
    return (
      <div className={`flex justify-center items-center h-screen ${loadingBG}`}>
        <div className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
      </div>
    );

  if (!isAuthenticated) {
    return <NotFound />;
  }

  return <>{children}</>;
};

export default ProtectedPage;
