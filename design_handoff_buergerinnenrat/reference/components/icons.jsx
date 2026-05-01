// Hand-tuned icons — outline, 1.5px stroke, 16/24px optical sizes.
// Geometric only — no AI-generated illustration.

const Ico = ({ d, s = 16, sw = 1.5, fill = "none" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
       strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

const I = {
  Overview: (p) => <Ico s={p.s} d={<><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>}/>,
  Mail:     (p) => <Ico s={p.s} d={<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></>}/>,
  Panel:    (p) => <Ico s={p.s} d={<><circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2"/><path d="M3 19c1.5-3 4-4.5 6-4.5s4.5 1.5 6 4.5"/><path d="M14 18c1-2 2.5-2.8 4-2.8s2.5.5 3 1.8"/></>}/>,
  Doc:      (p) => <Ico s={p.s} d={<><path d="M6 3h8l4 4v14a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M14 3v5h4"/><path d="M8 13h8M8 17h6M8 9h3"/></>}/>,
  Database: (p) => <Ico s={p.s} d={<><ellipse cx="12" cy="5" rx="8" ry="2.5"/><path d="M4 5v6c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5V5"/><path d="M4 11v6c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-6"/></>}/>,
  Settings: (p) => <Ico s={p.s} d={<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h0a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v0a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"/></>}/>,
  Upload:   (p) => <Ico s={p.s} d={<><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 20h14"/></>}/>,
  File:     (p) => <Ico s={p.s} d={<><path d="M6 3h8l4 4v14a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M14 3v5h4"/></>}/>,
  Download: (p) => <Ico s={p.s} d={<><path d="M12 4v12M7 11l5 5 5-5"/><path d="M5 20h14"/></>}/>,
  Refresh:  (p) => <Ico s={p.s} d={<><path d="M3 12a9 9 0 0115-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 01-15 6.7L3 16"/><path d="M3 21v-5h5"/></>}/>,
  Check:    (p) => <Ico s={p.s} d={<path d="M5 12l4 4L19 7"/>}/>,
  Lock:     (p) => <Ico s={p.s} d={<><rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 018 0v3"/></>}/>,
  Info:     (p) => <Ico s={p.s} d={<><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/></>}/>,
  Warn:     (p) => <Ico s={p.s} d={<><path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18v.01"/></>}/>,
  Copy:     (p) => <Ico s={p.s} d={<><rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/></>}/>,
  Sun:      (p) => <Ico s={p.s} d={<><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/></>}/>,
  Moon:     (p) => <Ico s={p.s} d={<path d="M21 13a9 9 0 11-10-10 7 7 0 0010 10z"/>}/>,
  Github:   (p) => <Ico s={p.s} fill="currentColor" sw={0} d={<path d="M12 2a10 10 0 00-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.46-1.11-1.46-.91-.62.07-.6.07-.6 1 .07 1.53 1.04 1.53 1.04.9 1.53 2.36 1.09 2.93.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 015 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .26.18.58.69.48A10 10 0 0012 2z"/>}/>,
  Drag:     (p) => <Ico s={p.s} d={<><circle cx="9" cy="6" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="18" r="1"/><circle cx="15" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="18" r="1"/></>}/>,
};

window.I = I;
