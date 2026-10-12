import styles from './Mission.module.scss';

const Mission = () => (
  <section className={`${styles.Mission} my-5`} id={'section-mission'}>
    <h3 className={`section-heading mb-0`}>
      Mission Statement
    </h3>

    <div className="glass-card p-4 p-md-5 rounded-top-0 border-top-0 text-center">
      <div className={styles.Quote}>
        <i className={`bi bi-quote ${styles.Mark}`}></i>
        <p className={styles.Text}>
          To seamlessly integrate friendly competition that reflects the full diversity of the Bay Area, by creating an experience where every participant, regardless of background or skill level, feels welcomed and recognizes their own contribution to the spirit of the tournament and its success.
        </p>
      </div>
    </div>
  </section>
);

export default Mission;
