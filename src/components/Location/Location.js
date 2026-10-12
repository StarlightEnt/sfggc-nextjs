import Image from "next/image";
import Link from "next/link";
import cbcLogo from '../../images/cbc-logo.png';
import styles from './Location.module.scss';

const Location = () => {
  const diningList = [
    { name: 'Little Caesars', url: 'https://littlecaesars.com/en-us/store/8849' },
    { name: 'Mr. Fong BBQ & Noodles' },
    { name: 'New Horizons Bakery' },
    { name: 'Onyx Cafe' },
    { name: 'Pho Cafe' },
    { name: 'Pop Kitchen', url: 'https://popkitchendc.com/' },
    { name: 'Starbread' },
    { name: 'Subway', url: 'https://restaurants.subway.com/united-states/ca/daly-city/1000-king-drive?utm_source=yxt-goog&utm_medium=local&utm_term=acq&utm_content=46712&utm_campaign=evergreen-2020' },
    { name: 'Tai Yuan Seafood', url: 'http://www.taiyuanrestaurant.com/' },
    { name: 'Tea Ever' },
  ];

  return (
    <section className={`${styles.Location} my-5`} id={'section-location'}>
      <h3 className={`section-heading`}>
        Location
      </h3>

      <div className="section-panel">

        {/* Main Venue Header */}
        <div className="row align-items-center g-4 mb-4 pb-4 border-bottom border-secondary border-opacity-10">
          <div className="col-12 col-md-4 text-center">
            <Link href={'http://www.classicbowling.com/'} target={'_blank'} className="d-inline-block">
              <div className={`${styles.LogoContainer} logo-tile p-3 d-inline-flex align-items-center justify-content-center`}>
                <Image
                  src={cbcLogo}
                  alt={'Logo for Classic Bowling Center'}
                  className={`img-fluid ${styles.LogoImage}`}
                />
              </div>
            </Link>
          </div>

          <div className="col-12 col-md-8 text-center text-md-start">
            <h4 className="fs-2 fw-bold text-body mb-2">
              <a href={'http://www.classicbowling.com/'} target="_blank" rel="noreferrer" className={`${styles.VenueLink} text-decoration-none`}>
                Classic Bowling Center <i className="bi bi-box-arrow-up-right fs-6 ms-1 text-primary"></i>
              </a>
            </h4>

            <address className="fst-normal text-muted fs-6 mb-3">
              <div className="d-flex align-items-center justify-content-center justify-content-md-start gap-2 mb-1">
                <i className="bi bi-pin-map text-body-secondary fs-5"></i>
                <span className="text-body">900 King Drive, Daly City, CA 94015</span>
              </div>
            </address>

            <div className="d-flex align-items-center justify-content-center justify-content-md-start gap-3 flex-wrap">
              <a href="tel:6508780300" className="btn btn-sm btn-outline-secondary rounded-pill px-3 py-2 d-inline-flex align-items-center gap-2">
                <i className="bi bi-telephone-fill text-primary"></i> 650-878-0300
              </a>
            </div>
          </div>
        </div>

        {/* Map and Nearby Dining Options */}
        <div className="row g-4 align-items-stretch">
          <div className="col-12 col-lg-7">
            {/* On small viewports (phones) */}
            <div className={`${styles.Map} ratio ratio-21x9 d-md-none overflow-hidden`}>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m16!1m12!1m3!1d1607.0657678661782!2d-122.4699218330858!3d37.65125620394849!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!2m1!1sRestaurants!5e0!3m2!1sen!2sus!4v1689611010549!5m2!1sen!2sus"
                allowFullScreen="" loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Map to Classic Bowling Center"></iframe>
            </div>
            {/* On medium viewports (tablet in portrait) */}
            <div className={`${styles.Map} ratio ratio-4x3 d-none d-md-block d-lg-none overflow-hidden`}>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m12!1m8!1m3!1d3158.965833030376!2d-122.46923535449218!3d37.65000730003063!3m2!1i1024!2i768!4f13.1!2m1!1sRestaurants!5e0!3m2!1sen!2sus!4v1689623109059!5m2!1sen!2sus"
                allowFullScreen="" loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Map to Classic Bowling Center"></iframe>
            </div>
            {/* On large viewports (tablet in landscape, laptops & monitors) */}
            <div className={`${styles.Map} ratio ratio-16x9 d-none d-lg-block overflow-hidden`}>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m12!1m8!1m3!1d3158.965833030376!2d-122.46923535449218!3d37.65000730003063!3m2!1i1024!2i768!4f13.1!2m1!1sRestaurants!5e0!3m2!1sen!2sus!4v1689623109059!5m2!1sen!2sus"
                allowFullScreen="" loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Map to Classic Bowling Center"></iframe>
            </div>
          </div>

          <div className="col-12 col-lg-5">
            <div className="surface-card p-4 h-100 border border-secondary border-opacity-10 d-flex flex-column">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <h5 className="fs-5 fw-bold text-body mb-0 d-flex align-items-center gap-2">
                  <i className="bi bi-shop text-primary"></i>
                  Nearby Dining Options
                </h5>
              </div>
              <div className="d-flex flex-wrap gap-2 flex-grow-1 align-content-start">
                {diningList.map((item, idx) => (
                  item.url ? (
                    <a key={idx} href={item.url} target="_blank" rel="noreferrer" className={`${styles.DiningChip} ${styles.DiningLink}`}>
                      <span>{item.name}</span>
                      <i className="bi bi-arrow-up-right ms-1"></i>
                    </a>
                  ) : (
                    <span key={idx} className={styles.DiningChip}>
                      <span>{item.name}</span>
                    </span>
                  )
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}

export default Location;
