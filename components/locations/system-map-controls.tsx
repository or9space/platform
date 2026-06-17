"use client";

import { useRef, useState, useEffect } from "react";
import { Search, X } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MatchedItem {
  label: string;
  sublabel: string;
  onSelect: () => void;
}

interface MapControlsProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  matchedItems: MatchedItem[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MapControls({
  searchQuery,
  onSearchChange,
  matchedItems,
}: MapControlsProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const showDropdown = dropdownOpen && searchQuery.length > 0 && matchedItems.length > 0;

  return (
    <div className="mb-3">
      {/* Search bar */}
      <div ref={wrapperRef} className="relative">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              onSearchChange(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            placeholder="Search planets, moons, stations..."
            className="w-full rounded-md border border-border bg-surface py-1.5 pl-8 pr-8 text-xs text-text-primary placeholder:text-text-muted focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
          />
          {searchQuery.length > 0 && (
            <button
              onClick={() => {
                onSearchChange("");
                setDropdownOpen(false);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute z-20 mt-1 w-full rounded-md border border-border bg-surface-elevated shadow-lg max-h-48 overflow-y-auto">
            {matchedItems.map((item, i) => (
              <button
                key={i}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-surface-hover"
                onClick={() => {
                  item.onSelect();
                  setDropdownOpen(false);
                }}
              >
                <span className="font-medium text-text-primary">{item.label}</span>
                <span className="text-text-muted">{item.sublabel}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
