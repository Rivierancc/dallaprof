const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const BASE_MINUTES = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55", "59"];

/** Estrae ore e minuti normalizzati ("HH", "MM") da una stringa orario. */
export function parseTimeParts(value: string): { hour: string; minute: string } {
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(value.trim());
  const h = match ? Math.min(23, Math.max(0, Number(match[1]))) : 0;
  const m = match ? Math.min(59, Math.max(0, Number(match[2]))) : 0;
  return { hour: String(h).padStart(2, "0"), minute: String(m).padStart(2, "0") };
}

/** Elenco minuti (scatti di 5 min + 59), preservando eventuali minuti personalizzati già salvati. */
export function minuteOptionsFor(minute: string): string[] {
  if (BASE_MINUTES.includes(minute)) return BASE_MINUTES;
  return [...BASE_MINUTES, minute].sort((a, b) => Number(a) - Number(b));
}

type TimeSelectProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
};

/** Selettore orario touch-friendly con due tendine grandi (Ore e Minuti). */
export function TimeSelect({ value, onChange, label, disabled }: TimeSelectProps) {
  const { hour, minute } = parseTimeParts(value);
  const minutes = minuteOptionsFor(minute);
  const selectClass = "min-h-11 rounded-xl border border-border bg-background px-3 py-2 text-lg font-medium text-foreground";

  return (
    <div className="flex flex-wrap items-center gap-2 text-lg">
      {label && <span className="font-medium">{label}</span>}
      <div className="inline-flex items-center gap-1.5">
        <select
          value={hour}
          disabled={disabled}
          aria-label={label ? `${label} — ore` : "Ore"}
          onChange={(e) => onChange(`${e.target.value}:${minute}`)}
          className={selectClass}
        >
          {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
        </select>
        <span aria-hidden="true" className="text-xl font-bold text-muted-foreground">:</span>
        <select
          value={minute}
          disabled={disabled}
          aria-label={label ? `${label} — minuti` : "Minuti"}
          onChange={(e) => onChange(`${hour}:${e.target.value}`)}
          className={selectClass}
        >
          {minutes.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
    </div>
  );
}