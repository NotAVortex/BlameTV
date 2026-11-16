"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBox({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (value.trim()) router.push(`/search?q=${encodeURIComponent(value.trim())}`);
  }

  return (
    <form onSubmit={submit} className="mb-6 flex">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search videos and people"
        maxLength={100}
        className="input !rounded-r-none"
        autoFocus
      />
      <button
        type="submit"
        aria-label="Search"
        className="rounded-r-xl border border-l-0 border-[#303030] bg-[#222222] px-4 text-[#aaaaaa] transition-colors hover:bg-[#303030] hover:text-white"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </button>
    </form>
  );
}
