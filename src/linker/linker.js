(function() {
  const linkingConfigs = [
    {
      selector: '.js-issue-title',
      link: linkTicketsInPlace
    },
    {
      selector: '.commit-message code',
      link: linkTicketsAtStart
    },
    {
      selector: '.commit-title',
      link: linkTicketsAtStart
    },
    {
      selector: '.js-issue-row .col-9',
      link: linkTicketsAtStart
    },
    {
      selector: '.repository-content .message .css-truncate',
      link: linkTicketsAtStart
    },
    {
      selector: '.branch-name',
      link: linkTicketsBefore
    }
  ]

  const anchorClassName = 'jira-ticket-link'
  const linkAddedClassName = 'jira-ticket-link-added'

  const regexEscapeRegex = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g

  const getConfig = () => new Promise((resolve, reject) => {
    chrome.storage.sync.get({
      newWindow: true,
      repos: []
    }, resolve)
  })

  const getTicketUrl = (jiraHost, ticket) => `${jiraHost}/browse/${ticket}`

  const getTicketAnchor = (jiraHost, ticket, newWindow = true) => {
    const anchor = document.createElement('a')
    if (newWindow) {
      anchor.target = '_blank'
    }
    anchor.title = `Open ${ticket} in JIRA`
    anchor.className = anchorClassName
    anchor.href = getTicketUrl(jiraHost, ticket)
    anchor.textContent = ticket
    return anchor
  }

  const getTicketAnchorHtml = (jiraHost, ticket, newWindow = true) =>
    `<a${newWindow ? ' target="_blank"' : ''} class="${anchorClassName}" title="Open ${ticket} in JIRA" href="${getTicketUrl(jiraHost, ticket)}">${ticket}</a>`

  const getRepoNameFromPath = path =>
    path.split('#')[0].split('?')[0].substr(1).split('/').slice(0, 2).join('/')

  const getRepoConfig = (configs, repoName) =>
    configs.find(config => config && config.name.localeCompare(repoName, undefined, {sensitivity: 'base'}) === 0)

  const getTicketRegexes = repoConfig =>
    repoConfig.ticketPrefixes && repoConfig.ticketPrefixes.map(prefix =>
      new RegExp(`\\b(${prefix.replace(regexEscapeRegex, '\\$&')}-\\d+)\\b`, 'ig')
    )
  
  const getAnchorsForElement = (element, regexes, jiraHost, newWindow) => {
    const fragment = document.createDocumentFragment()
    const ticketSet = new Set()
    regexes.forEach(regex => {
      const tickets = element.textContent.match(regex)
      if (tickets) {
        tickets.forEach(ticket => {
          if (!ticketSet.has(ticket)) {
            ticketSet.add(ticket)
            fragment.prepend(getTicketAnchor(jiraHost, ticket, newWindow))
          }
        })
      }
    })
    return fragment
  }
  
  function linkTicketsInPlace (element, regexes, jiraHost, newWindow) {
    element.classList.add(linkAddedClassName)
    regexes.forEach(regex => {
      element.innerHTML = element.innerHTML.replace(regex, getTicketAnchorHtml(jiraHost, '$&', newWindow))
    })
  }
  
  function linkTicketsAtStart (element, regexes, jiraHost, newWindow) {
    element.classList.add(linkAddedClassName)
    element.prepend(getAnchorsForElement(element, regexes, jiraHost, newWindow))
  }
  
  function linkTicketsBefore (element, regexes, jiraHost, newWindow) {
    element.classList.add(linkAddedClassName)
    element.parentNode.insertBefore(getAnchorsForElement(element, regexes, jiraHost, newWindow), element)
  }

	function execute (config) {
    const repoName = getRepoNameFromPath(window.location.pathname)
    if (!repoName) {
      return
    }

    const repoConfig = getRepoConfig(config.repos, repoName)
    if (!repoConfig) {
      return
    }

    const ticketRegexes = getTicketRegexes(repoConfig)
    if (!ticketRegexes) {
      return
    }

    linkingConfigs.forEach(linkingConfig => {
      document.querySelectorAll(`${linkingConfig.selector}:not(.${linkAddedClassName}`).forEach(element => {
        linkingConfig.link(element, ticketRegexes, repoConfig.jiraHost, config.newWindow)
      })
    })
	}

	chrome.extension.sendMessage({}, response => {
    getConfig().then(config => {
      execute(config)
      setInterval(() => execute(config), 1000)
    })
	})
})()
