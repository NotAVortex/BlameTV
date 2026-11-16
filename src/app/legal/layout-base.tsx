export default function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="mt-1 text-xs text-[#717171]">Last updated: {updated}</p>
      <div className="mt-8 space-y-6 text-sm leading-6 text-[#d4d4d4] [&_a]:text-[#3ea6ff] [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-[#f1f1f1] [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </div>
    </div>
  );
}
