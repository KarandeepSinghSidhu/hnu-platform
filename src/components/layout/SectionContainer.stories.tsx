import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import SectionContainer from './SectionContainer';

const meta: Meta<typeof SectionContainer> = {
  title: 'Layout/SectionContainer',
  component: SectionContainer,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    padding: { control: 'select', options: ['sm', 'md', 'lg'] },
    background: { control: 'select', options: ['white', 'light', 'dark'] },
  },
};

export default meta;
type Story = StoryObj<typeof SectionContainer>;

const SampleContent = () => (
  <div>
    <h2 className="text-2xl font-bold mb-4">Section Heading</h2>
    <p className="text-gray-600 max-w-prose">
      This is example content inside a SectionContainer. The container constrains the width to
      max-w-6xl and adds consistent horizontal and vertical padding.
    </p>
  </div>
);

export const Default: Story = {
  args: { padding: 'md', background: 'white' },
  render: (args) => (
    <SectionContainer {...args}>
      <SampleContent />
    </SectionContainer>
  ),
};

export const PaddingSm: Story = {
  args: { padding: 'sm', background: 'white' },
  render: (args) => (
    <SectionContainer {...args}>
      <SampleContent />
    </SectionContainer>
  ),
};

export const PaddingLg: Story = {
  args: { padding: 'lg', background: 'white' },
  render: (args) => (
    <SectionContainer {...args}>
      <SampleContent />
    </SectionContainer>
  ),
};

export const BackgroundLight: Story = {
  args: { padding: 'md', background: 'light' },
  render: (args) => (
    <SectionContainer {...args}>
      <SampleContent />
    </SectionContainer>
  ),
};

export const BackgroundDark: Story = {
  args: { padding: 'md', background: 'dark' },
  render: (args) => (
    <SectionContainer {...args}>
      <div>
        <h2 className="text-2xl font-bold mb-4">Section Heading</h2>
        <p className="text-gray-300 max-w-prose">
          This is example content inside a dark SectionContainer. Text colours should be adapted
          for contrast on the UoA navy background.
        </p>
      </div>
    </SectionContainer>
  ),
};

export const AlternatingSections: Story = {
  render: () => (
    <>
      <SectionContainer background="white" padding="md">
        <SampleContent />
      </SectionContainer>
      <SectionContainer background="light" padding="md">
        <SampleContent />
      </SectionContainer>
      <SectionContainer background="dark" padding="md">
        <div>
          <h2 className="text-2xl font-bold mb-4">Section Heading</h2>
          <p className="text-gray-300 max-w-prose">Dark section with navy background.</p>
        </div>
      </SectionContainer>
      <SectionContainer background="white" padding="md">
        <SampleContent />
      </SectionContainer>
    </>
  ),
};
