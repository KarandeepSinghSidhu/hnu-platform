import Navbar from './Navbar';
import Footer from './Footer';

interface PageLayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
  transparentNavbar?: boolean;
}

export default function PageLayout({ children, title, description, transparentNavbar = false }: PageLayoutProps) {
  return (
    <>
      <div className={transparentNavbar ? "absolute top-0 left-0 w-full z-50 bg-transparent" : "bg-[#0c0c48]"}>
        <Navbar />
      </div>
      <main id="main-content" className={transparentNavbar ? "flex-1 w-full bg-white" : "flex-1 max-w-7xl mx-auto w-full px-4 py-8 bg-white"}>
        {children}
      </main>
      <Footer />
    </>
  );
}
