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
      role: 'Co-Director',
      image: allison,
      email: 'mailto:directors@goldengateclassic.org?subject=About%20the%20Golden%20Gate%20Classic',
    },
    {
      name: 'Cathy Patterson',
      role: 'Co-Director',
      image: cathy,
      email: 'mailto:directors@goldengateclassic.org?subject=About%20the%20Golden%20Gate%20Classic',
    },
    {
      name: 'Duane Flohra',
      role: 'Scratch Master',
      image: duane,
      email: 'mailto:directors@goldengateclassic.org?subject=About%20the%20Golden%20Gate%20Classic',
    },
    {
      name: 'JF Unson',
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
        <p className="text-center text-muted fs-5 mb-5 max-w-3xl mx-auto">
          Putting on a tournament is a community effort. The Golden Gate Classic wouldn&apos;t be possible without the work and contributions of all the dedicated people on this team.
        </p>

        <div className="row g-4 justify-content-center mb-5">
          {directors.map((person, i) => (
            <div key={i} className="col-12 col-sm-6 col-lg-3">
              <div className="glass-card h-100 p-3 text-center border border-secondary border-opacity-10 transition-all hover-transform-up">
                <div className="position-relative overflow-hidden rounded-4 mb-3" style={{ height: '220px' }}>
                  <Image src={person.image}
                         alt={person.name}
                         fill
                         sizes="(max-width: 768px) 100vw, 250px"
                         style={{ objectFit: 'cover' }}
                         className="rounded-4"
                  />
                </div>
                <h5 className="fs-5 fw-bold text-dark mb-1">
                  <a href={person.email} className="text-dark text-decoration-none hover-text-primary">
                    {person.name}
                  </a>
                </h5>
                <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 px-3 py-1 rounded-pill fs-7 fw-semibold">
                  {person.role}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="glass-card p-4 border border-secondary border-opacity-10 max-w-4xl mx-auto">
          <h5 className="fs-5 fw-bold text-dark mb-3 text-center d-flex align-items-center justify-content-center gap-2">
            <i className="bi bi-heart-fill text-primary"></i>
            Committee &amp; Dedicated Volunteers
          </h5>
          <div className="d-flex flex-wrap justify-content-center gap-2">
            {volunteers.map((name, i) => (
              <span key={i} className="badge bg-white text-secondary border border-secondary border-opacity-15 px-3 py-2 fs-7 fw-normal shadow-2xs">
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

