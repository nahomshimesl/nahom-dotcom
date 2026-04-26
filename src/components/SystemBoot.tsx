import { useEffect, useState, useRef, useCallback, useMemo, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SystemBootProps {
  onComplete: () => void;
}

interface BootLine {
  id: number;
  module: string;
  text: string;
  status: 'pending' | 'running' | 'ok' | 'warn';
  detail?: string;
  ms?: number;
}

const BOOT_SEQUENCE: Array<{
  module: string;
  text: string;
  durationMs: number;
  detail?: string;
  status?: 'ok' | 'warn';
}> = [
  { module: 'core',     text: 'Initializing runtime supervisor', durationMs: 220, detail: 'pid 1 · cgroup v2' },
  { module: 'license',  text: 'Validating institutional license', durationMs: 280, detail: 'Apache-2.0 · academic use' },
  { module: 'numlib',   text: 'Loading BLAS / LAPACK', durationMs: 320, detail: 'OpenBLAS 0.3.27 · 8 threads' },
  { module: 'numlib',   text: 'Loading sparse linear solvers', durationMs: 260, detail: 'SuiteSparse 7.7.0' },
  { module: 'rng',      text: 'Seeding pseudo-random generators', durationMs: 240 },
  { module: 'mesh',     text: 'Constructing simulation mesh', durationMs: 360, detail: 'organoid topology · 50 cells' },
  { module: 'solver',   text: 'Compiling metabolic flux solver', durationMs: 420, detail: 'Φ-recursive · adaptive RK45' },
  { module: 'sde',      text: 'Initializing stochastic kernels', durationMs: 320, detail: 'Gillespie τ-leap · σ²=1.0' },
  { module: 'gpu',      text: 'Provisioning parallel compute pool', durationMs: 280, detail: 'WebWorker × 1' },
  { module: 'auth',     text: 'Connecting identity provider', durationMs: 300, detail: 'Firebase OAuth2 · Google IdP' },
  { module: 'storage',  text: 'Mounting research data store', durationMs: 260, detail: 'Firestore · researchLogs' },
  { module: 'net',      text: 'Opening Socket.IO transport', durationMs: 240, detail: 'ws/4.8.3 · full-duplex' },
  { module: 'ai',       text: 'Arming Gemini predictive analyzer', durationMs: 320, detail: 'fallback = heuristic' },
  { module: 'sentinel', text: 'Stability Sentinel online', durationMs: 240, detail: 'anomaly z-threshold = 3.0σ' },
  { module: 'ui',       text: 'Compositing research workbench', durationMs: 220 },
  { module: 'sys',      text: 'All subsystems nominal', durationMs: 320, status: 'ok', detail: 'handoff to investigator' },
];

const HEX = (n: number) => n.toString(16).toUpperCase().padStart(8, '0');
const HEXS = (n: number, w = 4) => n.toString(16).toUpperCase().padStart(w, '0');

function useClock(active: boolean) {
  const [t, setT] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const i = setInterval(() => setT(Date.now()), 250);
    return () => clearInterval(i);
  }, [active]);
  return t;
}

