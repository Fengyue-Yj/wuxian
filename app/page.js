import { getEssays } from "@/lib/essays";
import HomePageContent from "./components/HomePageContent";

export default async function Home() {
  const essays = await getEssays();
  return <HomePageContent essays={essays} />;
}
