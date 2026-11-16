"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SubscribeButton({
  username,
  initialSubscribed,
  initialCount,
  loggedIn,
  isSelf,
}: {
  username: string;
  initialSubscribed: boolean;
  initialCount: number;
  loggedIn: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [subscribed, setSubscribed] = useState(initialSubscribed);
  const [count, setCount] = useState(initialCount);

  async function toggle() {
    if (!loggedIn) return router.push("/login");
    const res = await fetch(`/api/channels/${username}/subscribe`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      setSubscribed(data.subscribed);
      setCount(data.subscribers);
    }
  }

  if (isSelf) {
    return (
      <span className="rounded-full bg-[#272727] px-4 py-2 text-sm text-[#aaaaaa]">
        Your channel
      </span>
    );
  }

  return (
    <button
      onClick={toggle}
      className={`btn w-full sm:w-auto ${subscribed ? "bg-[#272727] text-[#f1f1f1] hover:bg-[#3f3f3f]" : "bg-[#f1f1f1] text-[#0f0f0f] hover:bg-white"}`}
    >
      {subscribed ? "Unsubscribe" : "Subscribe"}
      <span className="sr-only">{count ? ` ${count} subscribers` : ""}</span>
    </button>
  );
}
