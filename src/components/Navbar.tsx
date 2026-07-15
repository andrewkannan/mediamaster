"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { LogOut, UploadCloud, Folder, Search } from "lucide-react";

export function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="flex-shrink-0">
              <span className="text-white text-xl font-bold">
                Media<span className="text-blue-500">Master</span>
              </span>
            </Link>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  href="/dashboard"
                  className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium flex items-center"
                >
                  <Folder className="w-4 h-4 mr-2" /> Browse
                </Link>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search tags..."
                  className="bg-gray-900 border border-gray-700 text-gray-300 rounded-md py-1 pl-10 pr-3 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm w-64"
                />
              </div>

              <span className="text-gray-300 text-sm ml-4 mr-4">
                {session?.user?.name || session?.user?.email}
              </span>
              <button
                onClick={() => signOut()}
                className="text-gray-400 hover:text-white p-1 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-white"
                title="Log out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
