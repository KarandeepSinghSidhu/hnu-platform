'use client';

import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
// Type-only import — erased at compile time, so the server-side prisma code
// in inquiry-types.ts never reaches the client bundle.
import type { InquiryTypeOption } from '@/lib/inquiry-types';
import { isValidEmail, isValidPhone } from '@/lib/validation';

type FormState = 'idle' | 'loading' | 'success' | 'error';

// Borders darkened #cac7c7 (1.7:1, fails 1.4.11) -> #767676 (>=3:1); placeholder
// darkened to #6b6b6b (>=4.5:1); a keyboard focus-visible ring supplements the
// border-colour change (B21 contrast, B38 focus-visible).
const inputClass =
  'w-full border-2 border-[#767676] rounded-[30px] h-[56px] px-6 text-base sm:text-[20px] placeholder:text-[#6b6b6b] text-[#0a4479] bg-white focus:outline-none focus:border-[#0a4479] focus-visible:ring-2 focus-visible:ring-[#0a4479] focus-visible:ring-offset-1 transition-colors';

const labelClass =
  'block font-bold text-[#0a4479] text-base sm:text-[24px] mb-2 ml-2';

const textareaClass =
  'w-full border-2 border-[#767676] rounded-[30px] px-6 py-4 text-base sm:text-[20px] placeholder:text-[#6b6b6b] text-[#0a4479] bg-white focus:outline-none focus:border-[#0a4479] focus-visible:ring-2 focus-visible:ring-[#0a4479] focus-visible:ring-offset-1 transition-colors resize-none';

