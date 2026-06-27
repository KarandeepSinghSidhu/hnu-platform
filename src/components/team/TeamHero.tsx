import SubpageHero from '@/components/layout/SubpageHero';

export default function TeamHero() {
  return (
    <SubpageHero
      title="Our Team"
      subtitle={
        <>
          We&apos;re passionate about what we do.
          <br />
          Find out more about the people behind
          <br />
          the Human Nutrition Unit
        </>
      }
    />
  );
}
