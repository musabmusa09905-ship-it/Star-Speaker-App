const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "2",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
  focusable: "false"
};

export function HomeIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h5v-6h4v6h5V10" />
    </svg>
  );
}

export function TargetIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3" />
      <path d="M22 12h-3" />
      <path d="M12 22v-3" />
      <path d="M2 12h3" />
    </svg>
  );
}

export function MicIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <path d="M12 19v3" />
      <path d="M8 22h8" />
    </svg>
  );
}

export function FeedbackIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.6 8.6 0 0 1-7.7 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.6a8.4 8.4 0 0 1-.9-3.8 8.6 8.6 0 0 1 4.7-7.7A8.4 8.4 0 0 1 12.5 3H13a8.5 8.5 0 0 1 8 8.5Z" />
      <path d="m9 11 2 2 4-4" />
    </svg>
  );
}

export function BookIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      <path d="M8 6h8" />
      <path d="M8 10h6" />
    </svg>
  );
}

export function ProgressIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 16v-4" />
      <path d="M12 16V8" />
      <path d="M16 16v-7" />
      <path d="m17 5 3 3-3 3" />
    </svg>
  );
}

export function ProfileIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </svg>
  );
}

export function BellIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M10 20a2 2 0 0 0 4 0" />
      <path d="M18 16v-5a6 6 0 0 0-12 0v5l-2 2h16Z" />
    </svg>
  );
}

export function FlameIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M12 22c4.1 0 7-2.8 7-6.8 0-2.6-1.4-4.8-3.3-6.5.1 2.5-1.4 3.7-2.9 4.4.4-3.6-1.5-6.4-4.3-8.6.2 3.6-2.1 5.4-3.2 7.6A7 7 0 0 0 5 18.7C6.3 20.8 8.8 22 12 22Z" />
      <path d="M12 18.5c1.5 0 2.6-1 2.6-2.4 0-1-.5-1.8-1.2-2.4 0 1-.6 1.5-1.2 1.8.1-1.5-.6-2.5-1.6-3.4.1 1.4-.8 2.1-1.2 3a2.8 2.8 0 0 0 2.6 3.4Z" />
    </svg>
  );
}

export function ClockIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function ArrowLeftIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

export function StarIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
    </svg>
  );
}

export function SendIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

export function LockIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function SearchIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function SlidersIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M4 7h10" />
      <path d="M18 7h2" />
      <path d="M4 17h2" />
      <path d="M10 17h10" />
      <circle cx="16" cy="7" r="2" />
      <circle cx="8" cy="17" r="2" />
    </svg>
  );
}

export function VideoIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="m16 10 5-3v10l-5-3" />
    </svg>
  );
}

export function ArticleIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M6 3h8l4 4v14H6Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
      <path d="M9 9h2" />
    </svg>
  );
}

export function ImageIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="2" />
      <path d="m21 15-4-4L7 19" />
    </svg>
  );
}

export function CalendarIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M3 11h18" />
    </svg>
  );
}

export function SettingsIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05A1.8 1.8 0 0 0 15 19.4a1.8 1.8 0 0 0-1 .55V20a2 2 0 1 1-4 0v-.07a1.8 1.8 0 0 0-1-.55 1.8 1.8 0 0 0-1.98.36l-.05.05a2 2 0 1 1-2.83-2.83l.05-.05A1.8 1.8 0 0 0 4.6 15a1.8 1.8 0 0 0-.55-1H4a2 2 0 1 1 0-4h.07a1.8 1.8 0 0 0 .55-1 1.8 1.8 0 0 0-.36-1.98l-.05-.05a2 2 0 1 1 2.83-2.83l.05.05A1.8 1.8 0 0 0 9 4.6a1.8 1.8 0 0 0 1-.55V4a2 2 0 1 1 4 0v.07a1.8 1.8 0 0 0 1 .55 1.8 1.8 0 0 0 1.98-.36l.05-.05a2 2 0 1 1 2.83 2.83l-.05.05A1.8 1.8 0 0 0 19.4 9c.2.35.38.69.55 1H20a2 2 0 1 1 0 4h-.07a1.8 1.8 0 0 0-.53 1Z" />
    </svg>
  );
}

export function HelpCircleIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.8 9a2.3 2.3 0 1 1 3.7 1.8c-.9.7-1.5 1.1-1.5 2.2" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function LogOutIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}

export function ChevronRightIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function LevelIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M4 20V10" />
      <path d="M10 20V6" />
      <path d="M16 20v-8" />
      <path d="M22 20H2" />
    </svg>
  );
}

export function FlagIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M5 22V4" />
      <path d="M5 4h11l-1 4 1 4H5" />
    </svg>
  );
}

export function ArrowRightIcon(props) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

export function IconByName({ name, ...props }) {
  const icons = {
    home: HomeIcon,
    target: TargetIcon,
    mic: MicIcon,
    feedback: FeedbackIcon,
    book: BookIcon,
    video: VideoIcon,
    article: ArticleIcon,
    image: ImageIcon,
    calendar: CalendarIcon,
    bell: BellIcon,
    settings: SettingsIcon,
    clock: ClockIcon,
    progress: ProgressIcon,
    profile: ProfileIcon,
    star: StarIcon,
    messages: FeedbackIcon,
    send: SendIcon
  };
  const Icon = icons[name] || HomeIcon;
  return <Icon {...props} />;
}
