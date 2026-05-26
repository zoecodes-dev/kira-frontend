import { redirect } from 'next/navigation';

export default function SupplierDetailIndexPage({ params }: { params: { id: string } }) {
  redirect(`/suppliers/${params.id}/info`);
}
