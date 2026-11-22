// Tasks, in order:
// 1. In src/main.jsx, put App on the screen.
// 2. Below App, write the OpeningHours component.
// 3. Show OpeningHours in App, under the heading.
// 4. Below OpeningHours, write the FooterLines component and show it in the footer.

export function App() {
  return (
    <div className="screen">
      <h1>Coalbrook Tram Museum</h1>
      <OpeningHours />
      <footer className="footer">
        <FooterLines />
      </footer>
    </div>
  )
}

export function OpeningHours() {
  return (
    <section className="hours">
      <h2>Opening hours</h2>
      <p>Every day, 10:00 to 16:00</p>
    </section>
  )
}

export function FooterLines() {
  return (
    <>
      <p>Foundry Lane, Coalbrook</p>
      <p>Run by volunteers since 1987</p>
    </>
  )
}
