import styles from './oilpattern.module.scss';
// import oilPatImage from '../../images/Lithium.jpg';

const OilPattern = () => {
  return (
  <section className={`${styles.oilpattern} my-5`} id={'section-oilpattern'}>
    <h3 className={`section-heading mb-0`}>
      2027 Tournament Oil Pattern - TBD
    </h3>
    <div className="glass-card p-4 p-md-5 rounded-top-0 border-top-0">
      <div className={`row d-flex justify-content-center flex-wrap`}>
 {/* <div className={`col-6 col-md-5 col-lg-4`}>
           <Image src={oilPatImage}
                  alt={'2026 Oil Pattern'}
                  className={`img-fluid oilPattern-image`}/>
         </div> */}
        <p className={`${styles.Pattern} col-12 text-center mb-0`}>
          <span>
            2027&nbsp;
          </span>
            <span className={'d-md-none pe-2'}>
            SF Golden Gate Classic
          </span>
            <span className={'d-none d-md-inline pe-2'}>
            TBD
          </span>
        </p>
      </div>
    </div>
  </section>
  )
}
export default OilPattern;
