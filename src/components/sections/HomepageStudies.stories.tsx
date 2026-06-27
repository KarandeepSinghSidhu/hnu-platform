import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import HomepageStudies from "./HomepageStudies";

const meta: Meta<typeof HomepageStudies> = {
  title: "Components/Sections/HomepageStudies",
  component: HomepageStudies,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof HomepageStudies>;

export const Default: Story = {};
