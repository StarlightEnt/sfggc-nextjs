import Link from "next/link";
import Image from "next/image";
import sunshine from '../../images/san-francisco/sunshine.jpg';
import cableCarPowell from '../../images/san-francisco/cable-car-powell-840.jpg';
import ramen from '../../images/san-francisco/ramen.jpg';

import styles from './SanFrancisco.module.scss';
import React from "react";

const SanFrancisco = ({full = true}) => {
  return (
    <section className={`${styles.SanFrancisco} my-5`} id={'section-san-francisco'}>
      <h3 className={`section-heading mb-0`}>
        San Francisco, California
      </h3>

      <div className="glass-card p-4 p-md-5 rounded-top-0 border-top-0">
        <div className="position-relative rounded-4 overflow-hidden mb-4 shadow-lg" style={{ height: '300px' }}>
          <div className={`${styles.CityDaytimeImage} h-100 w-100`} />
          <div className="position-absolute bottom-0 end-0 bg-dark bg-opacity-75 text-white-50 fs-7 px-3 py-1 m-2 rounded-pill">
            Image by <a href={'https://www.pexels.com/photo/city-skyline-during-golden-hour-3584437/'} target={'_blank'} rel="noreferrer" className="text-white">Kehn Hermano</a>
          </div>
        </div>

        <p className="fs-5 text-muted leading-relaxed mb-4 max-w-4xl mx-auto text-center">
          The San Francisco Bay Area has a long, rich history. Its diverse tapestry of people, culture, breathtaking scenery, and world-class food makes it a premier destination for travelers.
        </p>

        {!full && (
          <div className="text-center">
            <Link href={'/san-francisco'} className="btn btn-glow-orange d-inline-flex align-items-center gap-2">
              Explore San Francisco Guide <i className="bi bi-arrow-right"></i>
            </Link>
          </div>
        )}

        {full && (
          <div className="row g-4 justify-content-center mt-2">
            <div className="col-12 col-md-6 col-lg-4">
              <div className="glass-card h-100 p-4 border border-secondary border-opacity-10 d-flex flex-column">
                <div className="position-relative rounded-3 overflow-hidden mb-3" style={{ height: '180px' }}>
                  <Image src={sunshine}
                         alt={'The sun shines over the Golden Gate Bridge and the city of San Francisco'}
                         fill
                         sizes="(max-width: 768px) 100vw, 350px"
                         style={{ objectFit: 'cover' }}
                         className="rounded-3"
                  />
                </div>
                <h4 className="fs-4 fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                  <i className="bi bi-sun-fill text-warning"></i> Weather
                </h4>
                <p className="text-secondary fs-6 mb-3">
                  San Francisco is known for its refreshing cool fog and coastal breeze. Highs average around <strong className="text-dark">60-70°F (15-21°C)</strong> and lows around <strong className="text-dark">50s°F (12°C)</strong>.
                </p>
                <div className="mt-auto pt-2">
                  <a href="https://www.wunderground.com/weather/us/ca/san-francisco/KCASANFR2046" target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary rounded-pill px-3 py-2 w-100">
                    <i className="bi bi-cloud-sun me-1"></i> Current SF Forecast
                  </a>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-6 col-lg-4">
              <div className="glass-card h-100 p-4 border border-secondary border-opacity-10 d-flex flex-column">
                <div className="position-relative rounded-3 overflow-hidden mb-3" style={{ height: '180px' }}>
                  <Image src={cableCarPowell}
                         alt={'The cable car turnaround point at Powell and Market Streets'}
                         fill
                         sizes="(max-width: 768px) 100vw, 350px"
                         style={{ objectFit: 'cover' }}
                         className="rounded-3"
                  />
                </div>
                <h4 className="fs-4 fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                  <i className="bi bi-compass-fill text-primary"></i> Top Attractions
                </h4>
                <ul className="text-secondary fs-6 ps-3 mb-3">
                  <li>Golden Gate Bridge &amp; Park</li>
                  <li>Historic Cable Cars &amp; Union Square</li>
                  <li>Alcatraz Island &amp; Pier 39</li>
                  <li>Ferry Building Marketplace</li>
                  <li>Muir Woods National Monument</li>
                </ul>
                <div className="mt-auto pt-2">
                  <a href="https://www.sftravel.com/" target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary rounded-pill px-3 py-2 w-100">
                    <i className="bi bi-globe me-1"></i> Visit SF Travel Guide
                  </a>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-6 col-lg-4">
              <div className="glass-card h-100 p-4 border border-secondary border-opacity-10 d-flex flex-column">
                <div className="position-relative rounded-3 overflow-hidden mb-3" style={{ height: '180px' }}>
                  <Image src={ramen}
                         alt={'A bowl of ramen with salad on the side'}
                         fill
                         sizes="(max-width: 768px) 100vw, 350px"
                         style={{ objectFit: 'cover' }}
                         className="rounded-3"
                  />
                </div>
                <h4 className="fs-4 fw-bold text-dark mb-2 d-flex align-items-center gap-2">
                  <i className="bi bi-egg-fried text-info"></i> World-Class Dining
                </h4>
                <p className="text-secondary fs-6 mb-3">
                  Home to iconic eateries, Mission burritos, fresh seafood, dim sum, and a thriving vegan &amp; plant-based culinary scene.
                </p>
                <div className="mt-auto pt-2">
                  <a href="https://sf.eater.com/" target="_blank" rel="noreferrer" className="btn btn-sm btn-outline-secondary rounded-pill px-3 py-2 w-100">
                    <i className="bi bi-journals me-1"></i> Explore SF Eater
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </section>
  );
}

export default SanFrancisco;
