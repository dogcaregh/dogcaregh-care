"use client";

import { useEffect, useRef, useState } from "react";

// Minimal type shim — avoids needing @types/google.maps
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google: any;
    __gm_cb?: () => void;
  }
}

const ACCRA_AREAS = [
  "Achimota", "Adenta", "Airport Residential", "Cantonments", "Dansoman",
  "Dome", "Dzorwulu", "East Legon", "Haatso", "Kasoa", "Kotobabi",
  "Labone", "Lapaz", "Legon", "Madina", "Nima", "North Kaneshie",
  "Osu", "Roman Ridge", "Sakumono", "Spintex", "Tema", "Tesano",
  "Teshie", "Trasacco Valley",
];

const MAP_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

const INPUT_CLS =
  "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-[#00b096] focus:bg-white focus:ring-2 focus:ring-[#00b096]/20 placeholder-gray-400";

export function LocationPicker({
  value,
  onChange,
  placeholder = "e.g. East Legon",
  datalistId = "location-areas",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  datalistId?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [apiReady, setApiReady] = useState(false);
  // mapLocation is only set when the user picks from autocomplete (or on mount with existing value)
  const [mapLocation, setMapLocation] = useState(value);

  // Load Google Maps Places script once per page
  useEffect(() => {
    if (!MAP_KEY) return;

    if (window.google?.maps?.places) {
      setApiReady(true);
      return;
    }

    if (!document.getElementById("__gm_places_api")) {
      window.__gm_cb = () => setApiReady(true);
      const s = document.createElement("script");
      s.id = "__gm_places_api";
      s.src = `https://maps.googleapis.com/maps/api/js?key=${MAP_KEY}&libraries=places&callback=__gm_cb`;
      s.async = true;
      document.head.appendChild(s);
    } else {
      // Script already in DOM — poll until google.maps is ready
      const timer = setInterval(() => {
        if (window.google?.maps?.places) {
          clearInterval(timer);
          setApiReady(true);
        }
      }, 80);
      return () => clearInterval(timer);
    }
  }, []);

  // Attach Autocomplete widget after API is ready
  useEffect(() => {
    if (!apiReady || !inputRef.current) return;

    // Set initial value (editing existing profile)
    if (value && !inputRef.current.value) {
      inputRef.current.value = value;
    }

    const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "gh" },
      fields: ["name", "formatted_address"],
    });

    const listener = window.google.maps.event.addListener(ac, "place_changed", () => {
      const place = ac.getPlace();
      const picked = place.name ?? place.formatted_address ?? inputRef.current?.value ?? "";
      onChange(picked);
      setMapLocation(picked);
    });

    return () => window.google.maps.event.removeListener(listener);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiReady]);

  // Keep mapLocation in sync when value is updated externally (e.g. initial data load)
  useEffect(() => {
    if (value && !mapLocation) setMapLocation(value);
  }, [value, mapLocation]);

  const mapSrc =
    MAP_KEY && mapLocation
      ? `https://www.google.com/maps/embed/v1/place?key=${MAP_KEY}&q=${encodeURIComponent(mapLocation + ", Accra, Ghana")}&zoom=14`
      : null;

  return (
    <div>
      {MAP_KEY ? (
        <input
          ref={inputRef}
          type="text"
          className={INPUT_CLS}
          placeholder={placeholder}
          defaultValue={value}
          onChange={e => onChange(e.target.value)}
        />
      ) : (
        <>
          <input
            type="text"
            className={INPUT_CLS}
            placeholder={placeholder}
            list={datalistId}
            value={value}
            onChange={e => onChange(e.target.value)}
          />
          <datalist id={datalistId}>
            {ACCRA_AREAS.map(a => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </>
      )}

      {mapSrc && (
        <div className="mt-2 overflow-hidden rounded-xl border border-gray-100 shadow-sm">
          <iframe
            src={mapSrc}
            width="100%"
            height="160"
            style={{ border: 0, display: "block" }}
            allowFullScreen={false}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Location map"
          />
        </div>
      )}
    </div>
  );
}
