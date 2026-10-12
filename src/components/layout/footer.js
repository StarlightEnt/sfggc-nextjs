import Image from "next/image";
import logo from '../../images/sfggc-logo.jpg';
import styles from './footer.module.scss';

const Footer = () => {
  return (
    <footer className={styles.footer}>
      <div className="d-flex flex-column align-items-center justify-content-center gap-2">
        <div className={styles.logo}>
          <Image src={logo}
                 alt={'SFGGC Tournament logo'}
                 width={48}
                 height={48}
                 className={`img-fluid object-fit-cover`} />
        </div>

        <p className={styles.line}>
          &copy; {new Date().getFullYear()} <strong>San Francisco Golden Gate Classic</strong>
        </p>
        <p className={styles.affiliation}>
          An official IGBO &amp; USBC affiliated tournament event.
        </p>
      </div>
    </footer>
  )
}


export default Footer;