export default function SystemBoot({ onComplete }: SystemBootProps) {
  const [lines, setLines] = useState<BootLine[]>([]);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<'boot' | 'handoff' | 'done'>('boot');

  const session = useMemo(() => {
    const rngSeed = Math.floor(Math.random() * 0xffffffff);
    const buildHash = HEX(Math.floor(Math.random() * 0xffffffff)).slice(0, 7).toLowerCase();
    const sessionId = Array.from({ length: 4 }, () => HEXS(Math.floor(Math.random() * 0xffff))).join('-');
    return { rngSeed, buildHash, sessionId };
  }, []);

  const startedAt = useRef(Date.now());
  const time = useClock(stage !== 'done');

  const completedRef = useRef(false);
  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const activeRef = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setStage('done');
    onComplete();
  }, [onComplete]);

  const skip = useCallback(() => {
    if (completedRef.current) return;
    activeRef.current = false;
    timersRef.current.forEach(clearTimeout);
    timersRef.current.clear();
    setProgress(100);
    finish();
  }, [finish]);

  useEffect(() => {
    activeRef.current = true;
    let idx = 0;
    const total = BOOT_SEQUENCE.length;

    const schedule = (fn: () => void, ms: number) => {
      const id = setTimeout(() => {
        timersRef.current.delete(id);
        if (!activeRef.current) return;
        fn();
      }, ms);
      timersRef.current.add(id);
      return id;
    };

    const runNext = () => {
      if (!activeRef.current) return;
      if (idx >= total) {
        setProgress(100);
        schedule(() => setStage('handoff'), 260);
        schedule(() => finish(), 1100);
        return;
      }
      const step = BOOT_SEQUENCE[idx];
      const id = idx;
      const startedAtMs = performance.now();
      setLines((prev) => {
        if (prev.some((l) => l.id === id)) return prev;
        // detail with seed for the rng line
        const detail = step.module === 'rng' ? `Mersenne-19937 · seed = 0x${HEX(session.rngSeed)}` : step.detail;
        return [...prev, { id, module: step.module, text: step.text, status: 'running', detail }];
      });
      schedule(() => {
        const ms = Math.round(performance.now() - startedAtMs);
        setLines((prev) =>
          prev.map((l) => (l.id === id ? { ...l, status: step.status ?? 'ok', ms } : l))
        );
        idx++;
        setProgress(Math.round((idx / total) * 100));
        runNext();
      }, step.durationMs);
    };

    runNext();

    return () => {
      activeRef.current = false;
      timersRef.current.forEach(clearTimeout);
      timersRef.current.clear();
    };
  }, [finish, session.rngSeed]);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
      e.preventDefault();
      skip();
    }
  };

  const elapsed = ((time - startedAt.current) / 1000).toFixed(2);
  const utc = new Date(time).toISOString().replace('T', ' ').slice(0, 19);

  return (
    <AnimatePresence>
      {stage !== 'done' && (
        <motion.div
          key="boot"
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-label="System boot sequence"
          tabIndex={-1}
          onKeyDown={handleKeyDown}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="fixed inset-0 z-[9999] overflow-hidden select-none focus:outline-none text-slate-200"
          style={{
            background:
              'radial-gradient(ellipse at 50% 35%, #131a2a 0%, #0a0f1a 55%, #05080f 100%)',
            fontFamily:
              "'Inter', 'Helvetica Neue', system-ui, -apple-system, sans-serif",
          }}
        >
          {/* Live region for screen readers */}
          <div className="sr-only" role="status" aria-live="polite" aria-atomic="false">
            {lines.length > 0 &&
              `${lines[lines.length - 1].text}${
                lines[lines.length - 1].status === 'ok' ? ' — ok' : ''
              }`}
            {stage === 'handoff' && ' — handoff to investigator'}
          </div>

          {/* Subtle dot grid */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.18]"
            style={{
              backgroundImage:
                'radial-gradient(rgba(148,163,184,0.35) 1px, transparent 1px)',
              backgroundSize: '24px 24px',
            }}
          />
          {/* Vignette */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at 50% 40%, transparent 50%, rgba(0,0,0,0.7) 100%)',
            }}
          />

          <div className="relative h-full w-full flex flex-col px-10 pt-8 pb-6 max-w-[1280px] mx-auto">

            {/* Top bar — institutional masthead */}
            <header className="flex items-start justify-between border-b border-slate-700/60 pb-4">
              <div className="flex items-start gap-4">
                <Crest />
                <div>
                  <div
                    className="text-amber-200/90 text-[11px] tracking-[0.32em] uppercase"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                  >
                    Computational Systems Biology Lab
                  </div>
                  <div
                    className="text-slate-100 text-2xl mt-1"
                    style={{
                      fontFamily:
                        "'Iowan Old Style', 'Palatino Linotype', 'Georgia', serif",
                      letterSpacing: '0.01em',
                    }}
                  >
                    Bio-Organoid Simulation System
                    <span className="text-slate-400 font-light"> · BOSS</span>
                  </div>
                  <div className="text-slate-400/80 text-[11px] mt-1 font-mono">
                    v12.4.1 · build {session.buildHash} · session {session.sessionId}
                  </div>
                </div>
              </div>

              <div className="text-right text-[11px] font-mono text-slate-400 leading-relaxed">
                <div>UTC {utc}</div>
                <div>uptime  T+{elapsed}s</div>
                <div className="text-slate-500">node nahomdskjn / repl-runner</div>
              </div>
            </header>

            {/* Main content — two columns */}
            <div className="flex-1 grid grid-cols-12 gap-6 mt-6 min-h-0">

              {/* Left: meta panel */}
              <aside className="col-span-4 flex flex-col gap-4 text-[11px]">
                <Panel title="Provenance">
                  <Row k="License" v="Apache-2.0" />
                  <Row k="Repository" v="git@research/boss.git" />
                  <Row k="Commit" v={session.buildHash} mono />
                  <Row k="Toolchain" v="Node 20 · TS 5.8 · Vite 6" />
                  <Row k="Numerics" v="OpenBLAS 0.3.27 · SuiteSparse 7.7" />
                </Panel>

                <Panel title="Reproducibility">
                  <Row k="RNG" v="Mersenne-19937" />
                  <Row k="Seed" v={`0x${HEX(session.rngSeed)}`} mono />
                  <Row k="Solver" v="adaptive RK45  rtol=1e-6" />
                  <Row k="ε / atol" v="1.0e-9" mono />
                  <Row k="Units" v="SI · time = ticks" />
                </Panel>

                <Panel title="Citation" tone="muted">
                  <p
                    className="text-slate-300 leading-relaxed"
                    style={{ fontFamily: "'Iowan Old Style','Palatino Linotype','Georgia',serif" }}
                  >
                    If you use BOSS in published work, please cite:
                  </p>
                  <p
                    className="text-slate-200 mt-2 leading-relaxed"
                    style={{ fontFamily: "'Iowan Old Style','Palatino Linotype','Georgia',serif" }}
                  >
                    BOSS Contributors (2026). <em>Bio-Organoid Simulation System: a Φ-recursive framework for organoid metabolism.</em>{' '}
                    <span className="text-slate-400">v12.4.1.</span>{' '}
                    <span className="text-amber-200/80 font-mono text-[10px]">
                      doi:10.0000/boss.{session.buildHash}
                    </span>
                  </p>
                </Panel>
              </aside>

              {/* Right: kernel init log */}
              <section className="col-span-8 flex flex-col min-h-0">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-slate-400 mb-2 font-mono">
                  <span>kernel initialization</span>
                  <span className="flex items-center gap-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" aria-hidden="true" />
                    streaming
                  </span>
                </div>

                <div className="flex-1 min-h-0 border border-slate-700/70 bg-slate-950/70 backdrop-blur-sm rounded-sm overflow-hidden flex flex-col">
                  <div className="grid grid-cols-[3.5rem_5rem_1fr_3rem_3rem] gap-3 px-3 py-1.5 border-b border-slate-700/70 text-[10px] uppercase tracking-widest text-slate-500 font-mono bg-slate-900/60">
                    <span>addr</span>
                    <span>module</span>
                    <span>event</span>
                    <span className="text-right">ms</span>
                    <span className="text-right">stat</span>
                  </div>
                  <div className="flex-1 overflow-hidden p-3 font-mono text-[12px] leading-[1.5]">
                    {lines.map((l) => (
                      <motion.div
                        key={l.id}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.16 }}
                        className="grid grid-cols-[3.5rem_5rem_1fr_3rem_3rem] gap-3 items-baseline"
                      >
                        <span className="text-slate-500/70">
                          {HEXS(l.id * 73 + 0x1000, 4)}
                        </span>
                        <span className="text-cyan-300/80">
                          {l.module}
                        </span>
                        <span className="text-slate-100 truncate">
                          {l.text}
                          {l.detail && (
                            <span className="text-slate-400/80">  ·  {l.detail}</span>
                          )}
                        </span>
                        <span className="text-right text-slate-500">
                          {l.ms != null ? l.ms : ''}
                        </span>
                        <StatusTag status={l.status} />
                      </motion.div>
                    ))}
                    {lines.length < BOOT_SEQUENCE.length && (
                      <div
                        className="mt-1 text-slate-400/80 grid grid-cols-[3.5rem_5rem_1fr_3rem_3rem] gap-3"
                        aria-hidden="true"
                      >
                        <span />
                        <span />
                        <span className="animate-pulse">▌</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Progress */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.25em] text-slate-400 mb-1.5 font-mono">
                    <span>
                      {stage === 'handoff'
                        ? 'handoff to investigator'
                        : 'subsystem initialization'}
                    </span>
                    <span>{progress.toString().padStart(3, '0')}%</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                    aria-label="Boot progress"
                    className="relative h-[6px] border border-slate-700/70 bg-slate-900/70 overflow-hidden rounded-sm"
                  >
                    <motion.div
                      className="h-full"
                      style={{
                        background:
                          'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)',
                        boxShadow: '0 0 6px rgba(251,191,36,0.45)',
                      }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* Footer */}
            <footer className="mt-6 pt-4 border-t border-slate-700/60 flex items-end justify-between text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">
              <div className="flex gap-5">
                <Indicator label="license" ok />
                <Indicator label="numerics" ok />
                <Indicator label="storage" ok />
                <Indicator label="ai · heuristic" warn />
                <Indicator label="sentinel" ok />
              </div>
              <button
                type="button"
                onClick={skip}
                className="px-3 py-1.5 border border-slate-600 text-slate-300 hover:bg-slate-800 hover:border-slate-500 hover:text-amber-200 focus:outline-none focus:ring-1 focus:ring-amber-300 transition-colors uppercase tracking-[0.25em] rounded-sm"
              >
                enter workbench · ⏎
              </button>
            </footer>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Panel({
  title,
  tone = 'default',
  children,
}: {
  title: string;
  tone?: 'default' | 'muted';
  children: ReactNode;
}) {
  return (
    <div
      className={`border ${
        tone === 'muted' ? 'border-slate-700/60 bg-slate-950/40' : 'border-slate-700/70 bg-slate-950/60'
      } rounded-sm`}
    >
      <div className="px-3 py-1.5 border-b border-slate-700/70 text-[10px] uppercase tracking-[0.3em] text-amber-200/80 font-mono">
        {title}
      </div>
      <div className="px-3 py-2.5 space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-2 items-baseline">
      <span className="text-slate-500 font-mono text-[10px] uppercase tracking-wider">
        {k}
      </span>
      <span className={`text-slate-200 ${mono ? 'font-mono text-[11px]' : ''}`}>
        {v}
      </span>
    </div>
  );
}

function StatusTag({ status }: { status: BootLine['status'] }) {
  const map = {
    pending: { label: 'wait', cls: 'text-slate-500 border-slate-600' },
    running: { label: ' .. ', cls: 'text-amber-300 border-amber-500/60 animate-pulse' },
    ok:      { label: ' ok ', cls: 'text-emerald-300 border-emerald-400/60' },
    warn:    { label: 'warn', cls: 'text-amber-300 border-amber-400/60' },
  } as const;
  const v = map[status];
  return (
    <span
      className={`shrink-0 self-center text-right px-1 text-[10px] tracking-widest border rounded-[2px] ${v.cls}`}
    >
      {v.label}
    </span>
  );
}

function Indicator({ label, ok, warn }: { label: string; ok?: boolean; warn?: boolean }) {
  const color = warn
    ? 'bg-amber-400'
    : ok
    ? 'bg-emerald-400'
    : 'bg-slate-600';
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${color}`} />
      <span className="text-slate-400">{label}</span>
    </span>
  );
}

function Crest() {
  // Academic-style crest: hexagonal + concentric rings + helical glyph
  return (
    <motion.svg
      width="44"
      height="44"
      viewBox="0 0 44 44"
      aria-hidden="true"
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="shrink-0"
    >
      <defs>
        <linearGradient id="crest-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fcd34d" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.7" />
        </linearGradient>
      </defs>
      <polygon
        points="22,3 39,13 39,31 22,41 5,31 5,13"
        fill="none"
        stroke="url(#crest-grad)"
        strokeWidth="1.4"
      />
      <circle cx="22" cy="22" r="11" fill="none" stroke="#fcd34d" strokeOpacity="0.55" strokeWidth="0.8" />
      <circle cx="22" cy="22" r="6.5" fill="none" stroke="#fcd34d" strokeOpacity="0.45" strokeWidth="0.8" />
      <motion.path
        d="M14 22 Q 22 12 30 22 T 14 22"
        fill="none"
        stroke="#fcd34d"
        strokeOpacity="0.95"
        strokeWidth="1.1"
        animate={{ rotate: 360 }}
        style={{ transformOrigin: '22px 22px' }}
        transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
      />
      <circle cx="22" cy="22" r="1.6" fill="#fcd34d" />
    </motion.svg>
  );
}
