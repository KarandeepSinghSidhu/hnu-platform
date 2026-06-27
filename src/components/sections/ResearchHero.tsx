import SubpageHero from '@/components/layout/SubpageHero';

export default function ResearchHero() {
  return (
    <SubpageHero
      title="Our Research"
      subtitleMaxWidth={626}
      subtitle={
        <>
          Better health through nutrition science.
          <br />
          Explore our research in diet, disease, and clinical trials
        </>
      }
    />
  );
}
