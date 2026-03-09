'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import type { FormQuestion, FormAnswers, DropdownOption } from '@/types/form-schema';

interface FieldProps {
  question: FormQuestion;
  value: FormAnswers[string];
  onChange: (value: FormAnswers[string]) => void;
  error?: string;
}

/** Achata a árvore para busca */
function flattenOptions(options: DropdownOption[]): DropdownOption[] {
  const flat: DropdownOption[] = [];
  function walk(nodes: DropdownOption[]) {
    for (const n of nodes) {
      flat.push(n);
      if (n.children) walk(n.children);
    }
  }
  walk(options);
  return flat;
}

export function DropdownTree({ question, value, onChange, error }: FieldProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const options = question.resolvedOptions ?? [];
  const allFlat = useMemo(() => flattenOptions(options), [options]);

  const filtered = useMemo(() => {
    if (!search.trim()) return allFlat;
    const term = search.toLowerCase();
    return allFlat.filter(
      (o) =>
        o.name.toLowerCase().includes(term) ||
        (o.completename ?? '').toLowerCase().includes(term)
    );
  }, [allFlat, search]);

  const selectedOpt = allFlat.find((o) => o.id === Number(value));

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (opt: DropdownOption) => {
    onChange(opt.id);
    setIsOpen(false);
    setSearch('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setSearch('');
  };

  const handleInputClick = () => {
    setIsOpen(true);
    // Se já tem seleção, não limpar o display
    inputRef.current?.focus();
  };

  const displayValue = selectedOpt
    ? (selectedOpt.completename ?? selectedOpt.name)
    : '';

  return (
    <div className="field-wrapper" ref={containerRef}>
      <label className="field-label">
        {question.name}
        {question.required && <span className="field-required">*</span>}
      </label>

      <div className={`combobox-trigger ${error ? 'field-error' : ''} ${isOpen ? 'combobox-open' : ''}`} onClick={handleInputClick}>
        {isOpen ? (
          <input
            ref={inputRef}
            type="text"
            className="combobox-input"
            placeholder={selectedOpt ? displayValue : 'Buscar...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        ) : (
          <span className={`combobox-display ${selectedOpt ? '' : 'combobox-placeholder'}`}>
            {selectedOpt ? displayValue : 'Selecione...'}
          </span>
        )}
        <div className="combobox-actions">
          {selectedOpt && (
            <button type="button" className="combobox-clear" onClick={handleClear} title="Limpar">
              ✕
            </button>
          )}
          <span className="combobox-chevron">{isOpen ? '▲' : '▼'}</span>
        </div>
      </div>

      {isOpen && (
        <div className="combobox-dropdown">
          {filtered.length > 0 ? (
            filtered.slice(0, 40).map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`combobox-option ${Number(value) === opt.id ? 'combobox-option-active' : ''}`}
                onClick={() => handleSelect(opt)}
              >
                <span className="combobox-option-name">{opt.name}</span>
                {opt.completename && opt.completename !== opt.name && (
                  <span className="combobox-option-path">{opt.completename}</span>
                )}
              </button>
            ))
          ) : (
            <div className="combobox-empty">Nenhum resultado para &ldquo;{search}&rdquo;</div>
          )}
          {filtered.length > 40 && (
            <div className="combobox-more">+{filtered.length - 40} resultados. Refine sua busca.</div>
          )}
        </div>
      )}
      {error && <span className="field-error-msg">{error}</span>}
    </div>
  );
}
