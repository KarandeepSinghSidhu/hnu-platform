import SubpageHero from '@/components/layout/SubpageHero';

export default function DiscoverHero() {
  return (
    <SubpageHero
      title="Discover HNU"
      subtitleMaxWidth={697}
      subtitle={
        <>
          Focused on better health through nutrition.
          <br />
          Learn more about our work and purpose
        </>
      }
    />
  );
}
