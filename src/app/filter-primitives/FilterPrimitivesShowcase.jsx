'use client'

import { useState } from 'react'
import SelectMenu from '../../components/filter/SelectMenu/SelectMenu'
import TypeAwareInput from '../../components/filter/TypeAwareInput/TypeAwareInput'
import RangeSlider from '../../components/filter/RangeSlider/RangeSlider'
import Tooltip from '../../components/filter/Tooltip/Tooltip'
import styles from './FilterPrimitivesShowcase.module.scss'

// ── Sous-composants de mise en page ──────────────────────────────

function ShowcaseSection({ title, children }) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.row}>{children}</div>
    </section>
  )
}

function ShowcaseCell({ label, children }) {
  return (
    <div className={styles.cell}>
      <span className={styles.cellLabel}>{label}</span>
      {children}
    </div>
  )
}

// ── Showcase principal ────────────────────────────────────────────

const FilterPrimitivesShowcase = () => {
  // État des SelectMenu (composants contrôlés)
  const [selSingle, setSelSingle] = useState([])
  const [selMulti, setSelMulti] = useState([])
  const [selSingleGrouped, setSelSingleGrouped] = useState([])
  const [selMultiGrouped, setSelMultiGrouped] = useState([])

  // État des TypeAwareInput (composants contrôlés)
  const [valText, setValText] = useState('')
  const [valInt, setValInt] = useState('')
  const [valFloat, setValFloat] = useState('')
  const [valDate, setValDate] = useState('')
  const [valDateRange, setValDateRange] = useState('')

  return (
    <>
      {/* ── Tooltip ─────────────────────────────────────────────── */}
      <ShowcaseSection title="Tooltip">
        <ShowcaseCell label="Top">
          <Tooltip content="Texte d'info" position="top">
            <span className={styles.tooltipDemo}>Survoler</span>
          </Tooltip>
        </ShowcaseCell>

        <ShowcaseCell label="Bottom">
          <Tooltip content="Texte d'info" position="bottom">
            <span className={styles.tooltipDemo}>Survoler</span>
          </Tooltip>
        </ShowcaseCell>

        <ShowcaseCell label="Left">
          <Tooltip content="Texte d'info" position="left">
            <span className={styles.tooltipDemo}>Survoler</span>
          </Tooltip>
        </ShowcaseCell>

        <ShowcaseCell label="Right">
          <Tooltip content="Texte d'info" position="right">
            <span className={styles.tooltipDemo}>Survoler</span>
          </Tooltip>
        </ShowcaseCell>
      </ShowcaseSection>

      {/* ── Select Menu ─────────────────────────────────────────── */}
      <ShowcaseSection title="Select Menu">
        <ShowcaseCell label="Sélection unique · simple">
          <SelectMenu
            fieldName="demo"
            allowMulti={false}
            grouped={false}
            value={selSingle}
            onChange={setSelSingle}
          />
        </ShowcaseCell>

        <ShowcaseCell label="Multi-sélection · simple">
          <SelectMenu
            fieldName="demo"
            allowMulti={true}
            grouped={false}
            value={selMulti}
            onChange={setSelMulti}
          />
        </ShowcaseCell>

        <ShowcaseCell label="Sélection unique · groupée">
          <SelectMenu
            fieldName="demo"
            allowMulti={false}
            grouped={true}
            value={selSingleGrouped}
            onChange={setSelSingleGrouped}
          />
        </ShowcaseCell>

        <ShowcaseCell label="Multi-sélection · groupée">
          <SelectMenu
            fieldName="demo"
            allowMulti={true}
            grouped={true}
            value={selMultiGrouped}
            onChange={setSelMultiGrouped}
          />
        </ShowcaseCell>

        <ShowcaseCell label="Désactivé">
          <SelectMenu
            fieldName="demo"
            allowMulti={false}
            grouped={false}
            disabled={true}
            value={[{ value: 'fr', label: 'France' }]}
            onChange={() => {}}
          />
        </ShowcaseCell>
      </ShowcaseSection>

      {/* ── Type-Aware Input ─────────────────────────────────────── */}
      <ShowcaseSection title="Type-Aware Input">
        <ShowcaseCell label="Texte">
          <TypeAwareInput
            inputType="text"
            value={valText}
            onChange={setValText}
          />
        </ShowcaseCell>

        <ShowcaseCell label="Entier · validation">
          <TypeAwareInput
            inputType="integer"
            validate={true}
            value={valInt}
            onChange={setValInt}
          />
        </ShowcaseCell>

        <ShowcaseCell label="Décimal · validation">
          <TypeAwareInput
            inputType="float"
            validate={true}
            value={valFloat}
            onChange={setValFloat}
          />
        </ShowcaseCell>

        <ShowcaseCell label="Date">
          <TypeAwareInput
            inputType="date"
            dateMode="single"
            validate={true}
            value={valDate}
            onChange={setValDate}
          />
        </ShowcaseCell>

        <ShowcaseCell label="Plage de dates">
          <TypeAwareInput
            inputType="date"
            dateMode="range"
            validate={true}
            value={valDateRange}
            onChange={setValDateRange}
          />
        </ShowcaseCell>
      </ShowcaseSection>

      {/* ── Range Slider ─────────────────────────────────────────── */}
      <ShowcaseSection title="Range Slider">
        <ShowcaseCell label="Valeur unique">
          <RangeSlider rangeMode={false} />
        </ShowcaseCell>

        <ShowcaseCell label="Intervalle">
          <RangeSlider rangeMode={true} />
        </ShowcaseCell>

        <ShowcaseCell label="Intervalle · validation">
          <RangeSlider rangeMode={true} validate={true} />
        </ShowcaseCell>
      </ShowcaseSection>
    </>
  )
}

export default FilterPrimitivesShowcase
