import './style.css'
import { messages, getCategories } from './messages.js'
import { cloudEnabled, createCloudEntry, createCloudMemory, deleteCloudEntry, deleteCloudMemory, getSharedMeetingDate, listCloudEntries, listCloudMemories, setSharedMeetingDate, subscribeToCloudChanges } from './supabase.js'

const memoryKey = 'hd-memories'
const placeKey = 'hd-places'
const dateKey = 'hd-dates'
const churchKey = 'hd-church-experiences'
const nextMeetingKey = 'hd-next-meeting'
const defaultMemories = [

  { title: 'Um lanche, uma selfie e nós dois', date: 'Uma lembrança', text: 'Um registro simples que ficou especial porque era com você.', image: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=900&q=85' },
  { title: 'Ópera de Arame', date: 'Um lugar nosso', text: 'Um passeio bonito para guardar com carinho.', image: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=900&q=85' },
  { title: 'Jardim Botânico', date: 'Um dia ao ar livre', text: 'Mais um caminho que ficou melhor porque você estava nele.', image: 'https://images.unsplash.com/photo-1504150558240-0b4fd8946624?auto=format&fit=crop&w=900&q=85' },
]

const accordionItems = [
  { image: 'https://picsum.photos/id/1015/900/1200', label: 'Canyon', link: '#memorias' },
  { image: 'https://picsum.photos/id/1018/900/1200', label: 'Ridgeline', link: '#memorias' },
  { image: 'https://picsum.photos/id/1039/900/1200', label: 'Falls', link: '#memorias' },
  { image: 'https://picsum.photos/id/1043/900/1200', label: 'Harbour', link: '#memorias' },
  { image: 'https://picsum.photos/id/1044/900/1200', label: 'Skyline', link: '#memorias' },
]

const load = (key, fallback = []) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback))
const save = (key, value) => localStorage.setItem(key, JSON.stringify(value))
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[character])
const galleryItems = () => memories.length ? memories.map((memory) => ({ image: memory.image, label: memory.title, link: '#memorias' })) : accordionItems

let memories = load(memoryKey, defaultMemories)
let places = load(placeKey)
let dates = load(dateKey)
let churchExperiences = load(churchKey)
let selectedTab = 'memories'
let selectedMessageCategory = 'triste'
let countdownTimer
let cloudStatus = cloudEnabled ? 'Conectando ao álbum compartilhado...' : 'Álbum salvo somente neste aparelho'
let nextMeetingDate = localStorage.getItem(nextMeetingKey) || ''

const formatDate = (date) => date ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(`${date}T12:00:00`)) : 'Sem data'
const renderCounter = (value) => String(Math.max(0, value)).padStart(3, '0').split('').map((digit, index) => `<span class="counter-digit" data-place="${[100, 10, 1][index]}">${digit}</span>`).join('')
const readPhoto = (file) => new Promise((resolve) => {
  if (!file) return resolve('')
  const reader = new FileReader()
  reader.onload = () => resolve(reader.result)
  reader.readAsDataURL(file)
})
const setCloudStatus = (status, type = '') => {
  cloudStatus = status
  const element = document.querySelector('#cloud-status')
  if (element) {
    element.textContent = status
    element.dataset.state = type
  }
}
const syncMemories = async () => {
  if (!cloudEnabled) return
  setCloudStatus('Sincronizando memórias...', 'loading')
  const { data, error } = await listCloudMemories()
  if (error) {
    setCloudStatus('Não foi possível sincronizar agora', 'error')
    return
  }
  memories = data
  save(memoryKey, memories)
  if (selectedTab === 'memories') renderPanel()
  setCloudStatus('Álbum compartilhado sincronizado', 'success')
}
const syncMeetingDate = async () => {
  if (!cloudEnabled) return
  const { data, error } = await getSharedMeetingDate()
  if (error) return
  nextMeetingDate = data
  if (data) localStorage.setItem(nextMeetingKey, data)
  if (selectedTab === 'countdown') renderPanel()
}
const syncCloudEntries = async () => {
  if (!cloudEnabled) return
  const [placesResult, datesResult, churchResult] = await Promise.all([
    listCloudEntries('place'),
    listCloudEntries('date'),
    listCloudEntries('church'),
  ])
  if (!placesResult.error) places = placesResult.data
  if (!datesResult.error) dates = datesResult.data
  if (!churchResult.error) churchExperiences = churchResult.data
  save(placeKey, places)
  save(dateKey, dates)
  save(churchKey, churchExperiences)
  if (selectedTab !== 'memories' && selectedTab !== 'messages') renderPanel()
}
const syncCloud = async () => {
  await Promise.all([syncMemories(), syncCloudEntries(), syncMeetingDate()])
}
const saveMeetingDate = async (date) => {
  nextMeetingDate = date
  localStorage.setItem(nextMeetingKey, date)
  if (cloudEnabled) await setSharedMeetingDate(date)
}

