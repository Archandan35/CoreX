import { memo } from 'react';

const PATHS = {
  pen: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  'help-circle': 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01',
  'plus-circle': 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 8v8M8 12h8',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3',
  shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z',
  scan: 'M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10',
  target: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  mic: 'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3zM19 10v2a7 7 0 0 1-14 0v-2M12 19v4',
  layers: 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  notes: 'M9 2h6a2 2 0 0 1 2 2v0H7v0a2 2 0 0 1 2-2zM7 4H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2M8 11h8M8 15h6',
  vault: 'M3 4h18v16H3zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 12h.01',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
  menu: 'M3 12h18M3 6h18M3 18h18',
  plus: 'M12 5v14M5 12h14',
  close: 'M18 6 6 18M6 6l12 12',
  x: 'M18 6 6 18M6 6l12 12',
  check: 'M20 6 9 17l-5-5',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  trash: 'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  eyeOff: 'M17.94 17.94A10.07 10.07 0 0 1 12 19c-7 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 5c7 0 10 7 10 7a18.5 18.5 0 0 1-2.06 3.06M14.12 14.12a3 3 0 1 1-4.24-4.24M1 1l22 22',
  doc: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  alert: 'M12 9v4M12 17h.01M10.3 3.3 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.3a2 2 0 0 0-3.4 0z',
  bolt: 'M13 2 3 14h9l-1 8 10-12h-9z',
  arrow: 'M5 12h14M12 5l7 7-7 7',
  edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z',
  save: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8',
  link: 'M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1',
  history: 'M3 3v5h5M3.05 13A9 9 0 1 0 6 5.3L3 8M12 7v5l4 2',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  badge: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2l3 2 3.5-.5L19 7l2 2.5L19 12l-.5 3.5L15 16l-3 2-3-2-3.5.5L5 12 3 9.5 5 7l-.5-3.5L8 4z',
  lock: 'M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2zM7 11V7a5 5 0 0 1 10 0v4',
  database: 'M12 8c4.42 0 8-1.34 8-3s-3.58-3-8-3-8 1.34-8 3 3.58 3 8 3zM4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z',
  copy: 'M9 9h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2zM5 15H4a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1',
  move: 'M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20',
  share: 'M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13',
  print: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  chevron: 'M9 18l6-6-6-6',
  chevronLeft: 'M15 18l-6-6 6-6',
  chevronDown: 'M6 9l6 6 6-6',
  chevronUp: 'M9 6l6 6-6 6',
  caretRight: 'M6 3l14 9-14 9V3z',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  cloud: 'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z',
  plug: 'M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0zM12 17v5',
  folderPlus: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM12 11v6M9 14h6',
  ban: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM4.93 4.93l14.14 14.14',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
  balance: 'M12 3v17M12 5l-8 4 8 4 8-4-8-4M2 17l4 2 4-2-4-2-4 2M14 17l4 2 4-2-4-2-4 2M6 9v8M18 9v8',
  scales: 'M12 3v17M5 20h14M5 7l-3 6h6L5 7zM19 7l-3 6h6l-3-7zM5 7h14',
  flag: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
  user: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z',
  scissors: 'M6 4l12 16M6 20l12-16M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 21a3 3 0 0 0 0-6 3 3 0 0 0 0 6z',
  cornerDownRight: 'M15 10l5 5-5 5M4 4v7a4 4 0 0 0 4 4h12',
  'chevrons-up-down': 'm7 15 5 5 5-5M7 9l5-5 5 5',
  tag: 'M20.59 13.41 13.42 20.6a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82zM7 7h.01',
  archive: 'M21 8v13H3V8M1 3h22v5H1zM10 12h4',
  grip: 'M9 5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM15 5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM9 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM15 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM9 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM15 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  'grip-vertical': 'M9 5a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM9 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM9 19a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  checkSquare: 'M3 3h18v18H3zM8 12l3 3 5-5',
  home: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10',
  briefcase: 'M2 7h20v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16',
  'user-plus': 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M8.5 11a4 4 0 1 0 0-8a4 4 0 1 0 0 8 M20 8v6 M17 11h6',
  'check-circle': 'M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4 12 14.01 9 11.01',
  filter: 'M22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3',
  building: 'M3 22h18M6 18V9m12 9V9M2 9l10-7 10 7M9 22V12h6v10',
  building2: 'M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6M4 9h16',
  scales2: 'M12 3v18M5 7h14M4 7l-2 6a3 3 0 0 0 6 0l-2-6M20 7l-2 6a3 3 0 0 0 6 0l-2-6M8 21h8',
  user2: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  calendar2: 'M3 4h18v17H3zM3 9h18M8 2v4M16 2v4',
  doclines: 'M3 3h18v18H3zM7 8h10M7 12h6M7 16h4',
  video: 'M23 7l-7 5 7 5V7z M3 7a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z',
  'people-two': 'M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 2.5-5 6-5s6 2 6 5M12 20c0-2.5 2-4.5 5-4.5s5 2 5 4.5',
  compass: 'M3 11l18-8-8 18-2-8-8-2z',
  'arrow-up': 'M12 19V5M5 12l7-7 7 7',
  'arrow-down': 'M12 5v14M5 12l7 7 7-7',
  paperclip: 'M15 7l-7 7a3.5 3.5 0 0 0 5 5l7-7a5 5 0 0 0-7-7l-7 7a6.5 6.5 0 0 0 9 9l7-7',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  wrench: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  'refresh-cw': 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
  loader: 'M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83',
  circle: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  migrate: 'M5 12h14M12 5l7 7-7 7M5 5l7 7-7 7',
  redo: 'M23 4v6h-6M20.49 15a9 9 0 1 1-2.12-9.36L23 10',
  undo: 'M1 4v6h6M3.51 15a9 9 0 1 0 2.13-9.36L1 10',
  maximize: 'M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3',
  heart: 'M19 14c1.5-1.5 2.5-3.5 2.5-5.5A4.5 4.5 0 0 0 17 4c-1.5 0-3 .7-4 1.8-1-1.1-2.5-1.8-4-1.8A4.5 4.5 0 0 0 4.5 8.5c0 2 1 4 2.5 5.5l5 5 5-5z',
  pin: 'M12 17v5M5 17h14l-1.4-1.4a2 2 0 0 1-.6-1.4V9a5 5 0 0 0-10 0v5.2a2 2 0 0 1-.6 1.4L5 17Z',
  bookmark: 'M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z',
  sun: 'M12 3v1M12 20v1M4.22 4.22l.7.7M18.36 18.36l.7.7M3 12h1M20 12h1M4.22 19.78l.7-.7M18.36 5.64l.7-.7M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12z',
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
  'log-out': 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9',
  // Invoice-domain icons (lucide line paths). No duplicates of entries above.
  'arrow-left': 'M19 12H5M12 19l-7-7 7-7',
  'arrow-right': 'M5 12h14M12 5l7 7-7 7',
  receipt: 'M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1zM8 7h8M8 11h8M8 15h5',
  calculator: 'M4 2h16v20H4zM8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h8',
  percent: 'M19 5 5 19M6.5 6.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 17.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  'file-plus': 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M12 12v6M9 15h6',
  sparkles: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 14l.95 2.55L22.5 17.5l-2.55.95L19 21l-.95-2.55L15.5 17.5l2.55-.95zM5 14l.95 2.55L8.5 17.5l-2.55.95L5 21l-.95-2.55L1.5 17.5l2.55-.95z',
  image: 'M3 3h18v18H3zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21',
  landmark: 'M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3',
  'pen-tool': 'M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18zM2 2l7.586 7.586M11 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  split: 'M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7M8 3H3v5M3 3l7 7M16 21h5v-5M21 21l-7-7',
  truck: 'M1 3h15v13H1zM16 8h4l3 3v5h-7zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  waypoints: 'M15 17h5V7H4v10h5M12 5v12M9 8l3-3 3 3M9 16l3 3 3-3',
  'file-check': 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 15l2 2 4-4',
  'user-check': 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM16 11l2 2 4-4',
  package: 'M12 2 2 7v10l10 5 10-5V7zM2 7l10 5 10-5M12 22V12',
  barcode: 'M3 5v14M7 5v14M11 5v14M14 5v14M18 5v14M21 5v14',
  'chevron-right': 'M9 6l6 6-6 6',
  'external-link': 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3',
  'shield-check': 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4',
  'clipboard-list': 'M9 2h6a1 1 0 0 1 1 1v1H8V3a1 1 0 0 1 1-1zM8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2M9 12h6M9 16h6M9 8h.01',
  'credit-card': 'M2 5h20v14H2zM2 10h20',
  wallet: 'M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 2 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5M17 13h.01',
  'corner-up-left': 'M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3',
  // Sales-page + sidebar icons (lucide line paths). No duplicates of entries above.
  'shopping-bag': 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0',
  play: 'M6 3l14 9-14 9V3z',
  send: 'M22 2 11 13M22 2 15 22l-4-9-9-4 20-7z',
  'sliders-horizontal': 'M4 6h16M4 12h16M4 18h16M7 4v4M17 10v4M9 16v4',
  'loader-circle': 'M12 2v6M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  'upload-cloud': 'M4 17a5 5 0 0 1 1-9.9A6 6 0 0 1 21 11.5M12 12v8M8 16l4-4 4 4',
  'list-tree': 'M11 21h8a2 2 0 0 0 2-2v-2M3 5h2a2 2 0 0 1 2 2v2a2 2 0 0 0 2 2h2M3 11h2a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h2M3 17h2',
};

