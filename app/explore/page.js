import { redirect } from 'next/navigation';

export default async function ExplorePage({ searchParams }) {
  const params = await searchParams;
  const nextParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params || {})) {
    if (Array.isArray(value)) {
      value.forEach((item) => nextParams.append(key, String(item)));
    } else if (value != null) {
      nextParams.set(key, String(value));
    }
  }

  nextParams.set('scope', 'overview');
  redirect(`/briefings?${nextParams.toString()}`);
}