const renderShell = () => {
  document.querySelector('#app').innerHTML = `
    <header class="site-header">
      <a class="wordmark" href="#inicio" aria-label="Voltar ao início">H <span>+</span> D</a>
      <nav aria-label="Navegação principal"><a href="#memorias" data-tab="memories">Memórias</a><a href="#memorias" data-tab="places">Lugares</a><a href="#memorias" data-tab="dates">Datas</a><a href="#memorias" data-tab="countdown">Próximo encontro</a></nav>
      <button class="menu-button" type="button" aria-label="Abrir menu">☰</button>
    </header>
    <main>
      <section class="hero" id="inicio"><div class="hero-copy"><p class="eyebrow">Henry & Débora · desde sempre</p><h1>Todos os caminhos<br><em>me levam até você.</em></h1><p class="hero-text">Um espaço nosso para guardar cada foto, cada lugar, cada data e a saudade dos dias em que estamos longe.</p><a class="primary-link" href="#memorias">abrir nosso álbum <span>↓</span></a></div><div class="hero-photo" role="img" aria-label="Paisagem ensolarada entre árvores"></div><div class="hero-stamp">H <span>+</span> D<br><small>nossa história</small></div></section>
      <section class="memory-dashboard" id="memorias">
        <div class="dashboard-heading"><div><p class="eyebrow">Nosso álbum</p><h2>Guardar para<br><em>revisitar.</em></h2></div><p class="dashboard-intro">Acrescente novas memórias ao longo do tempo. Elas ficam salvas neste navegador e podem crescer junto com a nossa história.</p></div>
        <div class="tabs" role="tablist">
          <button class="tab active" data-tab="memories" role="tab" aria-selected="true">Memórias</button>
          <button class="tab" data-tab="places" role="tab" aria-selected="false">Lugares</button>
          <button class="tab" data-tab="dates" role="tab" aria-selected="false">Datas</button>
          <button class="tab" data-tab="church" role="tab" aria-selected="false">Igreja ICM <span>♥</span></button>
          <button class="tab countdown-tab" data-tab="countdown" role="tab" aria-selected="false">Próximo encontro <span>♥</span></button>
          <button class="tab messages-tab" data-tab="messages" role="tab" aria-selected="false">Mensagens <span>♥</span></button>
        </div>
        <div class="tab-panel" id="tab-panel"></div>
      </section>
      <section class="letter-section" id="carta"><div class="letter-decoration">✳</div><p class="eyebrow">Uma carta que fica</p><h2>Débora, você é<br><em>o meu lugar favorito.</em></h2><p class="letter-copy">Débora, eu sou completamente apaixonado por você. Gosto do seu jeito, do seu sorriso, da sua presença e de tudo o que faz você ser única para mim. Eu quero muito você na minha vida, quero viver muitos momentos ao seu lado e continuar construindo a nossa história, mesmo quando a distância tentar atrapalhar. Você é a pessoa que eu escolho, hoje e em todos os próximos capítulos.</p><blockquote>“Achei aquele a quem ama a minha alma; agarrei-me a ele e não o deixei.”<cite>Cantares 3:4</cite></blockquote><button class="reveal-button" type="button" id="reveal-letter">abrir a carta <span>→</span></button><p class="hidden-message" id="hidden-message">Com amor, Henry.</p></section>
    </main>
    <footer><span>H + D</span><span>feito com amor, para a nossa história</span><span>2026</span></footer>
  `
}

