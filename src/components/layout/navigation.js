import Link from "next/link";
import ColorModeToggler from "../ColorModeToggler/ColorModeToggler";
import {useRouter} from "next/router";

const Navigation = () => {
  const router = useRouter();

  const linkClicked = (event, disabled) => {
    event.preventDefault();
    if (disabled) return;
    router.push(event.currentTarget.href);
  }

  const navLink = ({path, text, title = '', disabled = false, isButton = false}) => {
    const isActive = router.pathname === path || (path !== '/' && router.pathname.startsWith(path));

    return (
      <li className={`nav-item my-1 my-lg-0 mx-lg-1`}
          title={title}>
        <Link className={`nav-link px-3 py-2 rounded-pill transition-all ${
                isButton 
                  ? 'btn btn-sm btn-glow-orange text-white fw-bold shadow-sm' 
                  : isActive 
                    ? 'active fw-bold text-primary bg-primary bg-opacity-10 border border-primary border-opacity-25' 
                    : disabled ? 'disabled text-muted opacity-50' : 'text-dark hover-text-primary'
              }`}
              href={path}
              onClick={(event) => linkClicked(event, disabled)}
              aria-disabled={disabled || undefined}
              tabIndex={disabled ? -1 : undefined}
              data-bs-toggle={'collapse'}
              data-bs-target={'.navbar-collapse.show'}
        >
          {text}
        </Link>
      </li>
    );
  };

  return (
      <nav className={`navbar navbar-expand-lg my-3 px-3 py-2 rounded-4 glass-card shadow-sm`}>
        <div className={`container-fluid px-0`}>
          <Link href="/" className="navbar-brand d-flex align-items-center me-auto text-decoration-none">
            <span className="fw-extrabold text-dark fs-5 tracking-tight me-2">
              SFGGC <span className="text-primary fw-bold">2026</span>
            </span>
            <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 rounded-pill fs-8 fw-semibold px-2 py-0.5">
              IGBO Pride
            </span>
          </Link>

          <button
            type={'button'}
            id={'navbarToggler'}
            className={'navbar-toggler border-0 text-dark shadow-none me-2'}
            data-bs-toggle={'collapse'}
            data-bs-target={'#navbarContent'}
            aria-controls={`navbarContent`}
            aria-expanded={false}
            aria-label={'Toggle navigation'}>
            <i className={`bi bi-list menu-icon text-dark fs-3`}></i>
          </button>

          <div className={`collapse navbar-collapse justify-content-end`}
               id={'navbarContent'}
               tabIndex={'-1'}>
              <ul className={`navbar-nav align-items-lg-center mb-2 mb-lg-0 me-lg-3`}>
                {navLink({
                  path: '/',
                  text: 'Home',
                })}

                {navLink({
                  path: 'https://go.signmeup.io/?eventid=51',
                  text: 'Register',
                  disabled: true,
                  title: 'Contact Directors for Registration Info!',
                })}

                {navLink({
                  path: '/rules',
                  text: 'Rules',
                  disabled: false,
                  title: '',
                })}

                {navLink({
                  path: '/san-francisco',
                  text: 'San Francisco',
                })}

                {navLink({
                  path: '/committee',
                  text: 'Committee',
                })}

                {navLink({
                  path: '/results',
                  text: 'Results',
                  disabled: false,
                  title: '2025 results are here',
                })}

                {navLink({
                  path: '/portal/',
                  text: 'Portal Login',
                  isButton: true,
                })}
              </ul>

              <div className="d-flex align-items-center">
                <ColorModeToggler className={'ms-auto d-inline-block'} />
              </div>
          </div>

        </div>
      </nav>
  )
}

export default Navigation;

