import styles from './Spotlight.module.scss';
import Link from "next/link";

const Spotlight = () => {
   const prelimText = (
     <p className="lead text-muted mb-4 fs-5">
       A San Francisco institution for decades, the Golden Gate Classic brings together bowlers from across the country,
       embodying the spirit of Unity, Fellowship, and Inclusion that define IGBO.
     </p>
   );

  const gearingUp = (
    <div className="glass-card p-4 p-md-5 my-4 border border-primary border-opacity-25 rounded-4 shadow-sm text-start">
      <div className="d-flex align-items-center gap-3 mb-3">
        <span className="bg-primary bg-opacity-10 text-primary p-2 rounded-circle d-inline-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
          <i className="bi bi-megaphone-fill fs-4"></i>
        </span>
        <h3 className="fs-3 fw-bold text-dark mb-0">Important Update - Change of Date</h3>
      </div>
      
      <p className="text-secondary fs-6">
        Please note above: We have changed our tournament dates! Due to the NFL having their Big Game on President&apos;s Day Weekend for the near future, we have elected to move our tournament to the summer. We have chosen the 3rd weekend of June.
      </p>
      
      <p className="text-secondary fs-6">
        This also happens to be the weekend just before San Francisco&apos;s Annual Pride Weekend. So...
      </p>

      <div className="p-3 my-3 rounded-3 bg-primary bg-opacity-10 border border-primary border-opacity-20 text-center">
        <h4 className="gradient-text fs-2 fw-extrabold mb-0">Come for Bowling. Stay for Pride!</h4>
      </div>

      <p className="text-muted fs-6 mb-0">
        Keep an eye on this space for further updates until we open Registration around the end of year holiday season.
      </p>
    </div>
  );

  return (
    <section className={`${styles.Spotlight} container-fluid px-3 px-md-4`}>
      <div className="max-w-4xl mx-auto text-center">
        {prelimText}
        {gearingUp}
      </div>
    </section>
  );
}

export default Spotlight;

