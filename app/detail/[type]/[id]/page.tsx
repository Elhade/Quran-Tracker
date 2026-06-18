import DetailPageClient from './DetailPageClient';

export function generateStaticParams() {
  const params: { type: string; id: string }[] = [];
  for (let i = 1; i <= 60; i++)  params.push({ type: 'hizb',    id: `hizb-${i}` });
  for (let i = 1; i <= 114; i++) params.push({ type: 'sourate', id: `surah-${i}` });
  return params;
}

export default function DetailPage({ params }: { params: { type: string; id: string } }) {
  return <DetailPageClient params={params} />;
}
