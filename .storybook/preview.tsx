import '../src/app/globals.css';
import type { Preview } from '@storybook/nextjs-vite';
import { LanguageProvider } from '../src/contexts/LanguageContext';
import en from '../src/messages/en';

const preview: Preview = {
  // Components now read their copy from useLanguage().t (fed by the server in the
  // app). Stories have no server, so wrap every story in the provider with the
  // English dictionary — otherwise components like Navbar/Footer would render
  // with an empty dictionary.
  decorators: [
    (Story) => (
      <LanguageProvider initialLang="EN" dict={en}>
        <Story />
      </LanguageProvider>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      // 'todo' - show a11y violations in the test UI only
      // 'error' - fail CI on a11y violations
      // 'off' - skip a11y checks entirely
      test: 'todo'
    }
  },
};

export default preview;
