import Image from "next/image";
import styles from './Committee.module.scss';

import glenn from '../../images/committee/glenn.jpg';
import allison from '../../images/committee/allison.jpg';
import duane from '../../images/committee/duane.jpg';
import cathy from '../../images/committee/cathy.jpg';
import jfunson from '../../images/committee/jfunson.jpg';

const Committee = () => {
  const directors = [
    {
      name: 'Allison Laureano',
      alt: 'A cartoon image of Allison',
      role: 'Co-Director',
      image: allison,
      email: 'mailto:directors@goldengateclassic.org?subject=About%20the%20Golden%20Gate%20Classic',
    },
    {
      name: 'Cathy Patterson',
      alt: 'Cathy Patterson',
      role: 'Co-Director',
      image: cathy,
      email: 'mailto:directors@goldengateclassic.org?subject=About%20the%20Golden%20Gate%20Classic',
    },
    {
      name: 'Duane Flohra',
      alt: 'Duane',
      role: 'Scratch Master',
      image: duane,
      email: 'mailto:directors@goldengateclassic.org?subject=About%20the%20Golden%20Gate%20Classic',
    },
    {
      name: 'JF Unson',
      alt: 'JF Unson',
      role: 'Chief Technologist',
      image: jfunson,
      email: 'mailto:jfu@jfunson.com?subject=About%20the%20Golden%20Gate%20Classic',
    },
  ];

  const volunteers = [
    'John Bernier', 'Mark Bertelsen', 'Stephanie Godizano', 'Robert Hughes',
    'Stephen Ingram', 'Raymond Ledesma', 'Glenn Normandin', "Patrick O'Connor",
    'Saman Oun', 'Richard Perez'
  ];

  return (
    <section className={`${styles.Committee} my-5`} id={'contact'}>
      <h3 className={`section-heading mb-0`}>
        Tournament Committee
      </h3>

      <div className="glass-card p-4 p-md-5 rounded-top-0 border-top-0">
        <p className={`${styles.Intro} text-center mb-5`}>
          Putting on a tournament is a community effort. The Golden Gate Classic wouldn&apos;t be possible without the work and contributions of all the people on this page.
        </p>

        <div className="row g-4 justify-content-center mb-5">
          {directors.map((person, i) => (
            <div key={i} className="col-12 col-sm-6 col-lg-3">
              <div className={`${styles.Card} h-100`}>
                <div className={styles.Photo}>
                  <Image src={person.image}
                         alt={person.alt}
                         fill
                         sizes="(max-width: 768px) 100vw, 250px"
                         style={{ objectFit: 'cover' }}
                  />
                </div>
                <h5 className={styles.Name}>
                  <a href={person.email}>
                    {person.name}
                  </a>
                </h5>
                <span className="badge-glow">
                  {person.role}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.Volunteers}>
          <h5 className={styles.VolunteersTitle}>
            <i className="bi bi-heart-fill"></i>
            Committee &amp; Volunteers
          </h5>
          <div className="d-flex flex-wrap justify-content-center gap-2">
            {volunteers.map((name, i) => (
              <span key={i} className={styles.Volunteer}>
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Committee;

