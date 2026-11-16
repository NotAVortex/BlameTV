export default function VerifiedBadge({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-label="Verified" role="img">
      <path
        fill="#3ea6ff"
        d="M12 1.8l2.6 2.3 3.4-.4 1 3.2 3.1 1.6-1.2 3.3 1.2 3.3-3.1 1.6-1 3.2-3.4-.4L12 22.2l-2.6-2.3-3.4.4-1-3.2L1.9 15.5l1.2-3.3-1.2-3.3 3.1-1.6 1-3.2 3.4.4L12 1.8z"
      />
      <path
        fill="#0f0f0f"
        d="M10.6 15.6l-3-3 1.3-1.3 1.7 1.7 4.5-4.5 1.3 1.3-5.8 5.8z"
      />
    </svg>
  );
}
