import Link from 'next/link';

const RESEARCH_PATHWAY = [
  'early inception hypotheses',
  'protocol development',
  'ethical and regulatory approval',
  'completion of trials',
  'data analysis',
  'interpretation',
  'report writing and publication',
];

const ACADEMIC_EXAMPLES = [
  'dairy bioactives and health, LactoPharma consortium',
  'marine polysaccharide Chitosan and weight loss, collaboration with the University of Queensland, Aus',
  'Omega-3 polyunsaturated fatty acids (fish oils) and stroke, collaboration with the George Institute, Aus',
  'Adipokynes in obesity, collaboration with the University of Hong Kong',
];

const COMMERCIAL_FUNDING = [
  'Pharmaceutical Industry',
  'Nutraceutical Industry',
  'Food Industry',
];

function SectionDivider() {
  return <div className="w-full h-px bg-[#0a4479]/15 my-10 sm:my-14 lg:my-16" aria-hidden="true" />;
}

export default function CollaborationsBody() {
  return (
    <section className="bg-white w-full">
      <div className="py-8 sm:py-10 lg:py-12 px-4 sm:px-8 lg:px-[93px] max-w-[1512px] mx-auto">
      {/* Breadcrumb */}
      <nav className="mb-8 sm:mb-10 lg:mb-12 text-base sm:text-lg lg:text-[20px] tracking-[0.4px] text-[#0c0c48]">
        <Link href="/about" className="hover:underline">
          About
        </Link>
        <span className="mx-2">{'>'}</span>
        <strong>Collaborations</strong>
      </nav>

      {/* Our Collaborations */}
      <div>
        <h2 className="text-xl sm:text-2xl lg:text-[36px] font-bold text-[#0a4479] tracking-[0.72px] mb-4 sm:mb-6">
          Our Collaborations
        </h2>
        <p className="text-base sm:text-lg lg:text-[24px] font-normal text-[#0a4479] tracking-[0.48px] leading-relaxed mb-4 sm:mb-6 max-w-[1289px]">
          The Human Nutrition Unit encourages research collaborations with industry and academic
          units, both nationally and internationally.
        </p>
        <p className="text-base sm:text-lg lg:text-[24px] font-normal text-[#0a4479] tracking-[0.48px] leading-relaxed mb-3 sm:mb-4">
          The research pathway includes:
        </p>
        <ul className="list-disc list-outside ml-5 sm:ml-7 lg:ml-8 mb-4 sm:mb-6 space-y-1">
          {RESEARCH_PATHWAY.map((item) => (
            <li
              key={item}
              className="text-base sm:text-lg lg:text-[24px] font-normal text-[#0a4479] tracking-[0.48px] leading-relaxed"
            >
              {item}
            </li>
          ))}
        </ul>
        <p className="text-base sm:text-lg lg:text-[24px] font-normal text-[#0a4479] tracking-[0.48px] leading-relaxed max-w-[1287px]">
          The Unit ensures compliance with Good Clinical Practice, up to the level of ICH GCP where
          required, and has experience of and welcomes independent trial monitoring and audit
          processes.
        </p>
      </div>

      <SectionDivider />

      {/* Academic Collaborations */}
      <div>
        <h2 className="text-xl sm:text-2xl lg:text-[36px] font-bold text-[#0a4479] tracking-[0.72px] mb-4 sm:mb-6">
          Academic Collaborations
        </h2>
        <p className="text-base sm:text-lg lg:text-[24px] font-normal text-[#0a4479] tracking-[0.48px] leading-relaxed mb-4 sm:mb-6 max-w-[1266px]">
          Academic collaborations aim to contribute to nutrition research within an academic
          environment.
        </p>
        <p className="text-base sm:text-lg lg:text-[24px] font-normal text-[#0a4479] tracking-[0.48px] leading-relaxed mb-4 sm:mb-6 max-w-[1266px]">
          As well as collaborations with Schools and Faculties within the University of Auckland,
          the Unit also collaborates with the Wellington Medical School, University of Otago, NZ
          and internationally with academic departments in Australia, Japan and Hong Kong.
        </p>
        <p className="text-base sm:text-lg lg:text-[24px] font-normal text-[#0a4479] tracking-[0.48px] leading-relaxed mb-3 sm:mb-4">
          Examples of Collaborations
        </p>
        <ul className="list-disc list-outside ml-5 sm:ml-7 lg:ml-8 space-y-1">
          {ACADEMIC_EXAMPLES.map((item) => (
            <li
              key={item}
              className="text-base sm:text-lg lg:text-[24px] font-normal text-[#0a4479] tracking-[0.48px] leading-relaxed"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      <SectionDivider />

      {/* Industry Collaboration */}
      <div>
        <h2 className="text-xl sm:text-2xl lg:text-[36px] font-bold text-[#0a4479] tracking-[0.72px] mb-4 sm:mb-6">
          Industry Collaboration
        </h2>
        <p className="text-base sm:text-lg lg:text-[24px] font-normal text-[#0a4479] tracking-[0.48px] leading-relaxed mb-4 sm:mb-6 max-w-[1287px]">
          The Unit provides independent expertise for Industry collaboration.
        </p>
        <p className="text-base sm:text-lg lg:text-[24px] font-bold text-[#0a4479] tracking-[0.48px] leading-relaxed mb-3 sm:mb-4">
          Examples of Collaborations:
        </p>
        <div className="text-base sm:text-lg lg:text-[24px] font-normal text-[#0a4479] tracking-[0.48px] leading-relaxed space-y-2 max-w-[1287px]">
          <p>
            <strong>Pharmaceutical</strong> — new therapeutics for treatment of diabetic
            cardiomyopathy: complete diet balance studies
          </p>
          <p>
            <strong>Food</strong> — novel butter fat and cardiovascular risk
          </p>
          <p>
            <strong>Food components</strong> — dairy lipids &amp; proteins and cholesterol lowering
          </p>
          <p>
            <strong>Food ingredients</strong> — barley ß-glucan Glucagel and cholesterol lowering;
            barley ß-glucan Cerogen and glucose control
          </p>
          <p>
            <strong>Nutraceuticals</strong> — marine polysaccharide Chitosan and weight loss;
            Omega-3 polyunsaturated fatty acids (fish oils) and stroke.
          </p>
        </div>
        <p className="text-base sm:text-lg lg:text-[24px] font-normal text-[#0a4479] tracking-[0.48px] leading-relaxed mt-4 sm:mt-6 max-w-[1287px]">
          The Human Nutrition Unit is also a member of the LactoPharma consortium, a NZ-wide
          collaborative program supported by the NZ Foundation for Research Science and Technology
          (FRST) and the NZ dairy company Fonterra Co-Operative group Ltd.
        </p>
      </div>

      <SectionDivider />

      {/* Funding */}
      <div>
        <h2 className="text-xl sm:text-2xl lg:text-[36px] font-bold text-[#0a4479] tracking-[0.72px] mb-4 sm:mb-6">
          Funding
        </h2>
        <p className="text-base sm:text-lg lg:text-[24px] font-normal text-[#0a4479] tracking-[0.48px] leading-relaxed mb-4 sm:mb-6">
          The Unit receives highly competitive grant and commercial funding.
        </p>
        <p className="text-base sm:text-lg lg:text-[24px] font-bold text-[#0a4479] tracking-[0.48px] leading-relaxed mb-2">
          Grant Funding
        </p>
        <div className="text-base sm:text-lg lg:text-[24px] font-normal text-[#0a4479] tracking-[0.48px] leading-relaxed space-y-1 mb-6 sm:mb-8">
          <p>High Value Nutrition</p>
          <p>The Riddet Institute</p>
          <p>Ministry of Business, Innovation and Employment (MBIE), NZ</p>
          <p>Health Research Council, NZ</p>
        </div>
        <p className="text-base sm:text-lg lg:text-[24px] font-bold text-[#0a4479] tracking-[0.48px] leading-relaxed mb-2">
          Commercial Funding and Sponsorship
        </p>
        <ul className="list-disc list-outside ml-5 sm:ml-7 lg:ml-8 space-y-1">
          {COMMERCIAL_FUNDING.map((item) => (
            <li
              key={item}
              className="text-base sm:text-lg lg:text-[24px] font-normal text-[#0a4479] tracking-[0.48px] leading-relaxed"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
      </div>
    </section>
  );
}
