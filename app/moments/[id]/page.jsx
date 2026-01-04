import { notFound } from 'next/navigation';

export default async function MomentPage({ params }) {
  const { id } = params;
  let moment = null;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || ''}/api/moments/${id}`, { cache: 'no-store' });
    if (res.ok) moment = await res.json().then(r => r.data || r);
  } catch (e) {}
  if (!moment) return notFound();

  return (
    <div>
      <h2>{moment.title}</h2>
      <p>{moment.content}</p>
    </div>
  );
}