const renderMemories = () => `
  <div class="panel-head"><div><p class="eyebrow">Fotos e lembranças</p><h3>Memórias da gente</h3><p class="cloud-status" id="cloud-status" data-state="${cloudEnabled ? 'loading' : 'local'}">${cloudStatus}</p></div><button class="add-button" data-action="memory-form">+ adicionar memória</button></div>
  <div class="accordion-gallery" style="--gallery-duration: .6s; --gallery-gap: 10px; --gallery-radius: 16px;" aria-label="Galeria de memórias"><div class="gallery-panels">${galleryItems().map((item, index) => `<a class="gallery-panel${index === Math.min(2, galleryItems().length - 1) ? ' is-active' : ''}" href="${item.link}" data-gallery-index="${index}" style="background-image: url('${item.image}')"><span class="gallery-label">${escapeHtml(item.label)}</span></a>`).join('')}</div></div>
  <div class="entry-grid">${memories.map((memory, index) => `<article class="entry-card"><img src="${memory.image}" alt="${escapeHtml(memory.title)}"><div class="entry-content"><p class="entry-date">${escapeHtml(memory.date || 'Uma lembrança')}</p><h4>${escapeHtml(memory.title)}</h4><p>${escapeHtml(memory.text)}</p><button class="delete-link" data-delete="memory" data-index="${index}">remover</button></div></article>`).join('')}</div>
`

const renderPlaces = () => `
  <div class="panel-head"><div><p class="eyebrow">Passeios e destinos</p><h3>Mapa afetivo</h3></div><button class="add-button" data-action="place-form">+ adicionar lugar</button></div>
  <div class="place-list">${places.length ? places.map((place, index) => `<article class="place-row"><span class="place-number">${String(index + 1).padStart(2, '0')}</span><div><p class="entry-date">${escapeHtml(place.date || 'Um passeio')}</p><h4>${escapeHtml(place.title)}</h4><p>${escapeHtml(place.text)}</p></div><button class="delete-link" data-delete="place" data-index="${index}">remover</button></article>`).join('') : '<div class="empty-state">Ainda não há lugares aqui. O próximo pode ser o início da lista.</div>'}</div>
`

const renderDates = () => `
  <div class="panel-head"><div><p class="eyebrow">Calendário do casal</p><h3>Datas para lembrar</h3></div><button class="add-button" data-action="date-form">+ adicionar data</button></div>
  <div class="date-list">${dates.length ? dates.map((date, index) => `<article class="date-row"><div class="date-badge"><strong>${new Date(`${date.date}T12:00:00`).getDate()}</strong><span>${new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(`${date.date}T12:00:00`)).replace('.', '')}</span></div><div><h4>${escapeHtml(date.title)}</h4><p>${formatDate(date.date)}${date.text ? ` · ${escapeHtml(date.text)}` : ''}</p></div><div class="date-actions"><button class="countdown-link" data-countdown-date="${date.date}">${nextMeetingDate === date.date ? 'data atual' : 'usar no contador'}</button><button class="delete-link" data-delete="date" data-index="${index}">remover</button></div></article>`).join('') : '<div class="empty-state">Nenhuma data cadastrada ainda. Guardem aqui os próximos capítulos.</div>'}</div>
`

const renderChurchExperiences = () => `
  <div class="panel-head"><div><p class="eyebrow">Igreja Cristã Maranata</p><h3>Experiências na ICM</h3></div><button class="add-button" data-action="church-form">+ adicionar experiência</button></div>
  <div class="church-intro">Um espaço para guardar cultos, visitas, encontros, aprendizados e todos os momentos especiais que vivemos na igreja.</div>
  <div class="church-list">${churchExperiences.length ? churchExperiences.map((experience, index) => `<article class="church-row"><span class="place-number">${String(index + 1).padStart(2, '0')}</span><div><p class="entry-date">${escapeHtml(experience.date || 'Uma experiência')}</p><h4>${escapeHtml(experience.title)}</h4><p>${escapeHtml(experience.text)}</p></div><button class="delete-link" data-delete="church" data-index="${index}">remover</button></article>`).join('') : '<div class="empty-state">Ainda não há experiências registradas. O próximo momento especial pode começar aqui.</div>'}</div>
`

