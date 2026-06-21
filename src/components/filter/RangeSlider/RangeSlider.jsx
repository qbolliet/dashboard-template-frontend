'use client';

import { useEffect, useRef, useState } from 'react';
import './RangeSlider.scss';

/**
 * Numeric slider with single value or min/max range.
 *
 * @param {boolean}  [rangeMode]  - false = single value, true = min/max range.
 * @param {number}   [min]        - Minimum allowed value (default: 0).
 * @param {number}   [max]        - Maximum allowed value (default: 100).
 * @param {number}   [step]       - Step increment (default: 1).
 * @param {boolean}  [validate]   - Enable success/error state on numeric inputs.
 * @param {number}   valueLo      - Current low value (or single value).
 * @param {number}   [valueHi]    - Current high value (rangeMode only).
 * @param {Function} onChange     - ({ value } | { min, max }) => void.
 * @param {boolean}  [disabled]
 * @returns {JSX.Element}
 */
const RangeSlider = ({
  rangeMode = false,
  min = 0,
  max = 100,
  step = 1,
  validate = false,
  valueLo,
  valueHi,
  onChange,
  disabled = false,
}) => {
  const initLo = valueLo !== undefined ? valueLo : rangeMode ? 20 : 40;
  const initHi = valueHi !== undefined ? valueHi : 80;

  // Valeurs numériques du slider
  const [lo, setLo] = useState(initLo);
  const [hi, setHi] = useState(initHi);

  // Texte affiché dans les inputs — diverge de lo/hi pendant la saisie libre
  const [inputLo, setInputLo] = useState(String(initLo));
  const [inputHi, setInputHi] = useState(String(initHi));

  // État de validation ('default' | 'success' | 'error')
  const [loState, setLoState] = useState('default');
  const [hiState, setHiState] = useState('default');

  // Thumb en cours de drag ('lo' | 'hi' | null)
  const [dragging, setDragging] = useState(null);

  const railRef = useRef(null);

  // ── Utilitaires ───────────────────────────────────────────────
  const pct = (v) => ((v - min) / (max - min)) * 100;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // Convertit un pourcentage rail → valeur snappée au step
  const fromPct = (p) => {
    const raw = min + (p / 100) * (max - min);
    return Math.round(raw / step) * step;
  };

  // ── Validation d'une valeur saisie ────────────────────────────
  const validateInput = (val, isLo) => {
    const n = parseFloat(val);
    if (Number.isNaN(n)) return 'error';
    if (n < min || n > max) return 'error';
    if (isLo && rangeMode && n > hi) return 'error';
    if (!isLo && rangeMode && n < lo) return 'error';
    return 'success';
  };

  // ── Helpers : mise à jour coordonnée valeur + texte du thumb lo ──
  const applyLo = (nv) => {
    setLo(nv);
    setInputLo(String(nv));
  };
  const applyHi = (nv) => {
    setHi(nv);
    setInputHi(String(nv));
  };

  // ── Click sur le rail — déplace le thumb le plus proche ───────
  const handleRailPointer = (e) => {
    if (disabled || !railRef.current) return;
    e.preventDefault();
    const rect = railRef.current.getBoundingClientRect();
    const p = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
    const v = clamp(fromPct(p), min, max);

    if (!rangeMode) {
      applyLo(v);
      onChange?.({ value: v });
      return;
    }

    const dLo = Math.abs(v - lo);
    const dHi = Math.abs(v - hi);
    if (dLo <= dHi) {
      const nv = Math.min(v, hi);
      applyLo(nv);
      onChange?.({ min: nv, max: hi });
    } else {
      const nv = Math.max(v, lo);
      applyHi(nv);
      onChange?.({ min: lo, max: nv });
    }
  };

  // ── Drag via Pointer Events sur window ────────────────────────
  // fromPct est inliné ici pour éviter de l'ajouter aux dépendances (elle change
  // à chaque render, ce qui déclencherait le cleanup/re-add inutilement).
  useEffect(() => {
    if (!dragging || disabled) return;

    const move = (e) => {
      if (!railRef.current) return;
      const rect = railRef.current.getBoundingClientRect();
      const p = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
      const raw = min + (p / 100) * (max - min);
      const v = clamp(Math.round(raw / step) * step, min, max);

      if (dragging === 'lo') {
        const nv = rangeMode ? Math.min(v, hi) : v;
        applyLo(nv);
        onChange?.(rangeMode ? { min: nv, max: hi } : { value: nv });
      } else {
        const nv = Math.max(v, lo);
        applyHi(nv);
        onChange?.({ min: lo, max: nv });
      }
    };

    const up = () => setDragging(null);

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [dragging, lo, hi, rangeMode, min, max, step, disabled, onChange]);

  // ── Handlers des inputs numériques ───────────────────────────
  const handleInputLo = (e) => {
    if (disabled) return;
    const raw = e.target.value;
    setInputLo(raw);
    const s = validate ? validateInput(raw, true) : 'default';
    setLoState(s);
    if (s === 'success') {
      const nv = clamp(parseFloat(raw), min, rangeMode ? hi : max);
      setLo(nv);
      onChange?.(rangeMode ? { min: nv, max: hi } : { value: nv });
    }
  };

  const handleInputHi = (e) => {
    if (disabled) return;
    const raw = e.target.value;
    setInputHi(raw);
    const s = validate ? validateInput(raw, false) : 'default';
    setHiState(s);
    if (s === 'success') {
      const nv = clamp(parseFloat(raw), lo, max);
      setHi(nv);
      onChange?.({ min: lo, max: nv });
    }
  };

  // ── Calcul du fill ────────────────────────────────────────────
  const fillLeft = rangeMode ? pct(lo) : 0;
  const fillWidth = (rangeMode ? pct(hi) : pct(lo)) - fillLeft;

  const loClass = validate && loState !== 'default' ? ` range-slider__input--${loState}` : '';
  const hiClass = validate && hiState !== 'default' ? ` range-slider__input--${hiState}` : '';

  return (
    <div className={`range-slider${disabled ? ' range-slider--disabled' : ''}`}>
      <div
        className="range-slider__track"
        ref={railRef}
        onPointerDown={handleRailPointer}
      >
        <div className="range-slider__rail" />
        <div
          className="range-slider__fill"
          style={{ left: `${fillLeft}%`, width: `${fillWidth}%` }}
        />
        <div
          className={`range-slider__thumb range-slider__thumb--lo${dragging === 'lo' ? ' range-slider__thumb--dragging' : ''}`}
          style={{ left: `${pct(lo)}%` }}
          role="slider"
          aria-valuemin={min}
          aria-valuemax={rangeMode ? hi : max}
          aria-valuenow={lo}
          aria-label={rangeMode ? 'Valeur minimale' : 'Valeur'}
          onPointerDown={(e) => { e.stopPropagation(); setDragging('lo'); }}
        />
        {rangeMode && (
          <div
            className={`range-slider__thumb range-slider__thumb--hi${dragging === 'hi' ? ' range-slider__thumb--dragging' : ''}`}
            style={{ left: `${pct(hi)}%` }}
            role="slider"
            aria-valuemin={lo}
            aria-valuemax={max}
            aria-valuenow={hi}
            aria-label="Valeur maximale"
            onPointerDown={(e) => { e.stopPropagation(); setDragging('hi'); }}
          />
        )}
      </div>

      <div className="range-slider__inputs">
        <div className="range-slider__input-group">
          <span className="range-slider__input-label">{rangeMode ? 'Min' : 'Valeur'}</span>
          <input
            className={`range-slider__input${loClass}`}
            type="number"
            value={inputLo}
            min={min}
            max={rangeMode ? hi : max}
            step={step}
            onChange={handleInputLo}
          />
        </div>
        {rangeMode && (
          <>
            <span className="range-slider__sep">—</span>
            <div className="range-slider__input-group">
              <span className="range-slider__input-label">Max</span>
              <input
                className={`range-slider__input${hiClass}`}
                type="number"
                value={inputHi}
                min={lo}
                max={max}
                step={step}
                onChange={handleInputHi}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RangeSlider;
