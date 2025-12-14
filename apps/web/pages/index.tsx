import Head from 'next/head';
import React from 'react';

export default function Home(): JSX.Element {
  return (
    <>
      <Head>
        <title>Darbo portalas</title>
        <meta name="description" content="Lietuviškas darbo skelbimų portalas" />
      </Head>
      <main style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: '2rem' }}>
        <h1>Darbo portalo startas</h1>
        <p>
          Tai pradinė Next.js aplikacija, kuri bus pildoma pagal išsamų projekto aprašą. Čia bus SSR puslapiai,
          kandidatų ir darbdavių skydeliai, bei administravimo zona.
        </p>
        <ul>
          <li>SSR/ISR puslapiai skelbimų SEO.</li>
          <li>Autentifikacija su JWT ir Google OAuth.</li>
          <li>Integracijos su Stripe, S3, Postgres ir Redis.</li>
        </ul>
      </main>
    </>
  );
}