const renderCountdown = () => {
  const savedDate = nextMeetingDate
  const initialDate = savedDate ? new Date(`${savedDate}T00:00:00`).getTime() - Date.now() : 0
  const initialDays = initialDate > 0 ? Math.floor(initialDate / 86400000) : 0
  return `<div class="countdown-panel"><p class="eyebrow">A distância é temporária</p><h3>Quando vamos nos ver?</h3><p class="countdown-copy">Escolha uma data no calendário. Ao salvar, a contagem começa imediatamente e fica guardada neste navegador.</p><div class="counter-display"><span class="counter-caption">dias até o nosso encontro</span><div class="counter-component" id="day-counter" aria-label="Dias restantes">${renderCounter(initialDays)}</div></div><div class="countdown" id="countdown"><div><strong>--</strong><span>horas</span></div><div><strong>--</strong><span>minutos</span></div><div><strong>--</strong><span>segundos</span></div></div><form class="countdown-form" id="countdown-form"><label>Próximo encontro<input type="date" name="date" value="${savedDate}" required></label><button class="primary-button" type="submit">iniciar contagem <span>♥</span></button></form><p class="countdown-status" id="countdown-status">${savedDate ? `Contando até ${formatDate(savedDate)}` : 'Nenhuma data escolhida ainda.'}</p></div>`
}

const renderMessageCollection = (categoryId) => {
  const category = messages[categoryId]
  if (!category) return ''
  return `
    <div class="message-collection-heading">
      <span class="message-result-emoji">${category.emoji}</span>
      <div><p class="eyebrow">${escapeHtml(category.title)}</p><h4>Um textinho para você</h4></div>
    </div>
    <div class="message-list">
      ${category.messages.map((message, index) => `<article class="message-card"><span class="message-card-number">${String(index + 1).padStart(2, '0')}</span><p>${escapeHtml(message)}</p></article>`).join('')}
    </div>
  `
}

const renderMessages = () => `
  <div class="messages-panel">
    <div class="panel-head">
      <div>
        <p class="eyebrow">Um carinho para cada momento</p>
        <h3>Mensagens para ela</h3>
      </div>
    </div>

    <p class="messages-intro">
      Escolha como ela está se sentindo e encontre uma mensagem especial para esse momento. ❤️
    </p>

    <div class="message-categories">
      ${getCategories().map((category) => `
        <button
          class="message-category${selectedMessageCategory === category.id ? ' is-selected' : ''}"
          type="button"
          data-message-category="${category.id}"
        >
          <span class="message-category-emoji">${category.emoji}</span>
          <span>${category.title.replace('Quando ela estiver ', '')}</span>
        </button>
      `).join('')}
    </div>

    <div class="message-result" id="message-result">${renderMessageCollection(selectedMessageCategory)}</div>

    <button
      class="primary-button message-random-button"
      type="button"
      data-message-surprise
    >
      me surpreenda <span>♥</span>
    </button>
  </div>
`
      

const renderForm = (type) => {
  const isMemory = type === 'memory'
  const isPlace = type === 'place'
  const isChurch = type === 'church'
  const typeLabel = isMemory ? 'memória' : isPlace ? 'lembrança' : isChurch ? 'experiência na ICM' : 'data'
  const titlePlaceholder = isMemory ? 'Ex: nosso primeiro passeio' : isPlace ? 'Ex: Parque Barigui' : isChurch ? 'Ex: nosso primeiro culto juntos' : 'Ex: nosso aniversário'
  const textLabel = isPlace ? 'O que vocês viveram?' : isChurch ? 'Como foi esse momento?' : 'Uma frase sobre esse momento'
  return `<form class="entry-form" id="entry-form" data-type="${type}"><div class="form-title"><p class="eyebrow">Nova ${typeLabel}</p><button type="button" class="close-form" data-action="close-form">×</button></div><label>Nome ou título<input name="title" placeholder="${titlePlaceholder}" required></label><label>Data<input type="date" name="date"></label><label>${textLabel}<textarea name="text" rows="5" placeholder="Escreva o que vocês viveram..."></textarea></label>${isMemory ? '<label class="file-label">Adicionar foto<input type="file" name="image" accept="image/*"><span class="file-hint">Escolher uma foto do celular</span></label>' : ''}<button class="primary-button" type="submit">guardar ${typeLabel} <span>+</span></button></form>`
}

