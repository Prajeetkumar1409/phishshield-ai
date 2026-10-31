import Page from '../components/ui/Page';
import Hero from '../components/home/Hero';
import { LiveStats, Features, Pipeline, Channels, CallToAction } from '../components/home/Sections';

export default function Home() {
  return (
    <Page>
      <Hero />
      <LiveStats />
      <Features />
      <Pipeline />
      <Channels />
      <CallToAction />
    </Page>
  );
}
