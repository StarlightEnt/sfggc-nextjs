import Link from "next/link";
import {useRouter} from "next/router";
import styles from './navigation.module.scss';

const Navigation = () => {
  const router = useRouter();

  const linkClicked = (event, disabled) => {
    event.preventDefault();
    if (disabled) return;
    router.push(event.currentTarget.href);
  }

  const navLink = ({path, text, title = '', disabled = false, isButton = false}) => {
    const isActive = router.pathname === path || (path !== '/' && router.pathname.startsWith(path));
    const stateClass = disabled ? styles.disabled : isActive ? styles.active : '';
    const linkClass = isButton
      ? `btn btn-glow-orange ${styles.cta}`
      : `${styles.link} ${stateClass}`;

    return (
      <li className={`nav-item`}
          title={title}>
        <Link className={`nav-link ${linkClass}`}
              href={path}
              onClick={(event) => linkClicked(event, disabled)}
              aria-current={isActive && !isButton ? 'page' : undefined}
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
      <nav className={`navbar navbar-expand-lg ${styles.nav}`}>
        <div className={`${styles.inner} d-flex flex-wrap align-items-center`}>
          <Link href="/" className={styles.brand}>
            <span className={`${styles.wordmark} display`}>
              SFGGC <span className={styles.year}>2026</span>
            </span>
            <span className={styles.tagline}>Golden Gate Classic &middot; IGBO Pride</span>
          </Link>

          <button
            type={'button'}
            id={'navbarToggler'}
            className={`navbar-toggler ${styles.toggler}`}
            data-bs-toggle={'collapse'}
            data-bs-target={'#navbarContent'}
            aria-controls={`navbarContent`}
            aria-expanded={false}
            aria-label={'Toggle navigation'}>
            <i className={`bi bi-list menu-icon fs-3`}></i>
          </button>

          <div className={`collapse navbar-collapse justify-content-end`}
               id={'navbarContent'}
               tabIndex={'-1'}>
              <ul className={`navbar-nav ${styles.links}`}>
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
          </div>

        </div>
      </nav>
  )
}

export default Navigation;
