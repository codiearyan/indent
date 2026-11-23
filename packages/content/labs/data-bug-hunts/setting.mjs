// Loaded before learner code with --import. Makes the computer's language the one the check chose,
// on every system: some systems ignore LANG, so a comparison that names no language would
// otherwise follow whatever the learner's computer is set to.
const chosen = process.env.INDENT_LOCALE

if (chosen) {
  const unnamed = (locales) =>
    locales === undefined || (Array.isArray(locales) && locales.length === 0)
  const pick = (locales) => (unnamed(locales) ? chosen : locales)

  const RealCollator = Intl.Collator
  function Collator(locales, options) {
    return new RealCollator(pick(locales), options)
  }
  Collator.prototype = RealCollator.prototype
  Collator.supportedLocalesOf = RealCollator.supportedLocalesOf.bind(RealCollator)
  Intl.Collator = Collator

  const realCompare = String.prototype.localeCompare
  String.prototype.localeCompare = function localeCompare(that, locales, options) {
    return realCompare.call(this, that, pick(locales), options)
  }
}
