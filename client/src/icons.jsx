import React from 'react';

const PATHS = {
  sparkles: (
    <>
      <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
      <path d="M19 3v4M21 5h-4M5 17v4M7 19H3" />
    </>
  ),
  home: (
    <>
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M9 20v-6h6v6" />
    </>
  ),
  tree: (
    <>
      <path d="M12 3l-5 6h3l-4 6h4l-3 5h10l-3-5h4l-4-6h3l-5-6z" />
      <path d="M12 20v2" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="17" rx="2.5" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  gallery: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </>
  ),
  rules: (
    <>
      <path d="M8 3h9a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <path d="M10 8h5M10 12h5M10 16h3" />
    </>
  ),
  support: (
    <>
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
      <rect x="2.5" y="12" width="3.5" height="6" rx="1.5" />
      <rect x="18" y="12" width="3.5" height="6" rx="1.5" />
      <path d="M20 18v1a2 2 0 0 1-2 2h-4" />
    </>
  ),
  trophy: (
    <>
      <path d="M6 4h12v5a6 6 0 0 1-12 0V4z" />
      <path d="M6 6H4a2 2 0 0 0-2 2v1a3 3 0 0 0 3 3h1.5" />
      <path d="M18 6h2a2 2 0 0 1 2 2v1a3 3 0 0 1-3 3h-1.5" />
      <path d="M12 15v4M8 21h8" />
    </>
  ),
  gift: (
    <>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M5 12v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8" />
      <path d="M12 8v13" />
      <path d="M12 8H8.5a2.5 2.5 0 1 1 0-5C11 3 12 8 12 8z" />
      <path d="M12 8h3.5a2.5 2.5 0 1 0 0-5C13 3 12 8 12 8z" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c1.5-3.8 4.8-5.5 8-5.5s6.5 1.7 8 5.5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  check: <path d="M5 13l4 4L19 7" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  x: <path d="M18 6L6 18M6 6l12 12" />,
  camera: (
    <>
      <path d="M4 7h3l2-2h6l2 2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15V4M7 9l5-5 5 5" />
      <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-14.5-4.5L3 9" />
      <path d="M3 4v5h5" />
      <path d="M4 13a8 8 0 0 0 14.5 4.5L21 15" />
      <path d="M21 20v-5h-5" />
    </>
  ),
  star: (
    <path d="M12 3l2.7 5.5 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3z" />
  ),
  snowflake: (
    <>
      <path d="M12 2v20M2 12h20M4.9 4.9l14.2 14.2M19.1 4.9L4.9 19.1" />
    </>
  ),
  medal: (
    <>
      <circle cx="12" cy="15" r="5" />
      <path d="M8.5 3h7l-2 7h-3l-2-7z" />
    </>
  ),
  discord: (
    <path
      fill="currentColor"
      stroke="none"
      d="M19.5 6.4A15.4 15.4 0 0 0 15.7 5a10.7 10.7 0 0 0-.5 1 14.2 14.2 0 0 0-6.4 0 10.7 10.7 0 0 0-.5-1 15.4 15.4 0 0 0-3.8 1.4C2.1 10 1.5 13.5 1.8 17a15.6 15.6 0 0 0 4.7 2.4c.4-.5.7-1.1 1-1.7-.6-.2-1.1-.5-1.6-.8.1-.1.3-.2.4-.3 3.1 1.4 6.5 1.4 9.6 0 .1.1.3.2.4.3-.5.3-1 .6-1.6.8.3.6.6 1.2 1 1.7a15.6 15.6 0 0 0 4.7-2.4c.4-4-.6-7.5-2.9-10.6zM8.7 14.8c-.9 0-1.7-.8-1.7-1.9s.7-1.9 1.7-1.9 1.7.8 1.7 1.9-.8 1.9-1.7 1.9zm6.6 0c-.9 0-1.7-.8-1.7-1.9s.7-1.9 1.7-1.9 1.7.8 1.7 1.9-.8 1.9-1.7 1.9z"
    />
  ),
};

export function Icon({ name, size = 18, className = '', style }) {
  const path = PATHS[name];
  if (!path) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`ico ${className}`.trim()}
      style={style}
      aria-hidden="true"
    >
      {path}
    </svg>
  );
}