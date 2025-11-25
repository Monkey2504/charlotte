
/**
 * Utilitaire pour combiner les noms de classes conditionnellement.
 * C'est une version légère et sans dépendance de la librairie populaire 'clsx' ou 'classnames'.
 * 
 * Usage:
 * cn('base-class', condition && 'active-class', 'always-present')
 * => "base-class active-class always-present"
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
