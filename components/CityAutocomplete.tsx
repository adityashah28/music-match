"use client";

import { useEffect, useId, useRef, useState } from "react";
import { searchCities } from "@/lib/client";

export type CityValue = {
  city: string;
  label: string;
  lat: number | null;
  lng: number | null;
  placeId: string | null;
};

type CityHit = { id: string; label: string; city: string; lat: number; lng: number };

type Props = {
  value: CityValue;
  onChange: (value: CityValue) => void;
  label?: string;
  /** Outer spacing. Default matches onboarding field rhythm (`mt-5`). */
  className?: string;
};

export function CityAutocomplete({
  value,
  onChange,
  label = "City",
  className = "mt-5",
}: Props) {
  const listId = useId();
  const [query, setQuery] = useState(value.label || value.city);
  const [results, setResults] = useState<CityHit[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  useEffect(() => {
    const next = value.label || value.city;
    setQuery((current) => (current === next ? current : next));
  }, [value.label, value.city]);

  useEffect(() => {
    const q = query.trim();
    const current = valueRef.current;

    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError(false);
      setOpen(false);
      return;
    }

    // Already registered this exact pick — don't keep searching.
    if (current.placeId && (q === current.label.trim() || q === current.city.trim())) {
      setResults([]);
      setSearching(false);
      setSearchError(false);
      setOpen(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    setSearchError(false);

    const timer = window.setTimeout(() => {
      searchCities(q)
        .then((found) => {
          if (cancelled) return;
          setResults(found);
          setOpen(found.length > 0);
          setSearching(false);
        })
        .catch(() => {
          if (cancelled) return;
          setResults([]);
          setOpen(false);
          setSearching(false);
          setSearchError(true);
        });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  function pick(city: CityHit) {
    onChange({
      city: city.city,
      label: city.label,
      lat: city.lat,
      lng: city.lng,
      placeId: city.id,
    });
    setQuery(city.label);
    setResults([]);
    setOpen(false);
    setSearching(false);
    setSearchError(false);
  }

  const showList = open && results.length > 0;

  return (
    <div className={`relative z-30 ${className}`.trim()}>
      <label className="block text-sm font-normal text-[var(--muted)]" htmlFor={listId}>
        {label}
      </label>
      <div className="field mt-2 flex min-h-12 w-full items-center px-4">
        <input
          id={listId}
          value={query}
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            onChange({
              city: next.trim(),
              label: next.trim(),
              lat: null,
              lng: null,
              placeId: null,
            });
          }}
          onFocus={() => {
            if (results.length) setOpen(true);
          }}
          onBlur={() => {
            // Delay so a click on a suggestion still registers.
            window.setTimeout(() => setOpen(false), 150);
          }}
          placeholder="Berkeley, California"
          autoComplete="off"
          autoCorrect="off"
          className="text-base font-normal placeholder:text-[var(--muted)]"
        />
      </div>
      {searching ? (
        <p className="mt-2 text-sm font-normal text-[var(--muted)]">Searching places…</p>
      ) : null}
      {searchError ? (
        <p className="mt-2 text-sm font-normal text-[var(--muted)]">
          Couldn’t load places. Check your connection and try again.
        </p>
      ) : null}
      {showList ? (
        <ul
          role="listbox"
          className="absolute left-0 right-0 z-40 mt-2 max-h-56 w-full overflow-auto rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-1 shadow-md"
        >
          {results.map((city) => (
            <li key={city.id}>
              <button
                type="button"
                className="w-full px-4 py-3 text-left text-base font-normal text-[var(--foreground)] hover:bg-[var(--surface-soft)]"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(city)}
              >
                {city.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {!value.placeId && !searching && !searchError && query.trim().length >= 2 && results.length === 0 ? (
        <p className="mt-2 text-sm font-normal text-[var(--muted)]">
          No places found. Try another spelling.
        </p>
      ) : null}
    </div>
  );
}
