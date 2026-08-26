import StatusScreen from '@/components/StatusScreen';

export default function ServiceUnavailable() {
  return <StatusScreen kind="503" code="503" />;
}
