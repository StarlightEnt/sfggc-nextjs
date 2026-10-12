import {ThemeContextProvider} from "../../utils/ThemeContext";
import Navigation from "./navigation";
import Header from "./header";
import Footer from "./footer";
import Sponsors from "../Sponsors/Sponsors";

export default function RootLayout({ children }) {
  return (
    <ThemeContextProvider>
      <div className="pride-rainbow-bar position-sticky top-0 z-3"></div>
      <div className={`container-xl px-3 px-xl-4`}>
        <Header/>
        <Navigation/>

        <main className="py-2">
          {children}
        </main>

        <Sponsors/>
        <Footer/>
      </div>
    </ThemeContextProvider>
  );
}