const COMPLEX = {
  'toggle-left': (
    <>
      <rect key="r" x="2" y="6" width="20" height="12" rx="6" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <circle key="c" cx="10" cy="12" r="4" fill="currentColor" stroke="none" />
    </>
  ),
  'toggle-right': (
    <>
      <rect key="r" x="2" y="6" width="20" height="12" rx="6" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <circle key="c" cx="14" cy="12" r="4" fill="currentColor" stroke="none" />
    </>
  ),
  'more-horizontal': (
    <>
      <circle key="c1" cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle key="c2" cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle key="c3" cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  'more-vertical': (
    <>
      <circle key="c1" cx="12" cy="5" r="1.6" fill="currentColor" stroke="none" />
      <circle key="c2" cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle key="c3" cx="12" cy="19" r="1.6" fill="currentColor" stroke="none" />
    </>
  ),
  'file-text': (
    <>
      <path key="p1" d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <polyline key="pl1" points="14 2 14 8 20 8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line key="l1" x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <line key="l2" x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </>
  ),
  'bar-chart': (
    <>
      <line key="l1" x1="12" y1="20" x2="12" y2="10" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <line key="l2" x1="18" y1="20" x2="18" y2="4" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <line key="l3" x1="6" y1="20" x2="6" y2="16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </>
  ),
  'x-circle': (
    <>
      <circle key="c" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.9" fill="none" />
      <line key="l1" x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <line key="l2" x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </>
  ),
  'alert-circle': (
    <>
      <circle key="c" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.9" fill="none" />
      <line key="l1" x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <line key="l2" x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </>
  ),
  'documents': (
    <>
      <path key="p1" d="M16 4H18a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect key="r1" x="8" y="2" width="8" height="4" rx="1" ry="1" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <line key="l1" x1="9" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <line key="l2" x1="9" y1="16" x2="13" y2="16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </>
  ),
  'gavel': (
    <>
      <path key="p1" d="M14 10L3 21" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect key="r1" x="8" y="2" width="8" height="6" rx="1.5" transform="rotate(45 12 5)" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path key="p2" d="M18 14l3 3" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  'route': (
    <>
      <circle key="c1" cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <circle key="c2" cx="22" cy="20" r="2.5" fill="currentColor" stroke="none" />
      <path key="p" d="M9 11 C9 16 19 14 22 17.5" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <line key="l" x1="9" y1="11" x2="9" y2="17.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="2 2" />
    </>
  ),
  'hexagon3d': (
    <path key="h" d="M12.89 1.45l8 4A2 2 0 0 1 22 7.24v9.53a2 2 0 0 1-1.11 1.79l-8 4a2 2 0 0 1-1.79 0l-8-4a2 2 0 0 1-1.1-1.8V7.24a2 2 0 0 1 1.11-1.79l8-4a2 2 0 0 1 1.78 0z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  ),
  'globe': (
    <>
      <circle key="c1" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <line key="l1" x1="3.27" y1="6.96" x2="20.73" y2="6.96" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line key="l2" x1="3.27" y1="17.04" x2="20.73" y2="17.04" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line key="l3" x1="12" y1="3" x2="12" y2="21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path key="p" d="M12 3a14 14 0 0 1 4 9 14 14 0 0 1-4 9 14 14 0 0 1-4-9 14 14 0 0 1 4-9z" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </>
  ),
  'shield2': (
    <>
      <path key="p1" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <polyline key="pl1" points="9 12 11 14 15 10" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  'quote': (
    <path key="q" d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179z" fill="currentColor" stroke="none" />
  ),
  'spinner': (
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" strokeDasharray="31.4 31.4" strokeDashoffset="0">
      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
    </circle>
  ),
  'invoice-empty': (
    <g transform="scale(0.375, 0.429) translate(-4, -14)">
      <rect x="4" y="14" width="56" height="38" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M4 16L30 36L60 16" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="50" cy="10" r="9" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
      <path d="M46 10h8M50 6v8" stroke="#fff" strokeWidth="1.6" />
    </g>
  ),
};

export default memo(function Icon({ name, size = 18, className = '', strokeWidth = 1.9, fill = false }) {
  if (COMPLEX[name]) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
        {COMPLEX[name]}
      </svg>
    );
  }
  const d = PATHS[name] || '';
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
});