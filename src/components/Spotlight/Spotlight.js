import styles from './Spotlight.module.scss';

const Spotlight = () => {
   const prelimText = (
     <p className={styles.Lead}>
       A San Francisco institution for decades, the Golden Gate Classic brings together bowlers from across the country,
       embodying the spirit of Unity, Fellowship, and Inclusion that define IGBO.
     </p>
   );

  const gearingUp = (
    <div className={`${styles.Update} my-4`}>
      <div className="d-flex align-items-center gap-3 mb-3">
        <span className={styles.Icon}>
          <i className="bi bi-megaphone-fill"></i>
        </span>
        <h3 className={styles.Title}>Important Update - Change of Date</h3>
      </div>

      <p className={styles.Body}>
        Please note above: We have changed our tournament dates! Due to the NFL having their Big Game on President&apos;s Day Weekend for the near future, we have elected to move our tournament to the summer. We have chosen the 3rd weekend of June.
      </p>

      <p className={styles.Body}>
        This also happens to be the weekend just before San Francisco&apos;s Annual Pride Weekend. So...
      </p>

      <div className={styles.Banner}>
        <h4 className="display gradient-text">Come for Bowling. Stay for Pride!</h4>
      </div>

      <p className={`${styles.Body} mb-0`}>
        Keep an eye on this space for further updates until we open Registration around the end of year holiday season.
      </p>
    </div>
  );

  return (
    <section className={`${styles.Spotlight} container-fluid px-3 px-md-4`}>
      <div className={styles.Wrap}>
        {prelimText}
        {gearingUp}
      </div>
    </section>
  );
}

export default Spotlight;
