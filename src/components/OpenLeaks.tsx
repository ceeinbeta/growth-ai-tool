import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { openLeaksQuery } from '@/lib/conversion-data';
export function OpenLeaks({ productId }: { productId: string }) {
  const { data } = useQuery(openLeaksQuery(productId));
  if (!data?.length) return null;
  return <Link to="/conversion-leaks" className="mt-5 block text-sm font-medium text-primary hover:underline">{data.length} open leaks. Biggest: {data[0]?.area}</Link>;
}