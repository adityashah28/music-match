"use client";

import { useEffect, useId, useState } from "react";
import { searchCities } from "@/lib/client";

export type CityValue = {
  city: string;
  label: string;
  lat: number | null;
  lng: number | null;
  placeId: string | null;
};

type Props = {
  value: CityValue;
  onChange: (value: CityValue) => void;
  label?: string;
};

export function CityAutocomplete({ value, onChange, label = "City" }: Props) {
  const listId = useId();
  const [query, setQuery] = useState(value.label || value.city);
  const [results, setResults] = useState<
    Array<{ id: string; label: string; city: string; lat: number; lng: number }>
  >([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setQuery(value.label || value.city);
  }, [value.label, value.city]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    // Already registered this exact pick — don't keep searching.
    if (value.placeId && (q === value.label || q === value.city)) {
      setResults([]);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      searchCities(q)
        .then((found) => {
          if (cancelled) return;
          setResults(found);
          setOpen(true);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, value.city, value.label, value.placeId]);

  function pick(city: { id: string; label: string; city: string; lat: number; lng: number }) {
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
  }

  return (
    <div className="relative">
      <label className="mt-5 block text-sm font-normal text-[var(--muted)]" htmlFor={listId}>
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
            setOpen(true);
          }}
          onFocus={() => {
            if (results.length) setOpen(true);
          }}
          onBlur={() => {
            // Delay so a click on a suggestion still registers.
            window.setTimeout(() => setOpen(false), 120);
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
      {open && results.length > 0 ? (
        <ul
          role="listbox"
          className="absolute z-30 mt-2 max-h-56 w-full overflow-auto border border-[var(--border)] bg-[var(--surface)] py-1 shadow-sm"
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
      {value.placeId ? (
        <p className="mt-2 text-sm font-normal text-[var(--muted)]">Saved place.</p>
      ) : query.trim().length >= 2 ? (
        <p className="mt-2 text-sm font-normal text-[var(--muted)]">Pick a place from the list.</p>
      ) : null}
    </div>
  );
}
