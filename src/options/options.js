document.addEventListener('DOMContentLoaded', function () {
  const configEditor = document.getElementById('configEditor')
  const saveButton = document.getElementById('saveButton')

  const badReposMessage = 'Invalid format. "repos" must be an array of objects or unset.'

  chrome.storage.sync.get({
    newWindow: true,
    repos: [
      {
        name: "user/repository",
        ticketPrefixes: ['DEV', 'QA'],
        jiraHost: 'https://example.atlassian.net'
      }
    ]
  }, config => {
    configEditor.value = JSON.stringify(config, null, 2)
  })

  saveButton.addEventListener('click', () => {
    let config
    try {
      const rawConfig = JSON.parse(configEditor.value)
      if (!rawConfig) {
        throw new Error('Config not set.')
      }
      if (rawConfig.hasOwnProperty('newWindow') && typeof rawConfig.newWindow !== 'boolean') {
        throw new Error('Invalid format. "newWindow" must either be unset or a boolean.')
      }
      if (rawConfig.hasOwnProperty('repos') && !Array.isArray(rawConfig.repos)) {
        throw new Error(badReposMessage)
      }
      config = {
        newWindow: rawConfig.newWindow,
        repos: rawConfig.repos
          ? rawConfig.repos.map(repo => {
            if (!repo) {
              throw new Error(badReposMessage)
            }
            if (!repo.hasOwnProperty('name') || typeof repo.name !== 'string' || !/^[^\s/]+\/[^\s/]+$/.test(repo.name)) {
              throw new Error('Invalid format. "repos[].name" must be a string that is of the format "user/repository".')
            }
            if (!repo.hasOwnProperty('ticketPrefixes') || !Array.isArray(repo.ticketPrefixes) || repo.ticketPrefixes.some(prefix => typeof prefix !== 'string')) {
              throw new Error('Invalid format. "repos[].ticketPrefixes" must be an array of strings.')
            }
            if (!repo.hasOwnProperty('jiraHost') || typeof repo.jiraHost !== 'string' || !/^https?:\/\/.*[^/]$/.test(repo.jiraHost)) {
              throw new Error('Invalid format. "repos[].jiraHost" must be a string and include the appropriate HTTP(S) protocol. For example, "https://example.atlassian.net".')
            }
            return {
              name: repo.name,
              ticketPrefixes: repo.ticketPrefixes,
              jiraHost: repo.jiraHost
            }
          })
          : []
      }
    } catch (e) {
      console.error(e)
      alert(e && e.message)
      return
    }

    chrome.storage.sync.set(config, () => {
      configEditor.value = JSON.stringify(config, null, 2)
      alert('Settings saved.')
    })
  })
})
