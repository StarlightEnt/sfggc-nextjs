import styles from './Schedule.module.scss';

const ACCENTS = [
  'var(--sfggc-pride-red)',
  'var(--sfggc-pride-orange)',
  'var(--sfggc-pride-blue)',
];

const Schedule = () => {

  const days = [
    {
      dayNumber: 'DAY 1',
      date: 'Friday, June 18, 2027',
      events: [
        {
          name: 'Tournament Check-in',
          detail: 'Bowling center meeting room',
          more: '',
          time: '4:30pm - 6:45pm',
          icon: 'bi-clipboard-check-fill',
          badge: 'Registration',
        },
        {
          name: 'Team Event',
          detail: 'Classic Bowling Center',
          more: '',
          time: '7pm - 10pm',
          icon: 'bi-people-fill',
          badge: 'Competition',
        },
      ]
    },
    {
      dayNumber: 'DAY 2',
      date: 'Saturday, June 19, 2027',
      events: [
        {
          name: 'Tournament Check-in',
          detail: 'Bowling center meeting room',
          more: '',
          time: '1:30pm - 2:15pm',
          icon: 'bi-clipboard-check-fill',
          badge: 'Registration',
        },
        {
          name: 'Doubles and Singles Events',
          detail: '30-minute break between events',
          // more: 'We&apos;ll provide food between events!',
          time: '2:30pm - 8:30pm',
          icon: 'bi-trophy-fill',
          badge: 'Main Event',
        },
      ]
    },
    {
      dayNumber: 'DAY 3',
      date: 'Sunday, June 20, 2027',
      events: [
        {
          name: 'Scratch Masters',
          detail: '',
          more: '',
          time: '10am - 1pm',
          icon: 'bi-award-fill',
          badge: 'Finals',
        },
        {
          name: 'Cocktail Reception, Awards Ceremony and Small Bites',
          detail: '300 Sports Bar & Lounge (Inside Classic Bowling Center)',
          more: 'Approximately 30-45 min after Scratch Masters',
          time: '1:30 / 1:45pm - 4pm',
          icon: 'bi-cup-hot-fill',
          badge: 'Social & Awards',
        },
        // {
        //   name: 'Scratch Masters',
        //   detail: '',
        //   more: '',
        //   time: '2pm - 5pm',
        // },
      ]
    },
  ];

  return (
    <section className={`${styles.Schedule} my-5`} id={'section-schedule'}>
      <h3 className={`section-heading`}>
        Schedule of Events
      </h3>

      <div className="section-panel">
        <p className={`${styles.Note} text-center mb-4`}>
          <i className="bi bi-info-circle me-2"></i>
          (Proposed Preliminary Schedule)
        </p>

        <div className="row g-4 justify-content-center">
          {days.map((day, i) => (
            <div key={`day_${i}`} className="col-12 col-lg-4">
              <div className={`${styles.DayCard} h-100 d-flex flex-column`}
                   style={{'--accent': ACCENTS[i % ACCENTS.length]}}>

                <div className={styles.DayHeader}>
                  <div>
                    <span className={styles.DayTag}>{day.dayNumber}</span>
                    <h4 className={styles.DayDate}>{day.date}</h4>
                  </div>
                  <div className={styles.DayIcon}>
                    <i className="bi bi-calendar-event"></i>
                  </div>
                </div>

                <div className="d-flex flex-column flex-grow-1">
                  {day.events.map((e, j) => (
                    <div key={`event_${j}`} className={styles.EventRow}>
                      <div className="d-flex align-items-center justify-content-between gap-2 mb-2 flex-wrap">
                        <span className={styles.TimePill}>
                          <i className="bi bi-clock-fill me-1"></i>
                          {e.time}
                        </span>
                        {e.badge && (
                          <span className={styles.Badge}>{e.badge}</span>
                        )}
                      </div>

                      <div className="d-flex align-items-center gap-2">
                        <div className={styles.EventIcon}>
                          <i className={`bi ${e.icon || 'bi-pin-angle-fill'}`}></i>
                        </div>
                        <h5 className={styles.EventName}>{e.name}</h5>
                      </div>

                      {e.detail && (
                        <div className={styles.Detail}>
                          <i className="bi bi-geo-alt-fill flex-shrink-0"></i>
                          <span>{e.detail}</span>
                        </div>
                      )}

                      {e.more && (
                        <div className={styles.More}>
                          <i className="bi bi-info-circle-fill me-1"></i>
                          <span>{e.more}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Schedule;
