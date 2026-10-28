import HomeClient from "@/components/home/HomeClient";
import { getHomeHeroBanners } from "@/lib/hero/public";

// Static page with on-demand refresh: saving a banner in the admin dashboard revalidates "/" immediately,
// and this 60 second limit is the safety net if that ever fails.
export const revalidate = 60;

export default async function HomePage() {
  const heroBanners = await getHomeHeroBanners();
  return <HomeClient heroBanners={heroBanners} />;
}
