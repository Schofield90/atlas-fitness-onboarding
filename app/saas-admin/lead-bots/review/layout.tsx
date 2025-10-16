// Disable static rendering for the review page
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
