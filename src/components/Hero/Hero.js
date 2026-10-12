import Spotlight from "../Spotlight/Spotlight";
import styles from './Hero.module.scss';
import RegisterCTA from "../RegisterCTA/RegisterCTA";

const STATS = [
  {label: 'Dates', value: 'June 18-20, 2027', icon: 'bi-calendar3', accent: 'var(--sfggc-pride-red)'},
  {label: 'Location', value: 'Classic Bowling Center', icon: 'bi-geo-alt-fill', accent: 'var(--sfggc-pride-blue)'},
  {label: 'Holiday', value: 'Juneteenth Weekend', icon: 'bi-clock-history', accent: 'var(--sfggc-pride-orange)'},
];

const Hero = () => {
  return (
    <section className={`${styles.Hero} py-4 py-lg-5`}>
      <div className={`${styles.Content} container-fluid px-3 px-md-4`}>

        <div className="text-center mb-3">
          <span className="badge-glow d-inline-flex align-items-center gap-2">
            <i className="bi bi-shield-check"></i>
            Official IGBO Tournament
          </span>
        </div>

        <h1 className={`display ${styles.Title}`}>
          The San Francisco <br className="d-none d-md-inline" />
          <span className="gradient-text">Golden Gate Classic</span>
        </h1>

        <h2 className={styles.Subtitle}>
          An <strong>IGBO</strong> Bowling Tournament in Daly City, CA
        </h2>

        <div className="row justify-content-center g-3 my-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="col-12 col-md-4 col-lg-3">
              <div className={styles.Stat} style={{'--accent': stat.accent}}>
                <i className={`bi ${stat.icon}`}></i>
                <span className={styles.Label}>{stat.label}</span>
                <strong className={styles.Value}>{stat.value}</strong>
              </div>
            </div>
          ))}
        </div>

        <RegisterCTA />
      </div>

      <Spotlight />
    </section>
  );
};

export default Hero;
