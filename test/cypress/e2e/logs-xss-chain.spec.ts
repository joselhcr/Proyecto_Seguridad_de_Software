describe('PoC-LOG-03 search XSS to log exposure', () => {
  it('renders the search payload as text and rejects anonymous log access', () => {
    const payload = '<img src=x onerror="document.body.dataset.logPoc=\'executed\'">'

    cy.visit('/#/search?q=' + encodeURIComponent(payload))
    cy.get('#searchValue').should('have.text', payload)
    cy.get('#searchValue img').should('not.exist')
    cy.document().then((document) => {
      expect(document.body.dataset.logPoc).to.equal(undefined)
    })

    cy.request({ url: '/support/logs/', failOnStatusCode: false })
      .its('status')
      .should('eq', 401)
  })
})
