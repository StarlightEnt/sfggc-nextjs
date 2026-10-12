import styles from './RegisterCTA.module.scss';

const REGISTER_URL = 'https://go.signmeup.io/?eventid=51';

const RegisterCTA = ({ isOpen }) => (
  <div className={styles.RegisterCTA}>
    <div className={'my-4 d-flex justify-content-center align-items-center gap-3 flex-wrap'}>
      {isOpen ? (
        <a href={REGISTER_URL} className={`btn btn-lg btn-glow-orange d-inline-flex align-items-center gap-2`}>
          <i className="bi bi-trophy-fill"></i> Register Online
        </a>
      ) : (
        <button className={`${styles.Closed} d-inline-flex align-items-center gap-2`} disabled>
          <i className="bi bi-lock-fill"></i> Registration Closed
        </button>
      )}
    </div>
  </div>
)

export default RegisterCTA;
