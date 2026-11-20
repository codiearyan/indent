// Added by the checks in front of the page's own scripts. It notes what #board-status showed
// at the moment the page's fetch answered, before the page's code saw the answer.
;(function () {
  var real = window.fetch
  window.__statusSeen = []
  function note() {
    var status = document.querySelector('#board-status')
    window.__statusSeen.push(
      status
        ? {
            text: status.textContent.replace(/\s+/g, ' ').trim(),
            hidden: !!status.closest('[hidden]') || status.style.display === 'none'
          }
        : null
    )
  }
  window.fetch = function () {
    return Promise.resolve(real.apply(this, arguments)).then(
      function (response) {
        note()
        return response
      },
      function (error) {
        note()
        throw error
      }
    )
  }
})()
