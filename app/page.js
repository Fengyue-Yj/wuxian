import { getEssays } from "@/lib/essays";
import HomePageContent from "./components/HomePageContent";

export const metadata = { alternates: { canonical: "/wuxian/" } };

export default async function Home() {
  const essays = await getEssays();
  return <HomePageContent essays={essays} />;
}
