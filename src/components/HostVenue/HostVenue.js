import styles from './HostVenue.module.scss';

const HostVenue = () => (
  <section className={`${styles.HostVenue} my-5`} id={'section-hostvenue'}>
    <h3 className={`section-heading mb-0`}>
      Host Venue
    </h3>

    <div className="glass-card p-4 p-md-5 rounded-top-0 border-top-0">
      <div className="row align-items-center g-4">
        <div className="col-12 col-md-8">
          <div className="mb-3">
            <span className={styles.Tag}>
              <i className="bi bi-tag-fill"></i> TOURNAMENT DISCOUNT
            </span>
          </div>

          <h4 className={styles.Name}>The Pilsner Inn</h4>
          <p className={styles.Copy}>
            The Pilsner Inn will be our Host Bar all weekend long. Show up with your <strong>Tournament Badge</strong> to receive a <strong className={styles.Highlight}>$1 discount</strong> on drinks for the duration of the tournament!
          </p>

          <div className={styles.Address}>
            <i className="bi bi-geo-alt-fill"></i>
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
