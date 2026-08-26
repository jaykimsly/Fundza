import { BootLoader } from '@/components/Skeleton';

export default function AppLoader({
  message = 'Preparing your study space...',
}: {
  message?: string;
}) {
  return <BootLoader message={message} />;
}
