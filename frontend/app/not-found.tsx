import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-col justify-center items-center h-screen text-center bg-gray-100 text-gray-800">
      <h1 className="text-[8rem] m-0">404</h1>
      <h2 className="text-2xl my-5">Page Not Found</h2>
      <p className="mb-8 text-lg">
        It seems you tried to access a page that does not exist or you don’t have permission.
      </p>
      <Link
        href="/"
        className="px-5 py-2 bg-blue-600 text-white rounded-md font-bold hover:bg-blue-700 transition-colors"
      >
        Back to Home
      </Link>
    </main>
  );
}
