'use client';

import { useState, useEffect } from 'react';

type FormState = 'idle' | 'loading' | 'success' | 'error';

type Study = {
  id: number;
  title: string;
};

function isStudy(data: unknown): data is Study {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const study = data as Record<string, unknown>;

  return (
    typeof study.id === 'number' &&
    typeof study.title === 'string'
  );
}

// Border #cac7c7 (1.7:1) -> #767676 (>=3:1); placeholder -> #6b6b6b; keyboard
// focus-visible ring on top of the border-colour change (B21, B38).
const inputClass =
  'w-full border-2 border-[#767676] rounded-[30px] h-[56px] px-6 text-base sm:text-[20px] placeholder:text-[#6b6b6b] text-[#0a4479] bg-white focus:outline-none focus:border-[#0a4479] focus-visible:ring-2 focus-visible:ring-[#0a4479] focus-visible:ring-offset-1 transition-colors';

const labelClass =
  'block font-semibold text-[#0a4479] text-base sm:text-[24px] mb-2 ml-2';

export default function JoinStudyForm() {
  const [studies, setStudies] = useState<Study[]>([]);
  const [studiesLoading, setStudiesLoading] = useState(true);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [study, setStudy] = useState('');
  const [message, setMessage] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadStudies() {
      try {
        const res = await fetch('/api/studies');
        if (!res.ok) {
          throw new Error('Failed to fetch studies');
        }

        const data: unknown = await res.json();
        if (!Array.isArray(data) || !data.every(isStudy)) {
          throw new Error('Invalid studies response');
        }

        setStudies(data);
      } catch {
        setStudies([]);
      } finally {
        setStudiesLoading(false);
      }
    }

    loadStudies();
  }, []);

  function clearError() {
    if (state === 'error') setState('idle');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !contact.trim() || !study || !message.trim()) {
      setErrorMsg('Please fill in all fields.');
      setState('error');
      return;
    }

    setState('loading');
    setErrorMsg('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: contact.trim(),
          category: study,
          message: message.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || 'Submission failed. Please try again.');
        setState('error');
        return;
      }

      setState('success');
    } catch {
      setErrorMsg('Something went wrong. Please try again.');
      setState('error');
    }
  }

  const formMarkup = (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <label htmlFor="join-name" className={labelClass}>
          Name
        </label>
        <input
          id="join-name"
          type="text"
          required
          aria-required="true"
          aria-invalid={state === 'error' && !name.trim()}
          aria-describedby="join-error"
          value={name}
          onChange={e => {
            setName(e.target.value);
            clearError();
          }}
          placeholder="Enter your name"
          className={inputClass}
          disabled={state === 'loading'}
        />
      </div>

      <div>
        <label htmlFor="join-contact" className={labelClass}>
          Email / Phone
        </label>
        <input
          id="join-contact"
          type="text"
          required
          aria-required="true"
          aria-invalid={state === 'error' && !contact.trim()}
          aria-describedby="join-error"
          value={contact}
          onChange={e => {
            setContact(e.target.value);
            clearError();
          }}
          placeholder="example@gmail.com  /  012 3456 789"
          className={inputClass}
          disabled={state === 'loading'}
        />
      </div>

      <div>
        <label htmlFor="join-study" className={labelClass}>
          What study are you interested in?
        </label>
        <div className="relative">
          <select
            id="join-study"
            required
            aria-required="true"
            aria-invalid={state === 'error' && !study}
            aria-describedby="join-error"
            value={study}
            onChange={e => {
              setStudy(e.target.value);
              clearError();
            }}
            className={`${inputClass} appearance-none pr-12 cursor-pointer`}
            disabled={state === 'loading' || studiesLoading}
          >
            <option value="" disabled>
              {studiesLoading ? 'Loading…' : 'Select'}
            </option>
            {studies.map(s => (
              <option key={s.id} value={s.title}>
                {s.title}
              </option>
            ))}
          </select>
          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg
              width="20"
              height="12"
              viewBox="0 0 20 12"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M1 1L10 11L19 1"
                stroke="#0a4479"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="join-message" className={labelClass}>
          Message
        </label>
        <textarea
          id="join-message"
          required
          aria-required="true"
          aria-invalid={state === 'error' && !message.trim()}
          aria-describedby="join-error"
          value={message}
          onChange={e => {
            setMessage(e.target.value);
            clearError();
          }}
          placeholder="Write your message here..."
          rows={6}
          className="w-full border-2 border-[#767676] rounded-[30px] px-6 py-4 text-base sm:text-[20px] placeholder:text-[#6b6b6b] text-[#0a4479] bg-white focus:outline-none focus:border-[#0a4479] focus-visible:ring-2 focus-visible:ring-[#0a4479] focus-visible:ring-offset-1 transition-colors resize-none"
          disabled={state === 'loading'}
        />
      </div>

      {/* Always in the DOM so aria-describedby resolves and role="alert"
          announces; hidden while empty. Non-colour cue + red-600 (>=4.5:1). */}
      <p
        id="join-error"
        role="alert"
        className="text-red-600 font-semibold text-sm ml-2 empty:hidden"
      >
        {state === 'error' && (
          <>
            <span aria-hidden="true">⚠ </span>
            Error: {errorMsg}
          </>
        )}
      </p>

      <button
        type="submit"
        disabled={state === 'loading'}
        className="w-fit bg-[#0a4479] text-white font-bold text-base sm:text-[20px] px-8 sm:px-10 py-3 sm:py-4 rounded-[30px] hover:bg-[#083559] transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a4479] focus-visible:ring-offset-2"
      >
        {state === 'loading' ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  );

  return (
    <div>
      {/* Live region kept in the DOM (empty) before success so screen readers
          announce the text when it's injected — many only announce a region
          that already existed before its content changed. */}
      <div role="status">
        {state === 'success' && (
          <div className="py-10">
            <p className="text-[#0a4479] text-xl font-bold">Message sent!</p>
            <p className="text-[#0a4479] text-base mt-2">
              Thank you for your interest. We&apos;ll get back to you soon.
            </p>
          </div>
        )}
      </div>
      {state !== 'success' && formMarkup}
    </div>
  );
}
