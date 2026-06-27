"use client";

import Image from "next/image";
import { getSafeHttpUrl } from "@/lib/safe-url";
import type { TeamMemberRecord } from "@/lib/data/team";
import { useLanguage } from "@/contexts/LanguageContext";

export default function AlumniSection({
  members,
}: {
  members: TeamMemberRecord[];
}) {
  const { t } = useLanguage();
  if (members.length === 0) {
    return null;
  }

  return (
    <section className="relative w-full bg-white py-16 px-6 sm:px-12 lg:px-45 overflow-hidden">
      <div style={{ maxWidth: "1420px", margin: "0 auto" }}>
        <h2 className="text-3xl sm:text-5xl lg:text-[64px] font-extrabold text-[#0c0c48] tracking-[1.28px] text-center mb-12 sm:mb-16 lg:mb-20">
          {t.team.alumni}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-8 gap-y-12">
          {members.map((member) => (
            <AlumniCard key={member.id} member={member} />
          ))}
        </div>
      </div>
    </section>
  );
}

function AlumniCard({ member }: { member: TeamMemberRecord }) {
  const profileUrl = getSafeHttpUrl(member.profileUrl);
  const photoWrapperClass = "w-[160px] h-[160px] sm:w-[180px] sm:h-[180px] lg:w-[200px] lg:h-[200px] rounded-full overflow-hidden flex-shrink-0";

  const content = (
    <>
      <div className={photoWrapperClass}>
        <Image
          src={member.photoPath}
          alt={member.name}
          width={200}
          height={200}
          className="w-full h-full object-cover"
        />
      </div>
      <h3
        className={`mt-4 text-[18px] font-bold text-[#0c0c48] tracking-[0.64px] leading-normal ${
          profileUrl ? "group-hover:underline" : ""
        }`}
      >
        {member.name}
      </h3>
      <p className="mt-1 text-[15px] text-black tracking-[0.48px] leading-normal">
        {member.title}
      </p>
    </>
  );

  if (profileUrl) {
    return (
      <a
        href={profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${member.name} — open profile in a new tab`}
        className="flex flex-col items-center text-center group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0c0c48] focus-visible:ring-offset-2 rounded-lg transition-all duration-200 hover:-translate-y-1 hover:outline hover:outline-2 hover:outline-[#0c0c48] hover:outline-offset-[6px]"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="flex flex-col items-center text-center">{content}</div>
  );
}
