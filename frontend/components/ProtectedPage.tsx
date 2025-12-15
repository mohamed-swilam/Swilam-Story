"use client";

import { API } from "@/lib/api";
import { ReactNode, useEffect, useState } from "react";
import NotFound from "../app/not-found";
interface ProtectedPageProps {
  children: ReactNode;
  loadingBG:string | ""
}

const ProtectedPage: React.FC<ProtectedPageProps> = ({ children, loadingBG }) => {
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await API.authTest();
        if (res.token) {
          setIsAuth(true);
        } else {
          setIsAuth(false);
        }
      } catch (err) {
        console.error(err);
        setIsAuth(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading)
    return (
      <div className={`flex justify-center items-center h-screen ${loadingBG}`}>
        <div className="w-16 h-16 border-4 border-blue-500 border-dashed rounded-full animate-spin"></div>
      </div>
    );

  if (!isAuth) {
    return <NotFound />;
  }

  return <>{children}</>;
};

export default ProtectedPage;
