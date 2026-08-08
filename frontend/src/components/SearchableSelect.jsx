import { useState } from "react";
import Icon from "./Icon";

export default function SearchableSelect({ label, onChange, options, placeholder, value }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((option) => option.value === value);
  const inputValue = isOpen ? query : selectedOption?.label || "";
  const filteredOptions = options.filter((option) =>
    option.label
      .toLocaleLowerCase("tr")
      .includes(query.toLocaleLowerCase("tr")),
  );
  const hasValue = Boolean(value || query);

  return (
    <div className="searchable-select">
      <label>{label}</label>
      <div className="searchable-select-control">
        <Icon name="search" />
        <input
          aria-expanded={isOpen}
          aria-label={`${label} ara ve seç`}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 140)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setQuery("");
            setIsOpen(true);
          }}
          placeholder={selectedOption?.label || placeholder}
          value={inputValue}
        />
        {hasValue ? (
          <button
            aria-label={`${label} seçimini temizle`}
            className="clear-search-button"
            onClick={() => {
              onChange("");
              setQuery("");
              setIsOpen(false);
            }}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            <Icon name="close" />
          </button>
        ) : (
          <Icon name="expand_more" />
        )}
      </div>
      <input readOnly required type="hidden" value={value} />
      {isOpen && (
        <div className="searchable-select-options" role="listbox">
          {filteredOptions.length ? (
            filteredOptions.map((option) => (
              <button
                className={option.value === value ? "active" : ""}
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setQuery("");
                  setIsOpen(false);
                }}
                onMouseDown={(event) => event.preventDefault()}
                type="button"
              >
                {option.label}
              </button>
            ))
          ) : (
            <div className="searchable-select-empty">Sonuç bulunamadı.</div>
          )}
        </div>
      )}
    </div>
  );
}
