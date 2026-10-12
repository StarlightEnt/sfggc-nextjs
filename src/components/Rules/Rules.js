import styles from './Rules.module.scss';
import ReactMarkdown from "react-markdown";
import React from "react";
import Image from "next/image";
import dymk from '../../images/sponsors/dymk.jpg';

const Rules = () => {
  const sections = [
    {
      header: 'Sanctioning & Membership',
      markdown: `
* USBC-certified tournament; all participants must hold a current USBC adult membership (purchase at https://bowl.com/). However, participants who choose not to be a USBC member may compete under SFGGC's Moral Support Tournament Certiciation for non-members.
* Non-USBC particpants who bowl in an IGBO-sanctioned league may qualify for entry by paying a one-time tournament participation fee of $5.00 prior to the start of the tournament. These participants are subject to USBC rules for this tournament but are not eligible for USBC Awards.
*	IGBO membership required (purchase at https://www.igbo.org/).
`,
    },
    {
      header: 'Event Participation',
      markdown: `
* Mixed handicap tournament by invitation only.
* Events: Singles, Doubles, Team (3 games per event).
  *  Must bowl all 3 events but only once each event.
  *  Doubles partner must be from your team
* Teams consist of 4 members (any gender identity).
* Professional bowlers allowed, but only 1 per team.
  *  Identify yourself during registration or be subject to disqualification, loss of entry fee, and prizes.
`,
    },
    {
      header: 'Awards & Prizes',
      markdown: `
* Based on total pins plus handicap.
* Awards for highest scores in Singles, Doubles, and Team events (1:10 ratio).
* Prizes distributed within 30 days post-tournament.
`,
    },
    {
      header: 'Entering Averages',
      markdown: `
* Handicap: 90% of the difference between average and 225.
* Averages will be taken from the following sources.  
  * The Highest of Options A or B below:
    * A.  Composite League Average 2025-2026 (with at least 21 games bowled)
    * B.  IGBO Tournament Average (TAD) from 1/1/26 to 12/31/26 (minimum 9 games)
  * If neither of the above applies, then Option C below applies
    * C.  Composite League Average 2026-2027 as of 12/31/2026 (with at least 21 games bowled)
  * If NONE of the above applies, contact us as soon as possible (directors@goldengateclassic.org).
* Averages must be verified via credible websites or documents.
* Submitting an incorrect average will result in disqualification.
* The Tournament Director(s) reserve(s) the right to determine and adjust a bowler's entering average.
`,
    },
    {
      header: 'Attendance & Substitutes',
      markdown: `
* Bowlers must be on time; late arrivals score zeros for missed frames.
* Authorized substitutes allowed in cases of absence, illness, or injury but may not start in the middle of a game.
`,
    },
    {
      header: 'Entry Requirements',
      markdown: `
* Fees: **$124** on or before May 31, 2027.
* Registration will not be considered complete until Entry Fees and Memberships are PAID IN FULL. 
* Deadline: May 31, 2027. No refunds except at director’s discretion.
`,
    },
    {
      header: 'Protests',
      markdown: `
* Errors must be reported within one-hour post-game. Decisions are final unless appealed under USBC rules.
`,
    },
    {
      header: 'Optional Events & General Rules',
      markdown: `
* Optional events handled separately; errors capped at entry cost.
* If you require special assistance, please contact us asap (directors@goldengateclassic.org).  
* Tournament Director(s) reserve(s) the right to make decisions necessary that will ensure fair play and uphold the integrity of the competition and the tournament.
`,
    },
  ];

  const scratchMarkdown = `
1. **Overview:** 
The Scratch Masters is an optional, mixed competition with a separate entry fee, open to all SFGGC participants.
1. **Divisions & Fees:**
    *  Division A: 208+ ($55)
    *  Division B: 190-207 ($50)
    *  Division C: 170-189 ($45)
    *  Division D: 150-169 ($40)
    *  Division E: 0-149 ($35)
    *  Tournament Director(s) may adjust a bowler’s division before they bowl.
1. **Qualification:** 
Scratch scores from Doubles, Singles, and Team events determine the top 6 qualifiers and one alternate per division (no handicap). A tie for 6th is settled with a 9th-and-10th-frame roll-off.
1. **Competition Format:**
    * Qualifiers bowl 3 games each on rotating lanes. The two (2) lowest scores are eliminated, and the remaining 4 advance. Ties are broken by a one-ball roll-off.
    * The top 4 bowlers compete in a head-to-head stepladder format, with previous scores discarded. Higher-seeded bowlers choose to finish first or last.
1. **Practice & Timing:** 
Qualifiers get 10 minutes of practice before competition. Bowlers must be checked in 30 minutes before the start or be replaced by the alternate.
1.  **Match Timing:** 
Matches begins on the final day of the Tournament (Sunday) at 10am. Each division bowls on separate lanes.
1.  **Errors & Protests:**
Claims of error during a roll-off must be submitted before the next match begins. For the final match, any error must be reported within one (1) hour of its conclusion.
1.  **Payouts:**
100% of entry fees (less lineage) are paid out with a minimum 1:2 ratio and up to 6 places per division.
1.  **Participation:**
If fewer than 6 bowlers sign up in a division, all participants will bowl in the same format until the top 4 or less remain for stepladder.
`;

  return (
    <div className="d-flex flex-column gap-5">
      <section className={`${styles.Rules} my-4`}>
        <h3 className={`section-heading`}>
          Tournament Rules
        </h3>

        <div className="section-panel">
          <div className={`${styles.Toolbar} d-flex justify-content-between align-items-center mb-4 pb-3 flex-wrap gap-2`}>
            <span className="badge-glow">
              (Draft)
            </span>
            <a href='#scratch_masters_rules' className="btn btn-sm btn-outline-secondary rounded-pill px-3 py-2">
              (skip to Scratch Masters rules) <i className="bi bi-arrow-down ms-1"></i>
            </a>
          </div>

          <p className={`${styles.Lead} mb-4`}>
            The 2027 San Francisco Golden Gate Classic shall be held from Friday, June 18, through Sunday, June 20, 2027, at Classic Bowling Center, located at 900 King Dr., Daly City, CA 94015.
          </p>

          <div className="row g-4">
            {sections.map((section, i) => (
              <div key={i} className="col-12 col-md-6">
                <div className={`${styles.RuleCard} h-100`}>
                  <h4 className={styles.RuleTitle}>
                    <span className={styles.RuleNumber}>{i + 1}</span>
                    {section.header}
                  </h4>
                  <div className={styles.RuleBody}>
                    <ReactMarkdown>{section.markdown}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.Rules} my-4`}>
        <h3 className={`section-heading`} id={'scratch_masters_rules'}>
          Scratch Masters Rules
        </h3>

        <div className="section-panel">
          <p className={`${styles.Draft} mb-4`}>
            <span className="badge-glow">
              (Draft)
            </span>
          </p>

          <div className={`${styles.SponsorCard} mb-4`}>
            <div className="row align-items-center g-3">
              <div className="col-12 col-md-8">
                <span className={styles.SponsorTag}>Scratch Masters sponsored by</span>
                <h4 className={styles.SponsorName}>Does Your Mother Know</h4>
                <address className={`${styles.SponsorAddress} fst-normal mb-0`}>
                  <span className="d-block">
                    4141 18th St.
                  </span>
                  <span className="d-block">
                    San Francisco, CA 94114
                  </span>
                  <span className="d-block">
                    <a href={'tel:4158643160'} className="text-decoration-none">
                      <i className={'bi bi-telephone-fill pe-2'} aria-hidden={true}/>
                      415-864-3160
                    </a>
                  </span>
                  <span className="d-block">
                    <a href={'https://dymkmedia.wixsite.com/does-your-mother-k-1'}
                       target={'_blank'} rel="noreferrer" className="text-decoration-none">
                      <i className={'bi bi-globe2'} aria-hidden={true}/>
                      <span className={'visually-hidden'}>
                        website
                      </span>
                    </a>
                  </span>
                </address>
              </div>
              <div className="col-12 col-md-4 text-md-end">
                <a href={'https://dymkmedia.wixsite.com/does-your-mother-k-1'} target={'_blank'} rel="noreferrer">
                  <Image src={dymk} className={'img-fluid logo-tile p-1'} alt={'Logo for Does Your Mother Know'} style={{ maxHeight: '80px', width: 'auto' }}/>
                </a>
              </div>
            </div>
          </div>

          <div className={styles.RuleBody}>
            <ReactMarkdown>{scratchMarkdown}</ReactMarkdown>
          </div>
        </div>
      </section>
    </div>
  );

}

export default Rules;
