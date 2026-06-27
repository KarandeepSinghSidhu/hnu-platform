import Link from "next/link";
import { ReactNode } from "react";

interface AdminFormProps {
  title: string;
  description?: string;
  kicker?: string;
  onSubmit: (e: React.FormEvent) => void;
  isLoading?: boolean;
  children: ReactNode;
  submitButtonLabel?: string;
  cancelHref?: string;
  secondaryAction?: ReactNode;
  /** When set, applied as the <form> id so an external submit button can target it via the `form` attribute. */
  formId?: string;
  /** Hide the built-in submit/cancel footer (e.g. when the submit button is lifted below sibling sections). */
  hideFooter?: boolean;
}

export function AdminForm({
  title,
  description,
  kicker,
  onSubmit,
  isLoading = false,
  children,
  submitButtonLabel = "Save",
  cancelHref,
  secondaryAction,
  formId,
  hideFooter = false,
}: AdminFormProps) {
  return (
    <div>
      <header className="mb-8">
        {kicker && (
          <p className="text-xs uppercase tracking-[2px] text-[#0a4479]/70">
            {kicker}
          </p>
        )}
        <h1 className="text-4xl font-extrabold text-[#0c0c48] mt-1 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-[#0a4479]/80 mt-2 max-w-2xl">{description}</p>
        )}
      </header>

      <form
        id={formId}
        onSubmit={onSubmit}
        className="bg-white rounded-2xl shadow-[0_8px_24px_rgba(0,0,0,0.06)] p-8 max-w-3xl"
      >
        <div className="space-y-6">{children}</div>

        {!hideFooter && (
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center justify-center bg-[#0a4479] text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#083559] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isLoading ? "Saving..." : submitButtonLabel}
          </button>
          {cancelHref ? (
            <Link
              href={cancelHref}
              className="inline-flex items-center justify-center bg-white border-2 border-[#0a4479]/20 text-[#0a4479] px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#0a4479]/5 transition-colors"
            >
              Cancel
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center bg-white border-2 border-[#0a4479]/20 text-[#0a4479] px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-[#0a4479]/5 transition-colors"
            >
              Cancel
            </button>
          )}
          {secondaryAction}
        </div>
        )}
      </form>
    </div>
  );
}

interface FormFieldProps {
  label: string;
  id: string;
  name?: string;
  type?: string;
  placeholder?: string;
  value: string | number;
  onChange: (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => void;
  required?: boolean;
  rows?: number;
  options?: { value: string; label: string }[];
  helper?: string;
  min?: number;
  max?: number;
  step?: number;
}

// Border #cac7c7 (1.7:1) -> #767676 (>=3:1); placeholder #8e8d8d (3.3:1) ->
// #6b6b6b (>=4.5:1); add a keyboard focus-visible ring (B21, B38).
const inputClass =
  "w-full px-4 py-2.5 bg-white border-2 border-[#767676] rounded-2xl text-base text-[#0c0c48] placeholder:text-[#6b6b6b] focus:outline-none focus:border-[#0a4479] focus-visible:ring-2 focus-visible:ring-[#0a4479] focus-visible:ring-offset-1 transition-colors";

export function FormField({
  label,
  id,
  name,
  type = "text",
  placeholder = "",
  value,
  onChange,
  required = false,
  rows,
  options,
  helper,
  min,
  max,
  step,
}: FormFieldProps) {
  const fieldName = name ?? id;
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-[#0c0c48] mb-2"
      >
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      {type === "textarea" ? (
        <textarea
          id={id}
          name={fieldName}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          rows={rows || 4}
          className={inputClass}
        />
      ) : type === "select" ? (
        <select
          id={id}
          name={fieldName}
          value={value}
          onChange={onChange}
          required={required}
          className={inputClass}
        >
          <option value="">Select {label.toLowerCase()}</option>
          {options?.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          name={fieldName}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          min={min}
          max={max}
          step={step}
          className={inputClass}
        />
      )}
      {helper && (
        <p className="text-xs text-[#0a4479]/80 mt-1.5">{helper}</p>
      )}
    </div>
  );
}

interface FormCheckboxProps {
  label: string;
  id: string;
  name?: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  helper?: string;
}

export function FormCheckbox({
  label,
  id,
  name,
  checked,
  onChange,
  helper,
}: FormCheckboxProps) {
  return (
    <div>
      <div className="flex items-center gap-3">
        <input
          id={id}
          name={name ?? id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="w-5 h-5 rounded border-2 border-[#cac7c7] text-[#0a4479] focus:ring-2 focus:ring-[#0a4479]/30 accent-[#0a4479]"
        />
        <label htmlFor={id} className="text-sm font-semibold text-[#0c0c48]">
          {label}
        </label>
      </div>
      {helper && (
        <p className="text-xs text-[#0a4479]/70 mt-1.5 ml-8">{helper}</p>
      )}
    </div>
  );
}

interface FormFileFieldProps {
  label: string;
  id: string;
  name?: string;
  accept?: string;
  required?: boolean;
  helper?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  currentValue?: string;
}

export function FormFileField({
  label,
  id,
  name,
  accept,
  required = false,
  helper,
  onChange,
  currentValue,
}: FormFileFieldProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-[#0c0c48] mb-2"
      >
        {label}
        {required && <span className="text-red-600 ml-1">*</span>}
      </label>
      {currentValue && (
        <p className="text-xs text-[#0a4479]/80 mb-2">
          Current: <code className="bg-[#f5f5f7] px-1.5 py-0.5 rounded">{currentValue}</code>
        </p>
      )}
      <input
        id={id}
        name={name ?? id}
        type="file"
        accept={accept}
        onChange={onChange}
        required={required}
        className="block w-full text-sm text-[#0c0c48] file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#0a4479] file:text-white hover:file:bg-[#083559] file:cursor-pointer"
      />
      {helper && (
        <p className="text-xs text-[#0a4479]/80 mt-1.5">{helper}</p>
      )}
    </div>
  );
}

export function FormErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm"
    >
      {message}
    </div>
  );
}

export function FormSuccessBanner({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="bg-[#0a4479]/5 border border-[#0a4479]/20 text-[#0a4479] px-4 py-3 rounded-2xl text-sm"
    >
      {message}
    </div>
  );
}
