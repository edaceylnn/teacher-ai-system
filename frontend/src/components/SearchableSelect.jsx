import { useEffect, useId, useRef, useState } from "react";
import Icon from "./Icon";

export default function SearchableSelect({ label, onChange, options, placeholder, value }) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const optionRefs = useRef([]);
  const optionIdPrefix = useId();
  const selectedOption = options.find((option) => option.value === value);
  const inputValue = isOpen ? query : selectedOption?.label || "";
  const filteredOptions = options.filter((option) =>
    option.label
      .toLocaleLowerCase("tr")
      .includes(query.toLocaleLowerCase("tr")),
  );
  const hasValue = Boolean(value || query);
  const highlightedOption =
    highlightedIndex >= 0 ? filteredOptions[highlightedIndex] : undefined;

  useEffect(() => {
    optionRefs.current[highlightedIndex]?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  const openDropdown = () => {
    setQuery("");
    setIsOpen(true);
    setHighlightedIndex(options.findIndex((option) => option.value === value));
  };

  const selectOption = (option) => {
    onChange(option.value);
    setQuery("");
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (event) => {
    if (!isOpen) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        openDropdown();
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((index) =>
        Math.min(index + 1, filteredOptions.length - 1),
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      if (highlightedOption) {
        event.preventDefault();
        selectOption(highlightedOption);
      }
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setHighlightedIndex(-1);
    }
  };

  return (
    <div className="searchable-select">
      <label>{label}</label>
      <div className="searchable-select-control">
        <Icon name="search" />
        <input
          aria-activedescendant={
            highlightedOption ? `${optionIdPrefix}-${highlightedOption.value}` : undefined
          }
          aria-expanded={isOpen}
          aria-label={`${label} ara ve seç`}
          onBlur={() => window.setTimeout(() => setIsOpen(false), 140)}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
            setHighlightedIndex(0);
          }}
          onFocus={openDropdown}
          onKeyDown={handleKeyDown}
          placeholder={selectedOption?.label || placeholder}
          role="combobox"
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
            filteredOptions.map((option, index) => (
              <button
                aria-selected={option.value === value}
                className={[
                  option.value === value ? "active" : "",
                  index === highlightedIndex ? "highlighted" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                id={`${optionIdPrefix}-${option.value}`}
                key={option.value}
                onClick={() => selectOption(option)}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setHighlightedIndex(index)}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                role="option"
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
