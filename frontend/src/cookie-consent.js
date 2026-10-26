/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */

/* Loaded as a bundled script instead of inline in index.html, so the Content Security Policy can forbid inline scripts */
window.addEventListener('load', function () {
  window.cookieconsent.initialise({
    palette: {
      popup: { background: 'var(--theme-primary)', text: 'var(--theme-text)' },
      button: { background: 'var(--theme-accent)', text: 'var(--theme-text)' }
    },
    theme: 'classic',
    position: 'bottom-right',
    content: { message: 'This website uses fruit cookies to ensure you get the juiciest tracking experience.', dismiss: 'Me want it!', link: 'But me wait!', href: 'https://www.youtube.com/watch?v=9PnbKL3wuH4' }
  })
})
