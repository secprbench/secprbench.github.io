export function Icon({ name, size = 18, className = '' }: { name: string; size?: number; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    dash: <path d="M6 12h12" />,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    external: <><path d="M14 4h6v6m0-6L10 14" /><path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" /></>,
    chevron: <path d="m8 5 7 7-7 7" />,
    down: <path d="m6 9 6 6 6-6" />,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></>,
    code: <><path d="m8 6-6 6 6 6m8-12 6 6-6 6M14 3l-4 18" /></>,
    book: <><path d="M12 5v16M12 5C9 2 5 2 2 4v15c3-2 7-2 10 2 3-4 7-4 10-2V4c-3-2-7-2-10 1Z" /></>,
    chart: <><path d="M4 3v17h17M9 15V9m5 6V5m5 10v-4" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 15v5h16v-5" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 6v6l4 2" /></>,
    info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6m0-11v1" /></>,
    copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V3H3v13h5" /></>,
    shield: <><path d="m12 2 8 3v7c0 5-4 8-8 10-4-2-8-5-8-10V5Z" /><path d="m8 11 3 3 5-6" /></>,
    file: <><path d="M13 2H5v20h14V8l-6-6Zm0 0v6h6M8 13h8m-8 4h6" /></>,
    terminal: <><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m6 8 4 4-4 4m7 0h5" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 1v2m0 18v2M1 12h2m18 0h2M4 4l1 1m14 14 1 1M4 20l1-1M19 5l1-1" /></>,
    moon: <path d="M20 15a9 9 0 0 1-11-11 9 9 0 1 0 11 11Z" />,
  }
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.info}</svg>
}
