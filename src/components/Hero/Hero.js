import Spotlight from "../Spotlight/Spotlight";
import styles from './Hero.module.scss';
import RegisterCTA from "../RegisterCTA/RegisterCTA";

const STATS = [
  {label: 'Dates', value: 'June 18-20, 2027', icon: 'bi-calendar3', accent: 'var(--sfggc-pride-red)'},
  {label: 'Weekend', value: 'Juneteenth Weekend', icon: 'bi-stars', accent: 'var(--sfggc-pride-orange)'},
];

const Hero = () => {
  return (
    <section className={`${styles.Hero} py-4 py-lg-5`}>
      <div className={`${styles.Content} container-fluid px-3 px-md-4`}>

        <h1 className={`display ${styles.Title}`}>
          The San Francisco <br className="d-none d-md-inline" />
          <span className="gradient-text">Golden Gate Classic Invitational</span>
        </h1>

        <h2 className={styles.Subtitle}>
          An{' '}
          <strong>IGBO</strong>
          {' '}bowling tournament
        </h2>

        <div className="row justify-content-center g-3 my-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="col-12 col-sm-6 col-lg-4">
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
