import Navigation from "./navigation";
import Header from "./header";
import Footer from "./footer";
import Sponsors from "../Sponsors/Sponsors";

export default function RootLayout({ children }) {
  return (
    <>
      <Header/>
      <Navigation/>
      <div className="stripe-bar"></div>

      <div className={`container-xl px-3 px-xl-4`}>
        <main className="py-2">
          {children}
        </main>

        <Sponsors/>
      </div>

      <div className="stripe-bar"></div>
      <Footer/>
    </>
  );
}
