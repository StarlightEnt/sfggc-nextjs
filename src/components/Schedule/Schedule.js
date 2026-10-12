import styles from './Schedule.module.scss';

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
          time: '4:30 PM – 6:45 PM',
          icon: 'bi-clipboard-check-fill',
          badge: 'Registration',
        },
        {
          name: 'Team Event',
          detail: 'Classic Bowling Center',
          more: '',
          time: '7:00 PM – 10:00 PM',
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
          time: '1:30 PM – 2:15 PM',
          icon: 'bi-clipboard-check-fill',
          badge: 'Registration',
        },
        {
          name: 'Doubles & Singles Events',
          detail: '30-minute break between events',
          more: '',
          time: '2:30 PM – 8:30 PM',
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
          detail: 'Classic Bowling Center Main Lanes',
          more: '',
          time: '10:00 AM – 1:00 PM',
          icon: 'bi-award-fill',
          badge: 'Finals',
        },
        {
          name: 'Cocktail Reception & Awards',
          detail: '300 Sports Bar & Lounge (Inside Classic Bowling Center)',
          more: 'Small Bites served. Starts approx 30–45 min after Scratch Masters.',
          time: '1:30 PM – 4:00 PM',
          icon: 'bi-cup-hot-fill',
          badge: 'Social & Awards',
        },
      ]
    },
  ];

  return (
    <section className={`${styles.Schedule} my-5`} id={'section-schedule'}>
      <h3 className={`section-heading mb-0`}>
        Schedule of Events
      </h3>

      <div className="glass-card p-4 p-md-5 rounded-top-0 border-top-0">
        <p className="text-center text-muted fs-6 mb-4">
          <i className="bi bi-info-circle me-2 text-primary"></i>
          Proposed Preliminary Schedule — subject to minor adjustments
        </p>

        <div className="row g-4 justify-content-center">
          {days.map((day, i) => {
            const dayColors = [
              { border: '#e11d48', badgeBg: 'rgba(225, 29, 72, 0.12)', badgeText: '#e11d48' }, // Day 1: Pride Rose
              { border: '#f97316', badgeBg: 'rgba(249, 115, 22, 0.12)', badgeText: '#ea580c' }, // Day 2: Pride Orange
              { border: '#2563eb', badgeBg: 'rgba(37, 99, 235, 0.12)', badgeText: '#2563eb' }   // Day 3: Pride Blue
            ];
            const currentTheme = dayColors[i % dayColors.length];

            return (
              <div key={`day_${i}`} className="col-12 col-lg-4">
                <div 
                  className={`${styles.DayCard} glass-card p-4 h-100 border border-secondary border-opacity-10 d-flex flex-column rounded-3`}
                  style={{ borderTop: `4px solid ${currentTheme.border}` }}
                >
                  
                  {/* Day Header */}
                  <div className="d-flex align-items-center justify-content-between mb-4 pb-3 border-bottom border-secondary border-opacity-10">
                    <div>
                      <span 
                        className="badge fw-bold px-2.5 py-1 mb-1 rounded-1 text-uppercase fs-8 letter-spacing-1"
                        style={{ backgroundColor: currentTheme.badgeBg, color: currentTheme.badgeText }}
                      >
                        {day.dayNumber}
                      </span>
                      <h4 className="fs-5 fw-bold text-dark mb-0 mt-1">
                        {day.date}
                      </h4>
                    </div>
                    <div 
                      className="rounded-circle p-2.5 d-flex align-items-center justify-content-center fs-4 ms-2"
                      style={{ backgroundColor: currentTheme.badgeBg, color: currentTheme.border }}
                    >
                      <i className="bi bi-calendar-event"></i>
                    </div>
                  </div>

                  {/* Timeline Events */}
                  <div className="d-flex flex-column gap-3 flex-grow-1">
                    {day.events.map((e, j) => (
                      <div key={`event_${j}`} className={`${styles.EventCard} p-3.5 rounded-3 border transition-all`}>
                        
                        {/* Time Pill & Event Badge */}
                        <div className="d-flex align-items-center justify-content-between gap-2 mb-2">
                          <span 
                            className={`${styles.TimePill} px-3 py-1 rounded-pill fs-7 fw-bold d-inline-flex align-items-center gap-1.5`}
                            style={{ backgroundColor: currentTheme.badgeBg, color: currentTheme.border, borderColor: currentTheme.border }}
                          >
                            <i className="bi bi-clock-fill me-1"></i>
                            {e.time}
                          </span>
                          {e.badge && (
                            <span className="badge bg-secondary bg-opacity-10 text-secondary fw-normal fs-8">
                              {e.badge}
                            </span>
                          )}
                        </div>

                        {/* Event Title with Icon */}
                        <div className="d-flex align-items-center gap-2.5 mt-2.5 mb-1.5">
                          <div 
                            className={`${styles.EventIcon} rounded-circle d-flex align-items-center justify-content-center flex-shrink-0`}
                            style={{ backgroundColor: currentTheme.badgeBg, color: currentTheme.border }}
                          >
                            <i className={`bi ${e.icon || 'bi-pin-angle-fill'} fs-6`}></i>
                          </div>
                          <h5 className="fs-6 fw-bold text-dark mb-0 lh-sm">
                            {e.name}
                          </h5>
                        </div>

                        {/* Event Detail */}
                        {e.detail && (
                          <div className="d-flex align-items-start gap-1.5 text-muted fs-7 mt-2">
                            <i className="bi bi-geo-alt-fill text-secondary flex-shrink-0 mt-0.5"></i>
                            <span>{e.detail}</span>
                          </div>
                        )}

                        {/* Event More info note */}
                        {e.more && (
                          <div className="mt-2.5 text-dark fs-7 border-start border-warning border-3 ps-2.5 bg-warning bg-opacity-10 py-1.5 rounded-end">
                            <i className="bi bi-info-circle-fill text-warning me-1"></i>
                            <span>{e.more}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  )
}

export default Schedule;


