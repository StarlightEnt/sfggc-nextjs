import styles from './Spotlight.module.scss';
import Link from "next/link";

const Spotlight = () => {
   const prelimText = (
     <p className={styles.Lead}>
       A San Francisco institution for decades, the Golden Gate Classic brings together bowlers from across the country,
       embodying the spirit of Unity, Fellowship, and Inclusion that define IGBO.
     </p>
   );

  // const registrationOpeningDate = (
  //    <p>
  //      Registration opens to the public in mid-November, so get your keyboards ready!
  //    </p>
  //  )

  // const registrationOpen = (
  //   <p>
  //     Registration is open! Now is the time to get your team&apos;s entry in.
  //   </p>
  //  )

  // const scratchMastersResults = (
  //   <p>
  //     Scratch Masters results can be found <Link href={'/results'}>here</Link>.
  //   </p>
  // )

  // const almostTime = (
  //   <>
  //     <p>
  //       It&apos;s almost tournament weekend! We want to wish everyone a warm welcome to the Bay Area. Thank you for being part of our tournament; we literally could not do it without you!
  //     </p>
  //     <p>Registration is now closed.  If you are still interested in bowling, please contact the 
  //               <br />
  //               <a href={'mailto:directors@goldengateclassic.org?subject=About%20the%20Golden%20Gate%20Classic'}>
  //                 Tournament Directors.
  //               </a>      </p>     
  //     <p>
  //       Keep an eye on this space for updates between now and the end of tournament weekend.
  //     </p>
  //   </>
  // );

  // const itsTime = (
  //   <>
  //     <p>
  //       It&apos;s tournament weekend! We want to wish everyone a warm welcome to the Bay Area, even if the weather isn&apos;t really cooperating. Thank you for being part of our tournament; we literally could not do it without you!
  //     </p>
  //     <p>
  //       Keep an eye on this space for updates between now and the end of tournament weekend.
  //     </p>
  //     {/*{scratchMastersResults}*/}
  //   </>
  // );

  const gearingUp = (
    <div className={`${styles.Update} my-4`}>
      <div className="d-flex align-items-center gap-3 mb-3">
        <span className={styles.Icon}>
          <i className="bi bi-megaphone-fill"></i>
        </span>
        <h3 className={styles.Title}>Important Update - Change of Date</h3>
      </div>

      <p className={styles.Body}>
        Please note above. We have changed our date! Due to the NFL having their Big Game on President&apos;s Day Weekend for the near future, we have elected to move our tournament to the summer. We have chosen the 3rd weekend of June.
      </p>
      <p className={styles.Body}>
        This also happens to be the weekend just before San Francisco&apos;s Annual Pride Weekend. So...
      </p>
      <div className={styles.Banner}>
        <h3 className="display gradient-text">Come for Bowling. Stay for Pride!</h3>
      </div>
      <p className={`${styles.Body} mb-0`}>
        Keep an eye on this space for further updates until we open Registration around the end of year holiday season.
      </p>
      {/*{scratchMastersResults}*/}
    </div>
  );

  // const thatsAWrap = (
  //   <>
  //     <h3>That&apos;s a wrap!</h3>
  //     <p>We hope everyone had a fabulous tournament! Thank you to everyone who journeyed from near and far to be with us for the holiday weekend. Whether you were bowling, volunteering, working, or playing cheerleader, we are thrilled that you joined us.</p>
  //     <p>We are already excited for next year! Got a suggestion for how we can make next year&apos;s tournament even better?{' '}
  //       <a href={'mailto:directors@goldengateclassic.com?subject=SFGGC%202026'}>
  //         Drop us a line!
  //       </a>
  //     </p>
  //     <p>Results are available <Link href={'/results'}>here</Link>.</p>
  //   </>
  //  );

  return (
    <section className={`${styles.Spotlight} container-fluid px-3 px-md-4`}>
      <div className={styles.Wrap}>
        {prelimText}
        {/*registrationOpeningDate*/}
        {/*registrationOpen*/}
        {/*<RegisterCTA/>*/}
        {/*almostTime*/}
        {/*{itsTime}*/}
        {gearingUp}
        {/*{scratchMastersResults}*/}
        {/*thatsAWrap*/}
      </div>
    </section>
  );
}

export default Spotlight;
