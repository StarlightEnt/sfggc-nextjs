import styles from './Results.module.scss';

const RESULTS_FROM_QUERY = "%2Fresults";

const Results = ({ showStandingsLink = false, showOptionalEventsLink = false }) => {
  const available = [
    [
      { id: 'sm_qualifier_final', name: 'Scratch Masters Qualifiers Final' },
    ],
  ];

  return (
    <section className={`${styles.Results} my-5`}>
      <h3 className={`section-heading mb-0`}>
        Tournament Results
      </h3>
      
      <div className="glass-card p-4 p-md-5 rounded-top-0 border-top-0">
        <div className={`${styles.Notice} mb-4`}>
          <strong className={styles.NoticeTitle}>
            <i className="bi bi-info-circle-fill me-1"></i> Winner Payout Update
          </strong>
          Much apologies to our winners for the delay in getting your awards out. Rest assured, all checks have been processed.
        </div>
            
        <div className="row g-3">
          {available.map((resultSet, i) => (
            <div className="col-12 col-lg-6" key={i}>
              <div className={styles.ResultsCard}>
                <div className="d-flex flex-column gap-2">
                  {resultSet.map((result, j) => {
                    return (
                      <div key={j} className={styles.ResultItem}>
                        <span className={styles.ResultName}>
                          <i className="bi bi-file-earmark-pdf-fill me-2"></i>
                          {result.name}
                        </span>
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
