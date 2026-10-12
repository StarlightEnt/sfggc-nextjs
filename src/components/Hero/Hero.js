import Spotlight from "../Spotlight/Spotlight";
import styles from './Hero.module.scss';
import RegisterCTA from "../RegisterCTA/RegisterCTA";

const Hero = () => {
  return (
    <section className={`${styles.Hero} py-4 py-lg-5`}>
      <div className={`${styles.Content} container-fluid px-3 px-md-4`}>
        
        <div className="text-center mb-3">
          <span className="badge-glow d-inline-flex align-items-center gap-2 shadow-sm">
            <i className="bi bi-shield-check text-primary"></i>
            Official IGBO Tournament
          </span>
        </div>

        <h1 className={`display-1 fw-extrabold text-dark tracking-tight ${styles.Title}`}>
          The San Francisco <br className="d-none d-md-inline" />
          <span className="gradient-text">Golden Gate Classic</span>
        </h1>

        <h2 className={`fs-4 text-muted fw-normal mb-4 ${styles.Subtitle}`}>
          An <span className="fw-bold text-dark">IGBO</span> Bowling Tournament in Daly City, CA
        </h2>

        <div className="row justify-content-center g-3 my-4">
          <div className="col-12 col-md-4 col-lg-3">
            <div className="glass-card p-3 text-center border-top border-3" style={{ borderTopColor: '#e11d48' }}>
              <i className="bi bi-calendar3 fs-3 mb-2 d-block" style={{ color: '#e11d48' }}></i>
              <span className="text-muted fs-7 text-uppercase fw-semibold d-block">Dates</span>
              <strong className="text-dark fs-6">June 18-20, 2027</strong>
            </div>
          </div>

          <div className="col-12 col-md-4 col-lg-3">
            <div className="glass-card p-3 text-center border-top border-3" style={{ borderTopColor: '#2563eb' }}>
              <i className="bi bi-geo-alt-fill fs-3 mb-2 d-block" style={{ color: '#2563eb' }}></i>
              <span className="text-muted fs-7 text-uppercase fw-semibold d-block">Location</span>
              <strong className="text-dark fs-6">Classic Bowling Center</strong>
            </div>
          </div>

          <div className="col-12 col-md-4 col-lg-3">
            <div className="glass-card p-3 text-center border-top border-3" style={{ borderTopColor: '#f97316' }}>
              <i className="bi bi-clock-history fs-3 mb-2 d-block" style={{ color: '#f97316' }}></i>
              <span className="text-muted fs-7 text-uppercase fw-semibold d-block">Holiday</span>
              <strong className="text-dark fs-6">Juneteenth Weekend</strong>
            </div>
          </div>
        </div>

        <RegisterCTA />
      </div>

      <Spotlight />
    </section>
  );
};

export default Hero;

