import RootLayout from "../components/layout/layout";
import Results from "../components/Results/Results";
import ScrMstWinners from "../components/ScrMstWinners/ScrMstWinners";

const ResultsPage = ({ showStandingsLink, showOptionalEventsLink }) => {
  return (
    <div>

      <Results
        showStandingsLink={showStandingsLink}
        showOptionalEventsLink={showOptionalEventsLink}
      />
      <ScrMstWinners/>

    </div>
  )
}

ResultsPage.getLayout = function getLayout(page) {
  return (
    <RootLayout>
      {page}
    </RootLayout>
  );
}

export async function getServerSideProps() {
  const baseUrl = `http://localhost:${process.env.PORT || 3000}`;

  const [scoresRes, optionalRes] = await Promise.all([
    fetch(`${baseUrl}/api/portal/admin/scores/visibility`).catch(() => null),
    fetch(`${baseUrl}/api/portal/admin/optional-events/visibility`).catch(() => null),
  ]);

  const scoresData = scoresRes?.ok ? await scoresRes.json() : null;
  const optionalData = optionalRes?.ok ? await optionalRes.json() : null;

  return {
    props: {
      showStandingsLink: scoresData?.participantsCanViewScores ?? false,
      showOptionalEventsLink: optionalData?.participantsCanViewOptionalEvents ?? false,
    },
  };
}

export default ResultsPage;
