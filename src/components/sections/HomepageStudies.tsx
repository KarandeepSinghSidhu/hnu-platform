// src/components/sections/HomepageStudies.tsx
import StudyCard from "@/components/ui/StudyCard";

export default function HomepageStudies() {
  return (
    <section className="relative w-full bg-white py-16 px-6 sm:px-12 lg:px-45">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-[1400px] mx-auto">
        <StudyCard
          title="NZ Synergy"
          subtitle="A Two-Week Nutrition Study for Diabetes Prevention"
          description="We will investigate whether the foods you eat alter blood markers associated with the risk of developing type 2 diabetes."
          buttonHref="/studies/nz-synergy"
          buttonLabel="Find out more >"
          imageSrc="/NZ Synergy Study.jpg"
          imageAlt="NZ Synergy Study"
        />
        <StudyCard
          title="NZ Food and Beverage"
          subtitle="A Weight Loss Study for Diabetes Prevention"
          description="We will investigate whether daily consumption of feijoa whole fruit powder alters risk of developing type 2 diabetes."
          buttonHref="/studies/food-beverage"
          buttonLabel="Find out more >"
          imageSrc="/nz-food-beverage-study.jpg"
          imageAlt="NZ Food and Beverage Study"
        />
      </div>
    </section>
  );
}
