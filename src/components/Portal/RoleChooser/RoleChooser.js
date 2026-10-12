import Link from "next/link";
import styles from "./RoleChooser.module.scss";

const RoleChooser = () => {
  return (
    <section className={styles.RoleChooser}>
      <h2 className={styles.Question}>Are you a participant?</h2>
      <div className="d-flex flex-column gap-3">
        <Link className="btn btn-primary" href="/portal/participant">
          Yes, I am
        </Link>
        <Link className="btn btn-outline-secondary" href="/portal/admin">
          No, I&apos;m not
        </Link>
      </div>
    </section>
  );
};

export default RoleChooser;
