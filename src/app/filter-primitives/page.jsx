import styles from './page.module.scss'
import FilterPrimitivesShowcase from './FilterPrimitivesShowcase'

export const metadata = {
  title: 'Filter Primitives — Showcase',
  description: 'Primitives de saisie pour les critères de filtre',
}

export default function FilterPrimitivesPage() {
  return (
    <main className={styles.page}>
      <hgroup className={styles.pageHeader}>
        <h1 className={styles.title}>Criterion Components</h1>
        <p className={styles.subtitle}>
          Primitives de saisie pour les critères de filtre.
        </p>
      </hgroup>
      <FilterPrimitivesShowcase />
    </main>
  )
}
