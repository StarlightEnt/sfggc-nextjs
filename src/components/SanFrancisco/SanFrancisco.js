import Link from "next/link";
import Image from "next/image";
import sunshine from '../../images/san-francisco/sunshine.jpg';
import cableCarPowell from '../../images/san-francisco/cable-car-powell-840.jpg';
import ramen from '../../images/san-francisco/ramen.jpg';

import styles from './SanFrancisco.module.scss';
import React from "react";

const SanFrancisco = ({full = true}) => {
  // full determines whether we show a summary or the whole shebang
  // ... the whole shebang is intended to be on its own page, while
  // the summary is intended for the SF section of the main page

  return (
    <section className={`${styles.SanFrancisco} my-5`} id={'section-san-francisco'}>
      <h3 className={`section-heading mb-0`}>
        San Francisco, California
      </h3>

      <div className="glass-card p-4 p-md-5 rounded-top-0 border-top-0">
        <div className={styles.Banner}>
          <div className={`${styles.CityDaytimeImage} h-100 w-100`} />
          <div className={styles.BannerCredit}>
            Image by{' '}
            <a href={'https://www.pexels.com/photo/city-skyline-during-golden-hour-3584437/'}
               target={'_blank'} rel="noreferrer">
              Kehn Hermano
            </a>
          </div>
        </div>

        <p className={`${styles.Intro} mb-4 text-center`}>
          The San Francisco Bay Area has a long, rich history, from the native Ohlone inhabitants through claims by
          Spain and Mexico, to the Gold Rush leading California to statehood in 1850. The area has held key strategic
          and commercial value ever since, and its diverse tapestry of people, culture, and food makes it a must-visit
          for anyone traveling the western US.
        </p>

        {!full && (
          <div className="text-center">
            <Link href={'/san-francisco'} className="btn btn-glow-orange d-inline-flex align-items-center gap-2">
              More <i className="bi bi-arrow-right" aria-hidden={true}></i>
            </Link>
          </div>
        )}

        {full && (
          <div className="row g-4 justify-content-center mt-2">
            <div className="col-12 col-md-6 col-lg-4">
              <div className={`${styles.Card} h-100`}>
                <div className={styles.CardImage}>
                  <Image src={sunshine}
                         alt={'The sun shines over the Golden Gate Bridge and the city of San Francisco'}
                         fill
                         sizes="(max-width: 768px) 100vw, 350px"
                         style={{ objectFit: 'cover' }}
                  />
                </div>
                <div className={styles.Credit}>
                  Image by{' '}
                  <a href={'https://www.stebleton.net/'}
                     target={'_blank'} rel="noreferrer">
                    Scott Stebleton
                  </a>
                </div>
                <h4 className={styles.CardTitle}>
                  <i className="bi bi-sun-fill"></i> Weather
                </h4>
                <div className={styles.CardBody}>
                <p>
                  <a href="https://www.wunderground.com/weather/us/ca/san-francisco/KCASANFR2046">
                    Current Conditions
                  </a>
                </p>
                <p>
                  The San Francisco Bay Area is notorious for surprising visitors who expect the weather to be sunny and
                  warm, like in so many media depictions of California. But don&apos;t be fooled! Most of the year, San
                  Francisco and the peninsula are wrapped in cool fog, with sunshine more the exception than the rule.
                </p>
                <p>
                  You&apos;ll be visiting in June, so it&apos;s a safe bet that you&apos;ll want to pack for cool-mild temperatures
                  and breezy conditions "June Gloom". Fog is common, especially in the hills above Daly City where our bowling center is! High
                  temperatures are around{' '}
                  <span className={styles.HighTemp}>60/70°F (15.5/21°C)</span>
                  {' '}with lows around{' '}
                  <span className={styles.LowTemp}>mid-50s°F (12°C)</span>
                  {'.'}
                </p>
                {/*<p>
                  February is in the back half of our rainy season, so we recommend bringing an umbrella or
                  rain-resistant jacket. Sure, we&apos;re usually in a drought, but that doesn&apos;t mean it never rains!
                </p>*/}
                </div>
              </div>
            </div>

            <div className="col-12 col-md-6 col-lg-4">
              <div className={`${styles.Card} h-100`}>
                <div className={styles.CardImage}>
                  <Image src={cableCarPowell}
                         alt={'The cable car turnaround point at Powell and Market Streets'}
                         fill
                         sizes="(max-width: 768px) 100vw, 350px"
                         style={{ objectFit: 'cover' }}
                  />
                </div>
                <div className={styles.Credit}>
                  Image by{' '}
                  <a href={'https://www.pexels.com/photo/road-beside-buildings-1119075/'}
                     target={'_blank'} rel="noreferrer">
                    Brett Sayles
                  </a>
                </div>
                <h4 className={styles.CardTitle}>
                  <i className="bi bi-compass-fill"></i> Attractions
                </h4>
                <div className={styles.CardBody}>
                <p>
                  The Bay Area has an abundance of riches when it comes to sights, sounds, and activities. To name just
                  a
                  few:
                </p>
                <ul>
                  <li>
                    <a
                      href="https://www.google.com/maps/place/Union+Square,+San+Francisco,+CA+94108/@37.7879373,-122.4096922,17z/data=!3m1!4b1!4m5!3m4!1s0x8085808ed3fd40bb:0xfe41d9b5994cb6ba!8m2!3d37.7879938!4d-122.4074374">Union
                      Square shopping</a>
                  </li>
                  <li>
                    <a href="http://www.alcatrazcruises.com/">Alcatraz</a>
                  </li>
                  <li>
                    <a
                      href="https://www.google.com/maps/place/PIER+39/@37.8086772,-122.412015,17z/data=!3m1!4b1!4m5!3m4!1s0x808580fc8bb3211d:0xbaf631600de6b39e!8m2!3d37.808673!4d-122.409821">Pier
                      39 &amp; the Fisherman&apos;s Wharf</a>
                  </li>
                  <li>
                    <a href="https://www.sfmta.com/getting-around/transit/how-ride/how-to-cable-cars">Cable Cars</a>
                  </li>
                  <li>
                    <a href="http://www.ferrybuildingmarketplace.com/">Ferry Building</a>
                  </li>
                  <li>
                    <a
                      href="https://www.google.com/maps/place/Lombard+Street/@37.8021432,-122.420934,17z/data=!3m1!4b1!4m5!3m4!1s0x808580e66bb70f81:0x10d3ce0ac1ec1299!8m2!3d37.802139!4d-122.41874">Lombard
                      Street</a>
                  </li>
                  <li>
                    <a href="http://goldengatebridge.org/">The Golden Gate Bridge</a>
                  </li>
                  <li>
                    <a href="https://www.nps.gov/muwo/index.htm">Muir Woods</a>
                  </li>
                  <li>
                    <a href="http://thefillmore.com/">The Fillmore</a>
                  </li>
                  <li>
                    <a href="http://www.berkeley.edu/">University of California at Berkeley</a>
                  </li>
                </ul>
                <p>
                  There&apos;s way more than we can list here, but{' '}
                  <a href="https://www.sftravel.com/" target="_blank" rel="noreferrer">SF.travel</a>
                  {' '}is a good place to start.
                </p>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-6 col-lg-4">
              <div className={`${styles.Card} h-100`}>
                <div className={styles.CardImage}>
                  <Image src={ramen}
                         alt={'A bowl of ramen with salad on the side'}
                         fill
                         sizes="(max-width: 768px) 100vw, 350px"
                         style={{ objectFit: 'cover' }}
                  />
                </div>
                <div className={styles.Credit}>
                  Image by{' '}
                  <a href={'https://www.pexels.com/photo/top-view-photo-of-ramen-soup-2591594/'}
                     target={'_blank'} rel="noreferrer">
                    Jan Nguyen
                  </a>
                </div>
                <h4 className={styles.CardTitle}>
                  <i className="bi bi-egg-fried"></i> Restaurants
                </h4>
                <div className={styles.CardBody}>
                <p>
                  With a population whose roots span the entire globe, the San Francisco Bay Area is home to an
                  incredibly
                  diverse array of cuisines. To give you just a taste...
                </p>
                <ul>
                  <li>
                    <a href="https://www.starbellysf.com/">Starbelly</a>
                  </li>
                  <li>
                    <a href="http://www.espetus.com/">Espetus Brazilian Steakhouse</a>
                  </li>
                  <li>
                    <a href="http://www.oshathai.com/">Osha Thai</a>
                  </li>
                  <li>
                    <a href="http://escapefromnewyorkpizza.com/">Escape From New York Pizza</a>
                  </li>
                  <li>
                    <a href="http://www.theplantcafe.com/">The Plant Café Organic</a>
                  </li>
                  <li>
                    <a href="https://www.keevaindiankitchensanfrancisco.com/">Keeva Indian Kitchen</a>
                  </li>
                </ul>
                <p>
                  <a href="http://sf.eater.com/">
                    SF Eater
                  </a>
                  {' '}has the low-down on all the great grub San Francisco has to offer. What&apos;s more, the Bay Area is a
                  haven
                  for vegetarians and vegans.{' '}
                  <a href="https://www.happycow.net/north_america/usa/california/san_francisco/" target="_blank" rel="noreferrer">So many
                    to choose from!</a>
                </p>

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
