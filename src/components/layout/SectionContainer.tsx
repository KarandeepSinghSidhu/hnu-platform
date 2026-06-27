import { type CSSProperties, type ReactNode } from 'react';

type Padding = 'sm' | 'md' | 'lg';
type Background = 'white' | 'light' | 'dark';

interface SectionContainerProps {
  children: ReactNode;
  padding?: Padding;
  background?: Background;
  className?: string;
  as?: 'section' | 'div' | 'article' | 'aside';
}

const paddingClasses: Record<Padding, string> = {
  sm: 'py-8',
  md: 'py-14',
  lg: 'py-20',
};

const backgroundClasses: Record<Background, string> = {
  white: 'bg-white text-foreground',
  light: 'bg-gray-50 text-foreground',
  dark: 'text-white',
};

const backgroundStyles: Partial<Record<Background, CSSProperties>> = {
  dark: { backgroundColor: 'var(--uoa-navy)' },
};

export default function SectionContainer({
  children,
  padding = 'md',
  background = 'white',
  className = '',
  as: Tag = 'section',
}: SectionContainerProps) {
  return (
    <Tag
      className={`${backgroundClasses[background]} ${paddingClasses[padding]} ${className}`}
      style={backgroundStyles[background]}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </Tag>
  );
}
