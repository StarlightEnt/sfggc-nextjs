import Image from "next/image";

import styles from './ScrMstWinners.module.scss';

import divisionAImage from '../../images/scrmst-winners/SMA_TJ_Pettit.jpg';
import divisionBImage from '../../images/scrmst-winners/SMB_Gary_McNamara.jpg';
import divisionCImage from '../../images/scrmst-winners/SMC_Kells_Parker.jpg';
import divisionDImage from '../../images/scrmst-winners/SMD_Carlos_Castellanos.jpg';

const winners = [
  { image: divisionAImage, name: 'TJ Pettit', division: 'A' },
  { image: divisionBImage, name: 'Gary McNamara', division: 'B' },
  { image: divisionCImage, name: 'Kells Parker', division: 'C' },
  { image: divisionDImage, name: 'Carlos Castellanos', division: 'D' },
];

const ScrMstWinners = () => {
  return (
    <section className={`${styles.ScrMstWinners} my-5`} id={'contact'}>
      <h3 className={`section-heading`}>
        Scratch Masters Winners
      </h3>

      <div className="section-panel">
        <p className={`${styles.Intro} text-center mb-4`}>
          Gallery of Winners 2026
        </p>

        <div className={`row g-4 justify-content-center`}>
          {winners.map(({ image, name, division }) => (
            <div className={`col-6 col-sm-4 col-lg-3`} key={division}>
              <div className={`${styles.Card} h-100`}>
                <Image src={image}
                       alt={name}
                       className={`img-fluid ${styles.Image}`}
                />
                <div className={styles.Body}>
                  <p className={styles.Name}>{name}</p>
                  <p className={styles.Role}>Division {division} Winner</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default ScrMstWinners;
