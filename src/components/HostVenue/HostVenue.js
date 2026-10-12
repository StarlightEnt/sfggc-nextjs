import styles from './HostVenue.module.scss';

const HostVenue = () => (
  <section className={`${styles.HostVenue} my-5`} id={'section-hostvenue'}>
    <h3 className={`section-heading mb-0`}>
      Host Venue
    </h3>

    <div className="glass-card p-4 p-md-5 rounded-top-0 border-top-0">
      <div className="row align-items-center g-4">
        <div className="col-12 col-md-8">
          <div className="d-flex align-items-center gap-2 mb-3">
            <span className="badge bg-primary bg-opacity-25 text-primary border border-primary border-opacity-25 px-3 py-2 rounded-pill fs-6 fw-semibold">
              <i className="bi bi-tag-fill me-1"></i> Tournament Discount
            </span>
          </div>

          <h4 className="fs-2 fw-bold text-dark mb-2">The Pilsner Inn</h4>
          <p className="text-secondary fs-5 mb-3">
            The Pilsner Inn will be our Host Bar all weekend long. Show up with your <strong className="text-dark">Tournament Badge</strong> to receive a <strong className="text-primary">$1 discount</strong> on drinks for the duration of the tournament!
          </p>

          <div className="d-flex align-items-center gap-2 text-muted fs-6">
            <i className="bi bi-geo-alt-fill text-primary"></i>
            <span>225 Church St, San Francisco, CA 94114</span>
          </div>
        </div>

        <div className="col-12 col-md-4 text-md-end">
          <a href="https://www.pilsnerinn.com" target="_blank" rel="noreferrer" className="btn btn-glow-orange d-inline-flex align-items-center gap-2">
            <i className="bi bi-box-arrow-up-right"></i> Visit Pilsner Inn
          </a>
        </div>
      </div>
    </div>
  </section>
);

export default HostVenue;