export default function ContactEmailForm({
  // Admin-managed types (DB-driven), passed by the server ContactDetails
  // wrapper. The canonical `category` is submitted; labels are per-language.
  inquiryTypes = [],
}: {
  inquiryTypes?: InquiryTypeOption[];
}) {
  const { lang, t } = useLanguage();
  const noInquiryTypes = inquiryTypes.length === 0;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [prefersPhone, setPrefersPhone] = useState(false);
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [state, setState] = useState<FormState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const mountedAtRef = useRef<number>(0);

  // The preference checkbox only makes sense when both channels were given.
  const showPrefersPhone = email.trim() !== '' && phone.trim() !== '';

  useEffect(() => {
    mountedAtRef.current = Date.now();
  }, []);

  function clearError() {
    if (state === 'error') {
      setState('idle');
      setErrorMsg('');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !category || !message.trim()) {
      setErrorMsg(t.contactPage.requiredError);
      setState('error');
      return;
    }

    // Either/or: at least one contact channel, and whichever is given must
    // be valid.
    if (!email.trim() && !phone.trim()) {
      setErrorMsg(t.contactPage.eitherEmailOrPhoneError);
      setState('error');
      return;
    }

    if (email.trim() && !isValidEmail(email.trim())) {
      setErrorMsg(t.contactPage.invalidEmailError);
      setState('error');
      return;
    }

    if (phone.trim() && !isValidPhone(phone.trim())) {
      setErrorMsg(t.contactPage.invalidPhoneError);
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
          email: email.trim(),
          phone: phone.trim(),
          prefersPhone: showPrefersPhone && prefersPhone,
          category,
          message: message.trim(),
          honeypot: honeypot.trim(),
          elapsedMs: Date.now() - (mountedAtRef.current || Date.now()),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorMsg(data.error || t.contactPage.submissionError);
        setState('error');
        return;
      }

      setState('success');
    } catch {
      setErrorMsg(t.contactPage.genericError);
      setState('error');
    }
  }

  const formMarkup = (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <label htmlFor="contact-name" className={labelClass}>
          {t.contactPage.nameLabel}
        </label>
        <input
          id="contact-name"
          type="text"
          required
          aria-required="true"
          aria-invalid={state === 'error' && !name.trim()}
          aria-describedby="contact-error"
          value={name}
          onChange={e => {
            setName(e.target.value);
            clearError();
          }}
          placeholder={t.contactPage.namePlaceholder}
          className={inputClass}
          disabled={state === 'loading'}
        />
      </div>

      <div>
        <label htmlFor="contact-email" className={labelClass}>
          {t.contactPage.emailLabel}
        </label>
        <input
          id="contact-email"
          type="email"
          aria-describedby="contact-channel-hint contact-error"
          aria-invalid={
            state === 'error' &&
            ((!email.trim() && !phone.trim()) ||
              (!!email.trim() && !isValidEmail(email.trim())))
          }
          value={email}
          onChange={e => {
            setEmail(e.target.value);
            clearError();
          }}
          placeholder="example@gmail.com"
          className={inputClass}
          disabled={state === 'loading'}
        />
      </div>

      <div>
        <label htmlFor="contact-phone" className={labelClass}>
          {t.contactPage.phoneLabel}
        </label>
        <input
          id="contact-phone"
          type="tel"
          aria-describedby="contact-channel-hint contact-error"
          aria-invalid={
            state === 'error' &&
            ((!email.trim() && !phone.trim()) ||
              (!!phone.trim() && !isValidPhone(phone.trim())))
          }
          value={phone}
          onChange={e => {
            setPhone(e.target.value);
            clearError();
          }}
          placeholder={t.contactPage.phonePlaceholder}
          className={inputClass}
          disabled={state === 'loading'}
        />
        <p id="contact-channel-hint" className="text-sm text-[#0a4479]/80 mt-1.5 ml-2">
          {t.contactPage.eitherEmailOrPhoneHint}
        </p>
      </div>

      {showPrefersPhone && (
        <label
          htmlFor="contact-prefers-phone"
          className="flex items-center gap-3 ml-2 cursor-pointer select-none"
        >
          <input
            id="contact-prefers-phone"
            type="checkbox"
            checked={prefersPhone}
            onChange={e => {
              setPrefersPhone(e.target.checked);
              clearError();
            }}
            className="h-5 w-5 accent-[#0a4479] cursor-pointer"
            disabled={state === 'loading'}
          />
          <span className="text-[#0a4479] text-base sm:text-[18px]">
            {t.contactPage.prefersPhoneLabel}
          </span>
        </label>
      )}

      <div>
        <label htmlFor="contact-category" className={labelClass}>
          {t.contactPage.inquiryTypeLabel}
        </label>
        <div className="relative">
          <select
            id="contact-category"
            required
            aria-required="true"
            aria-invalid={state === 'error' && !category}
            aria-describedby="contact-error"
            value={category}
            onChange={e => {
              setCategory(e.target.value);
              clearError();
            }}
            className={`${inputClass} appearance-none pr-12 cursor-pointer`}
            disabled={state === 'loading' || noInquiryTypes}
          >
            <option value="" disabled>
              {noInquiryTypes
                ? t.contactPage.noInquiryTypes
                : t.contactPage.selectPlaceholder}
            </option>
            {inquiryTypes.map(type => (
              <option key={type.category} value={type.category}>
                {lang === 'ZH'
                  ? type.labelZh || type.labelEn
                  : type.labelEn}
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
        <label htmlFor="contact-message" className={labelClass}>
          {t.contactPage.messageLabel}
        </label>
        <textarea
          id="contact-message"
          required
          aria-required="true"
          aria-invalid={state === 'error' && !message.trim()}
          aria-describedby="contact-error"
          value={message}
          onChange={e => {
            setMessage(e.target.value);
            clearError();
          }}
          placeholder={t.contactPage.messagePlaceholder}
          rows={6}
          className={textareaClass}
          disabled={state === 'loading'}
        />
      </div>

      <div
        className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden"
        aria-hidden="true"
      >
        <label htmlFor="contact-website">Website</label>
        <input
          id="contact-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={e => setHoneypot(e.target.value)}
        />
      </div>

      {/* Always in the DOM so aria-describedby resolves and role="alert"
          announces; hidden while empty. Non-colour cue (icon + "Error:") plus
          red-600 (>=4.5:1) instead of the failing red-500. */}
      <p
        id="contact-error"
        role="alert"
        className="text-red-600 font-semibold text-sm ml-2 empty:hidden"
      >
        {state === 'error' && (
          <>
            <span aria-hidden="true">⚠ </span>
            {lang === 'EN' ? 'Error: ' : '错误：'}
            {errorMsg}
          </>
        )}
      </p>

      <button
        type="submit"
        disabled={state === 'loading' || noInquiryTypes}
        className="w-fit bg-[#0a4479] text-white font-bold text-base sm:text-[20px] px-8 sm:px-10 py-3 sm:py-4 rounded-[30px] hover:bg-[#083559] transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0a4479] focus-visible:ring-offset-2"
      >
        {state === 'loading' ? t.contactPage.sending : t.contactPage.sendMessage}
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
          <div className="flex flex-col gap-3 py-10">
            <p className="text-[#0a4479] text-xl font-bold">
              {t.contactPage.successTitle}
            </p>
            <p className="text-[#0a4479] text-base">{t.contactPage.successText}</p>
          </div>
        )}
      </div>
      {state !== 'success' && formMarkup}
    </div>
  );
}
