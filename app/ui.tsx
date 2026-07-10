import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center ${className}`} aria-label="AMN">
      {/* AMN mark. Swap to /amn-logo-blue.png or /amn-logo-white.png if preferred. */}
      <img src="/amn-logo-black.png" alt="AMN" className="h-8 w-auto" />
    </Link>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line/60 bg-paper/80 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between px-5 sm:px-8">
        <Logo />
        <a
          href="https://theamn.network/#contact"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-brand !rounded-lg !px-4 !py-2.5"
        >
          Book a Strategy Call
        </a>
      </div>
    </header>
  );
}
