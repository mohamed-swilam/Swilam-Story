'use client'
import { useRouter } from 'next/navigation'
const Home = () => {
  const router = useRouter()
  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center p-6">
      <h1 className="text-4xl font-bold mb-4">
        Stories Feature
      </h1>

      <p className="text-gray-600 mb-8 max-w-xl">
        A simple stories feature where users can upload photos or videos
        and view stories from others with seen/unseen tracking.
      </p>

      <button
        onClick={() => router.push("/login")}
        className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition"
      >
        Try Stories Feature
      </button>
    </main>
  )
}

export default Home