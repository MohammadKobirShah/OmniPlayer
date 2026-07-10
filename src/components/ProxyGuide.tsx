import { useState } from 'react';
import { usePlayerStore } from '../store/playerStore';

const DEFAULT_PROXY = 'http://localhost:3001/proxy';

function Copy({ text, label }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1300);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <button onClick={copy} className="omni-copy-btn">
      {done ? '✓ কপি হয়েছে' : label || 'কপি'}
    </button>
  );
}

function Cmd({ children }: { children: string }) {
  return (
    <div className="omni-codeblock">
      <pre>
        <code>{children}</code>
      </pre>
      <div className="omni-codeblock-foot">
        <Copy text={children} />
      </div>
    </div>
  );
}

export default function ProxyGuide({ onBack }: { onBack: () => void }) {
  const proxyBase = usePlayerStore((s) => s.proxyBase);
  const setProxyBase = usePlayerStore((s) => s.setProxyBase);
  const [input, setInput] = useState(proxyBase || DEFAULT_PROXY);

  const configured = proxyBase.length > 0;

  return (
    <div
      className="min-h-screen w-full text-white"
      style={{
        fontFamily: "'Inter', system-ui, sans-serif",
        background: 'radial-gradient(110% 80% at 50% -10%, #1b1b22 0%, #0b0b0b 55%), #0b0b0b',
      }}
    >
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-3">
          <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-[0.7rem] font-semibold tracking-wide text-sky-300">
            🛡️ Proxy Setup Guide
          </span>
          <button
            onClick={onBack}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:border-white/25 hover:text-white"
          >
            ← পেছনে
          </button>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
          Proxy কীভাবে ব্যবহার করবেন
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/55">
          Toffee Live-এর মতো 🔐 চ্যানেলগুলো চালাতে একটা ছোট proxy সার্ভার দরকার। ব্রাউজার{' '}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-white/80">User-Agent</code> ও{' '}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-white/80">Cookie</code> সরাসরি পাঠাতে
          দেয় না — তাই এই proxy সেগুলো যোগ করে দেয়। নিচের ৪টি ধাপ অনুসরণ করুন।
        </p>

        {/* Current status */}
        <div
          className={`mt-6 flex items-center gap-3 rounded-xl border p-4 ${
            configured
              ? 'border-emerald-400/30 bg-emerald-400/[0.07]'
              : 'border-amber-400/30 bg-amber-400/[0.07]'
          }`}
        >
          <span className={`text-2xl`}>{configured ? '✅' : '⚠️'}</span>
          <div className="text-sm">
            <strong className={configured ? 'text-emerald-300' : 'text-amber-300'}>
              {configured ? 'Proxy সেট আছে' : 'Proxy এখনো সেট করা হয়নি'}
            </strong>
            {configured && (
              <div className="mt-0.5 font-mono text-xs text-white/60">{proxyBase}</div>
            )}
          </div>
        </div>

        {/* Step 1 */}
        <section className="mt-10">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e50914] text-sm">১</span>
            Node.js ইনস্টল করুন
          </h2>
          <p className="mb-3 text-sm text-white/55">
            আগে থেকেই থাকলে এই ধাপ স্কিপ করুন।{' '}
            <a
              href="https://nodejs.org"
              target="_blank"
              rel="noreferrer"
              className="text-sky-400 underline underline-offset-2"
            >
              nodejs.org
            </a>{' '}
            থেকে <strong>LTS</strong> ভার্সন নামিয়ে ইনস্টল করুন, তারপর চেক করুন:
          </p>
          <Cmd>node -v</Cmd>
        </section>

        {/* Step 2 */}
        <section className="mt-8">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e50914] text-sm">২</span>
            Proxy সার্ভার চালু করুন
          </h2>
          <p className="mb-3 text-sm text-white/55">
            প্রজেক্ট ফোল্ডারে Terminal/CMD খুলে এই কমান্ড দিন। জানালাটি{' '}
            <strong className="text-white/80">খোলা রাখবেন</strong>:
          </p>
          <Cmd>node proxy/server.js</Cmd>
          <p className="mt-2 text-xs text-white/40">
            দেখাবে: <code className="text-white/60">OmniStream proxy চলছে 👉 http://localhost:3001/proxy</code>
          </p>
        </section>

        {/* Step 3 */}
        <section className="mt-8">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e50914] text-sm">৩</span>
            প্লেয়ারে proxy URL সেভ করুন
          </h2>
          <p className="mb-3 text-sm text-white/55">
            নিচের বক্সে URL দিন এবং <strong>Save</strong> চাপুন (বা প্লেয়ারের{' '}
            <strong>Settings → Proxy</strong> থেকেও দিতে পারেন):
          </p>
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              className="flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-[#e50914]"
              placeholder={DEFAULT_PROXY}
            />
            <button
              onClick={() => setProxyBase(input.trim())}
              className="shrink-0 rounded-lg bg-[#e50914] px-5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
            >
              Save
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => {
                setInput(DEFAULT_PROXY);
                setProxyBase(DEFAULT_PROXY);
              }}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/60 hover:text-white"
            >
              ডিফল্ট URL বসান
            </button>
            <button
              onClick={() => setProxyBase('')}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/60 hover:text-white"
            >
              মুছুন
            </button>
          </div>
        </section>

        {/* Step 4 */}
        <section className="mt-8">
          <h2 className="mb-2 flex items-center gap-2 text-lg font-bold">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#e50914] text-sm">৪</span>
            চ্যানেল চালান 🎉
          </h2>
          <p className="text-sm leading-relaxed text-white/55">
            এবার পেছনে গিয়ে যেকোনো 🔐 Toffee চ্যানেলে ক্লিক করুন। প্লেয়ার এখন প্রতিটা রিকোয়েস্ট
            proxy-এর মাধ্যমে পাঠাবে এবং সঠিক <code className="rounded bg-white/10 px-1 py-0.5 text-white/80">User-Agent</code> +{' '}
            <code className="rounded bg-white/10 px-1 py-0.5 text-white/80">Cookie</code> যোগ করে দেবে।
          </p>
          <button
            onClick={onBack}
            className="mt-4 rounded-xl bg-[#e50914] px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.03]"
          >
            ✓ হয়েছে, চ্যানেল লিস্টে যান
          </button>
        </section>

        {/* Troubleshooting */}
        <section className="mt-10 rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="mb-3 text-base font-bold">সমস্যা হলে</h2>
          <ul className="space-y-2.5 text-sm text-white/60">
            <li className="flex gap-2">
              <span className="text-white/40">•</span>
              <span>
                <strong className="text-white/80">কালো স্ক্রিন / চলছে না:</strong> proxy চালু আছে কিনা চেক করুন
                এবং একই URL দিয়েছেন কিনা দেখুন।
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-white/40">•</span>
              <span>
                <strong className="text-white/80">Mixed content error:</strong> অ্যাপ HTTPS-এ থাকলে proxy-ও
                HTTPS দিয়ে হোস্ট করতে হবে।
              </span>
            </li>
            <li className="flex gap-2">
              <span className="text-white/40">•</span>
              <span>
                <strong className="text-white/80">পোর্ট ব্যস্ত:</strong>{' '}
                <code className="rounded bg-white/10 px-1 py-0.5 text-[0.72rem] text-white/80">
                  PROXY_PORT=3002 node proxy/server.js
                </code>{' '}
                দিয়ে অন্য পোর্টে চালান।
              </span>
            </li>
          </ul>
          <p className="mt-4 text-xs text-white/35">
            বিস্তারিত <code className="text-white/50">proxy/README.md</code> ফাইলে আছে।
          </p>
        </section>
      </div>
    </div>
  );
}
