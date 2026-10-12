import Image from "next/image";
import logo from '../../images/sfggc-logo.jpg';
import styles from './footer.module.scss';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className="d-flex flex-column align-items-center justify-content-center gap-2">
        <div className={styles.logo}>
          <Image src={logo}
                 alt={'Tournament logo'}
                 width={48}
                 height={48}
                 className={`img-fluid object-fit-cover`} />
        </div>

        <p className={styles.line}>
          <span>
            &copy; 2024&nbsp;
          </span>
          <span className={'d-md-none pe-2'}>
            SF Golden Gate Classic
          </span>
          <span className={'d-none d-md-inline pe-2'}>
            San Francisco Golden Gate Classic
          </span>
        </p>
      </div>
    </footer>
  )
}


export default Footer;
