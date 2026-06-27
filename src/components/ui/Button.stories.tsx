import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import Button from "./Button";

const meta: Meta<typeof Button> = {
  title: "Components/UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["blue", "white"],
    },
    color: {
      control: "select",
      options: ["dark", "standard", "light"],
    },
    href: { control: "text" },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Blue: Story = {
  args: { variant: "blue", color: "standard", children: "Get started" },
};

export const BlueDark: Story = {
  args: { variant: "blue", color: "dark", children: "Get started" },
};

export const BlueLight: Story = {
  args: { variant: "blue", color: "light", children: "Get started" },
};

export const White: Story = {
  args: { variant: "white", color: "standard", children: "Learn more" },
};

export const AsLink: Story = {
  args: { variant: "blue", href: "/about", children: "Internal link" },
};

export const AsExternalLink: Story = {
  args: {
    variant: "blue",
    href: "https://www.auckland.ac.nz",
    children: "External link",
  },
};
