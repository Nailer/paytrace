import { hosted } from '@/lib/access';
export const dynamic='force-dynamic';
import { LiveWorkspace } from '@/components/live-workspace';
export default function Page() { return <LiveWorkspace isHosted={hosted()} />; }
