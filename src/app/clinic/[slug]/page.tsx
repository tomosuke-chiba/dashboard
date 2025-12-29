import { redirect } from 'next/navigation';

interface ClinicPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ClinicPage({ params }: ClinicPageProps) {
  const { slug } = await params;
  redirect(`/clinic/${slug}/guppy`);
}