const renderPanel = () => {
  const panel = document.querySelector('#tab-panel')

  panel.innerHTML =
    selectedTab === 'memories'
      ? renderMemories()
      : selectedTab === 'places'
        ? renderPlaces()
        : selectedTab === 'dates'
          ? renderDates()
          : selectedTab === 'church'
            ? renderChurchExperiences()
          : selectedTab === 'countdown'
            ? renderCountdown()
            : renderMessages()

  if (selectedTab === 'memories') bindAccordionGallery()
  if (selectedTab === 'countdown') startCountdown()
}

const bindAccordionGallery = () => {
  const gallery = document.querySelector('.accordion-gallery')
  if (!gallery) return
  const panels = gallery.querySelectorAll('.gallery-panel')
  const activatePanel = (panel) => {
    panels.forEach((item) => item.classList.toggle('is-active', item === panel))
  }
  panels.forEach((panel) => {
    panel.addEventListener('mouseenter', () => activatePanel(panel))
    panel.addEventListener('mousemove', (event) => {
      const bounds = panel.getBoundingClientRect()
      const x = ((event.clientX - bounds.left) / bounds.width - .5) * 2
      const y = ((event.clientY - bounds.top) / bounds.height - .5) * 2
      panel.style.setProperty('--tilt-x', `${y * -8}deg`)
      panel.style.setProperty('--tilt-y', `${x * 8}deg`)
      panel.style.setProperty('--parallax-x', `${x * 12}px`)
      panel.style.setProperty('--parallax-y', `${y * 12}px`)
    })
    panel.addEventListener('mouseleave', () => {
      panel.style.setProperty('--tilt-x', '0deg')
      panel.style.setProperty('--tilt-y', '0deg')
      panel.style.setProperty('--parallax-x', '0px')
      panel.style.setProperty('--parallax-y', '0px')
    })
  })
}

const startCountdown = () => {
  clearInterval(countdownTimer)
  const target = nextMeetingDate
  const countdown = document.querySelector('#countdown')
  const status = document.querySelector('#countdown-status')
  if (!countdown || !target) return
  const update = () => {
    const distance = new Date(`${target}T00:00:00`).getTime() - Date.now()
    if (distance <= 0) {
      countdown.innerHTML = '<p class="reunion-message">Hoje é o nosso dia. Aproveitem cada segundo. ♥</p>'
      status.textContent = 'A data chegou.'
      clearInterval(countdownTimer)
      return
    }
    const values = [Math.floor(distance / 86400000), Math.floor(distance / 3600000) % 24, Math.floor(distance / 60000) % 60, Math.floor(distance / 1000) % 60]
    document.querySelector('#day-counter').innerHTML = renderCounter(values[0])
    countdown.querySelectorAll('strong').forEach((item, index) => { item.textContent = String(values[index + 1]).padStart(2, '0') })
    status.textContent = `Contando até ${formatDate(target)}`
  }
  update()
  countdownTimer = setInterval(update, 1000)
}

renderShell()
renderPanel()
syncCloud()
subscribeToCloudChanges(syncCloud)

