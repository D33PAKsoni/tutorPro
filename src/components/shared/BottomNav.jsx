// src/components/shared/BottomNav.jsx
import { Link, useLocation } from 'react-router-dom';

const TEACHER_ITEMS = [
  { to: '/teacher',             icon: 'dashboard',      label: 'Home'       },
  { to: '/teacher/students',    icon: 'groups',         label: 'Students'   },
  { to: '/teacher/attendance',  icon: 'checklist',      label: 'Attendance' },
  { to: '/teacher/fees',        icon: 'payments',       label: 'Fees'       },
  { to: '/teacher/assessments', icon: 'assignment',     label: 'Tests'      },
  { to: '/teacher/notices',     icon: 'campaign',       label: 'Notices'    },
];

const STUDENT_ITEMS = [
  { to: '/student',             icon: 'today',          label: 'Today'      },
  { to: '/student/attendance',  icon: 'checklist',      label: 'Attendance' },
  { to: '/student/fees',        icon: 'payments',       label: 'Fees'       },
  { to: '/student/assessments', icon: 'assignment',     label: 'Tests'      },
  { to: '/student/notices',     icon: 'campaign',       label: 'Notices'    },
];

export default function BottomNav({ role = 'teacher' }) {
  const { pathname } = useLocation();
  const items = role === 'teacher' ? TEACHER_ITEMS : STUDENT_ITEMS;

  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {items.map((item) => {
        const isActive = item.to === '/' + role
          ? pathname === item.to
          : pathname.startsWith(item.to);

        return (
          <Link
            key={item.to}
            to={item.to}
            className={`bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {isActive && <span className="bottom-nav__indicator" aria-hidden="true" />}
            <span
              className="material-symbols-outlined bottom-nav__icon"
              style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
            >
              {item.icon}
            </span>
            <span className="bottom-nav__label">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
