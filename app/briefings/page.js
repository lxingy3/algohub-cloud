import { redirect } from 'next/navigation';

const explorerEntry = '/briefings/explore?lens=community&scope=overview&language=en&reading=standard';

export default function BriefingsPage() {
  redirect(explorerEntry);
}
