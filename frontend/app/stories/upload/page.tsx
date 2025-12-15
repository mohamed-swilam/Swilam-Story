"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API } from "@/lib/api";
import ProtectedPage from "@/components/ProtectedPage";
import Link from "next/link";

export default function UploadStoryPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];

    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!file) {
      setError("Please select file...");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("media_url", file);
      await API.uploadStory(formData);
      router.push("/stories/feed");
    } catch (err: any) {
      setError(err.response.data.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedPage loadingBG="">
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <form
          onSubmit={handleSubmit}
          className="bg-white w-full max-w-md p-6 rounded-lg shadow"
        >
          <h1 className="text-2xl font-bold mb-4 text-center">Upload Story</h1>

          {error && (
            <p className="text-red-500 text-sm mb-3 text-center">{error}</p>
          )}

          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="mb-4"
          />

          {preview && (
            <div className="mb-4">
              {file?.type.startsWith("image") ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="rounded-lg max-h-64 mx-auto"
                />
              ) : (
                <video
                  src={preview}
                  controls
                  className="rounded-lg max-h-64 mx-auto"
                />
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            {loading ? "Uploading..." : "Upload Story"}
          </button>
          <Link href="/stories/feed" className="font-semibold underline">Back to feed</Link>
        </form>
      </main>
    </ProtectedPage>
  );
}
