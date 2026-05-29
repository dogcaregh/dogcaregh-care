"use client";

import { ACCRA_AREAS } from "@/lib/geocode";

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
  return (
    <>
      <input
        type="text"
        className={INPUT_CLS}
        placeholder={placeholder}
        list={datalistId}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete="off"
      />
      <datalist id={datalistId}>
        {ACCRA_AREAS.map(a => (
          <option key={a} value={a} />
        ))}
      </datalist>
    </>
  );
}
