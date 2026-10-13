import styles from './Results.module.scss';

const RESULTS_FROM_QUERY = "%2Fresults";

const Results = ({ showStandingsLink = false, showOptionalEventsLink = false }) => {
  const available = [
    [
      //{ id: 'doubles', name: 'Doubles Event' },
      //{ id: 'singles', name: 'Singles Event' },
      //{ id: 'team', name: 'Team Event' },
      //{ id: 'all_events', name: 'All Events' },
      //{ id: 'scratch_masters', name: 'Scratch Masters' },
      //{ id: 'best_3_of_9', name: 'Best 3 of 9' },
      // { id: 'shadow_team', name: 'Shadow Team' },
      //{ id: 'golden_mystery_doubles', name: 'Golden Mystery Doubles' },
      //{ id: 'valentine_3somes', name: 'Valentine 3somes' },
      //{ id: 'optional_scratch', name: 'Optional Scratch' },
      { id: 'sm_qualifier_final', name: 'Scratch Masters Qualifiers Final' },
    ],
  ];

  return (
    <section className={`${styles.Results} my-5`}>
      <h3 className={`section-heading`}>
        2026 Tournament Results
      </h3>
      
      <div className="section-panel">
        <div className={`${styles.Notice} mb-4`}>
          <i className={`bi bi-info-circle-fill ${styles.NoticeIcon}`} aria-hidden={true}></i>
          <p className="mb-0">
            **UPDATE.** Much apologies to our winners for the delay in getting your awards out.  We had a commitment of 30 days, and we did not meet that promise. Due to unforseen circumstances, we encountered a procedural hiccup in the check processing. Rest assured, all checks should be received during the week of March 16th.
          </p>
        </div>

        <div className="row g-3">
          {available.map((resultSet, i) => (
            <div className="col-12 col-lg-6" key={i}>
              <div className={styles.ResultsCard}>
                <div className="d-flex flex-column gap-2">
                  {resultSet.map((result, j) => {
                    return (
                      <div key={j} className={styles.ResultItem}>
                        <a href={`/results/2026/${result.id}.pdf`}
                           className={`${styles.ResultName} text-decoration-none`}>
                          <i className="bi bi-file-earmark-pdf-fill me-2"></i>
                          {`${result.name}`}
                        </a>
                        <a href={`/results/2026/${result.id}.pdf`}
                           className="btn btn-sm btn-glow-orange d-inline-flex align-items-center gap-2"
                           title='Download PDF'
                           target="_blank"
                           rel="noreferrer">
                          <i className="bi bi-download"></i> PDF
                        </a>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {(showStandingsLink || showOptionalEventsLink) && (
          <div className={`${styles.Actions} mt-4 pt-3 d-flex flex-wrap gap-3`}>
            {showStandingsLink && (
              <a className="btn btn-glow-orange d-inline-flex align-items-center gap-2" href={`/portal/scores?from=${RESULTS_FROM_QUERY}`}>
                <i className="bi bi-bar-chart-fill"></i> View Overall Standings
              </a>
            )}
            {showOptionalEventsLink && (
              <a
                className="btn btn-glow-orange d-inline-flex align-items-center gap-2"
                href={`/portal/admin/optional-events?from=${RESULTS_FROM_QUERY}`}
              >
                <i className="bi bi-award-fill"></i> View Optional Events
              </a>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default Results;
