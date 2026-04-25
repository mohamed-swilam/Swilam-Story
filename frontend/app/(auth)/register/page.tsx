"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { API } from "@/lib/api";
import Link from "next/link";

export default function Register() {
  const router = useRouter();
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
  };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setError("Please select file...");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("user_pic", file);
      formData.append("username", username);
      formData.append("password", password);
      formData.append("confirmPassword", confirmPassword);
      await API.register(formData);
      router.push("/login");
    } catch (err: any) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm p-6 border rounded-lg"
      >
        <h2 className="text-2xl font-bold mb-4 text-center">Register</h2>

        {error && (
          <p className="text-red-500 text-sm mb-3 text-center">{error}</p>
        )}

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full mb-3 p-2 border rounded"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
        />

        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
        />

        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="mb-4"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-black text-white rounded"
        >
          {loading ? "Registering..." : "Register"}
        </button>
        <p>
          {" "}
          have as account,{" "}
          <Link href="/login" className="underline">
            Login
          </Link>
        </p>
      </form>
    </main>
  );
}