document.addEventListener('click', async (event) => {
  const tab = event.target.closest('[data-tab]')
  if (tab) {
    selectedTab = tab.dataset.tab
    const activeTab = document.querySelector(`.tab[data-tab="${selectedTab}"]`)
    document.querySelectorAll('.tab').forEach((item) => {
      const isActive = item === activeTab
      item.classList.toggle('active', isActive)
      item.setAttribute('aria-selected', String(isActive))
    })
    renderPanel()
    document.querySelector('.site-header').classList.remove('menu-open')
    return
  }
  const action = event.target.closest('[data-action]')?.dataset.action
  if (action === 'memory-form' || action === 'place-form' || action === 'date-form' || action === 'church-form') {
    document.querySelector('#tab-panel').innerHTML = renderForm(action.replace('-form', ''))
  }
  if (action === 'close-form') renderPanel()
  const countdownDateButton = event.target.closest('[data-countdown-date]')
  if (countdownDateButton) {
    await saveMeetingDate(countdownDateButton.dataset.countdownDate)
    selectedTab = 'countdown'
    document.querySelectorAll('.tab').forEach((item) => item.classList.toggle('active', item.dataset.tab === selectedTab))
    renderPanel()
    document.querySelector('#memorias').scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }  const messageCategory = event.target.closest('[data-message-category]')

  if (messageCategory) {
    const category = messageCategory.dataset.messageCategory
    selectedMessageCategory = category

    const result = document.querySelector('#message-result')

    if (result) {
      result.innerHTML = renderMessageCollection(selectedMessageCategory)
    }

    return
  }

  const surpriseButton = event.target.closest('[data-message-surprise]')

  if (surpriseButton) {
    const categories = getCategories()
    const randomCategory =
      categories[Math.floor(Math.random() * categories.length)]

    selectedMessageCategory = randomCategory.id
    const result = document.querySelector('#message-result')

    if (result) {
      result.innerHTML = renderMessageCollection(selectedMessageCategory)
    }

    return
  }
  const deleteButton = event.target.closest('[data-delete]')
  if (deleteButton && window.confirm('Remover este item da sua história?')) {
    const collection = deleteButton.dataset.delete === 'memory' ? memories : deleteButton.dataset.delete === 'place' ? places : deleteButton.dataset.delete === 'church' ? churchExperiences : dates
    const index = Number(deleteButton.dataset.index)
    const removedItem = collection[index]
    if (cloudEnabled && removedItem?.id) {
      const { error } = deleteButton.dataset.delete === 'memory'
        ? await deleteCloudMemory(removedItem)
        : await deleteCloudEntry(removedItem)
      if (error) {
        setCloudStatus('Não foi possível remover este item', 'error')
        return
      }
    }
    collection.splice(index, 1)
    save(deleteButton.dataset.delete === 'memory' ? memoryKey : deleteButton.dataset.delete === 'place' ? placeKey : deleteButton.dataset.delete === 'church' ? churchKey : dateKey, collection)
    renderPanel()
  }
})

document.addEventListener('submit', async (event) => {
  if (event.target.id === 'countdown-form') {
    event.preventDefault()
    const date = new FormData(event.target).get('date')
    await saveMeetingDate(date)
    renderPanel()
    return
  }
  if (event.target.id !== 'entry-form') return
  event.preventDefault()
  const form = event.target
  const data = new FormData(form)
  const type = form.dataset.type
  const entry = { title: data.get('title'), date: data.get('date'), text: data.get('text') }
  const selectedFile = data.get('image')
  if (type === 'memory' && cloudEnabled && selectedFile?.size) {
    setCloudStatus('Enviando foto para o álbum...', 'loading')
    const { data: cloudMemory, error } = await createCloudMemory({ ...entry, file: selectedFile })
    if (error) {
      setCloudStatus('Falha no envio; memória ficou somente neste aparelho', 'error')
      entry.image = await readPhoto(selectedFile)
    } else {
      memories.unshift(cloudMemory)
      save(memoryKey, memories)
      setCloudStatus('Foto sincronizada com o álbum', 'success')
      renderPanel()
      return
    }
  }
  if (type !== 'memory' && cloudEnabled) {
    const { data: cloudEntry, error } = await createCloudEntry({ ...entry, type })
    if (!error) {
      const collection = type === 'place' ? places : type === 'church' ? churchExperiences : dates
      collection.unshift(cloudEntry)
      save(type === 'place' ? placeKey : type === 'church' ? churchKey : dateKey, collection)
      if (type === 'date' && entry.date) await saveMeetingDate(entry.date)
      renderPanel()
      return
    }
  }
  if (type === 'memory') entry.image = entry.image || await readPhoto(selectedFile) || 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?auto=format&fit=crop&w=900&q=85'
  const collection = type === 'memory' ? memories : type === 'place' ? places : type === 'church' ? churchExperiences : dates
  collection.unshift(entry)
  save(type === 'memory' ? memoryKey : type === 'place' ? placeKey : type === 'church' ? churchKey : dateKey, collection)
  if (type === 'date' && entry.date) {
    await saveMeetingDate(entry.date)
    selectedTab = 'countdown'
    document.querySelectorAll('.tab').forEach((item) => item.classList.toggle('active', item.dataset.tab === selectedTab))
  }
  renderPanel()
})

document.querySelector('#reveal-letter').addEventListener('click', (event) => {
  const message = document.querySelector('#hidden-message')
  message.classList.toggle('visible')
  event.currentTarget.querySelector('span').textContent = message.classList.contains('visible') ? '♥' : '→'
})

document.querySelector('.menu-button').addEventListener('click', () => {
  document.querySelector('.site-header').classList.toggle('menu-open')
})
