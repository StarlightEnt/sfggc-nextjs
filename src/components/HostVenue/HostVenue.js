import styles from './HostVenue.module.scss';

const HostVenue = () => (
  <section className={`${styles.HostVenue} my-5`} id={'section-hostvenue'}>
    <h3 className={`section-heading`}>
      Host Venue
    </h3>

    <div className="section-panel">
      <p className={styles.Copy}>
        The Pilsner Inn will be our Host Bar all Weekend.  Show up with your Tournament Badge to receive a $1 discount on drinks for the duration of the tournament.
      </p>
      <p className={styles.Address}>
        225 Church St. 
      <br />
        San Francisco, CA 94114
      </p>
      <p className="mb-0">
       <a href="https://www.pilsnerinn.com" className={styles.Link}>
        https://www.pilsnerinn.com
       </a>
      </p>
    </div>
  </section>
);


export default HostVenue;
