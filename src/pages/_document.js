import {Html, Head, Main, NextScript} from "next/document";

const Document = () => (
  <Html lang="en">
    <Head>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:ital,wght@0,400;0,600;0,700;0,800;1,600&display=swap"
        rel="stylesheet"
      />
    </Head>
    <body>
      <div className={`nav-and-top`} id={'tippy-top'}>
        {/*  <Navigation/>*/}
        {/*  <Hero/>*/}
        <div className={`top-image-background`}></div>
        <div className={`top-background-shade`}></div>

        <Main/>
        <NextScript/>
      </div>
    </body>
  </Html>
)

export default Document;
