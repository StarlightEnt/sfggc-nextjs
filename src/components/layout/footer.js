import Image from "next/image";
import logo from '../../images/sfggc-logo.jpg';

const Footer = () => {
  return (
    <footer className="mt-5 pt-4 pb-5 text-center text-muted border-top border-secondary border-opacity-15">
      <div className="container">
        <div className="d-flex flex-column align-items-center justify-content-center gap-3">
          <div className="p-1 rounded-circle bg-white border border-secondary border-opacity-15 shadow-sm" style={{ width: '70px', height: '70px', overflow: 'hidden' }}>
            <Image src={logo}
                   alt={'SFGGC Tournament logo'}
                   width={70}
                   height={70}
                   className={`img-fluid rounded-circle object-fit-cover`} />
          </div>

          <p className="fs-6 mb-0">
            &copy; {new Date().getFullYear()} <strong className="text-dark">San Francisco Golden Gate Classic</strong>. All rights reserved.
          </p>
          <p className="fs-7 text-muted mb-0">
            An official IGBO &amp; USBC affiliated tournament event.
          </p>
        </div>
      </div>
    </footer>
  )
}


export default Footer;
