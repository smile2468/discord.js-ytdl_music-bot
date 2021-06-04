const fetch = require('node-fetch')
const cheerio = require('cheerio')
const cron = require('node-cron')

/**
    발라드: https://music.bugs.co.kr/genre/chart/kpop/ballad/total/day
    댄스/팝: https://music.bugs.co.kr/genre/chart/kpop/dance/total/day
    포크/어쿠스틱: https://music.bugs.co.kr/genre/chart/kpop/folk/total/day
    아이돌: https://music.bugs.co.kr/genre/chart/kpop/idol/total/day
    랩/힙합: https://music.bugs.co.kr/genre/chart/kpop/rnh/total/day
    알앤비/소울: https://music.bugs.co.kr/genre/chart/kpop/rns/total/day
    일렉트로닉: https://music.bugs.co.kr/genre/chart/kpop/elec/total/day
    락/메탈: https://music.bugs.co.kr/genre/chart/kpop/rock/total/day
    재즈: https://music.bugs.co.kr/genre/chart/kpop/jazz/total/day
    인디: https://music.bugs.co.kr/genre/chart/kpop/indie/total/day
 */

class BugsParser {
  constructor (client) {
    this.client = client
    this.GenreChartLinks = { KPOP: new Map(), POP: new Map(), ETC: new Map() }
    this.GenreChartMusics = {
      Daily: { KPOP: new Map(), POP: new Map(), ETC: new Map() },
      Week: { KPOP: new Map(), POP: new Map(), ETC: new Map() }
    }
    this.GenreCharts = { KPOP: [], POP: [], ETC: [] }
    this.ChartMusics = { Daily: null, Week: null }
    this.defaultMainPage = 'https://music.bugs.co.kr'
    this.defaultChartUrl = 'https://music.bugs.co.kr/chart'
    this.defaultGenreUrl = 'https://music.bugs.co.kr/genre/home'
    this.bugsChartUrl = (daily = true) => `https://music.bugs.co.kr/chart/track/${daily ? 'day' : 'week'}/total`
    this.bugsGenreChartUrl = (daily = true) => `https://music.bugs.co.kr/genre/chart/{Chart}/{Genre}/total/${daily ? 'day' : 'week'}`
    this.classPrefix = '[BugsParser'
    this.defaultPrefix = {
      init: `${this.classPrefix}:Init]`,
      getGenreChartLinks: `${this.classPrefix}:GetGenreChartLinks]`,
      getGenreChartMusics: `${this.classPrefix}:GetGenreChartMusics]`,
      getChartMusics: `${this.classPrefix}:GetChartMusics]`,
      autoUpdater: `${this.classPrefix}:AutoUpdater]`
    }
    this.autoUpdaterScheduler = null
    this.initialized = false
  }

  async init (reInitialized = false) {
    this.client.logger.debug(`${this.defaultPrefix.init} Initializing...`)
    if (this.initialized && !reInitialized) {
      this.client.logger.warn(`${this.defaultPrefix.init} Already Initialized!`)
      return false
    }
    await this.getChartMusics()
    await this.getGenreChartLinks()
    await this.getGenreChartMusics()
    await this.autoUpdater()
    this.initialized = true
  }

  async autoUpdater () {
    this.client.logger.debug(`${this.defaultPrefix.autoUpdater} Initialized to BugsChart AutoUpdater!`)
    this.autoUpdaterScheduler = cron.schedule('0 0 * * *', async () => {
      const nowDate = new Date()
      this.client.logger.verbose(`${this.defaultPrefix.autoUpdater} BugsChart list will be updated now! (${nowDate.getFullYear()}-${nowDate.getMonth()}-${nowDate.getDate() + 1} ${nowDate.getHours()}:${nowDate.getMinutes()}:${nowDate.getSeconds()})`)
      await this.getChartMusics()
      await this.getGenreChartMusics()
    })
  }

  async getChartMusics (daily = true) {
    const isDaily = daily ? 'Daily' : 'Week'
    this.client.logger.debug(`${this.defaultPrefix.getChartMusics} Loading Chart to ${isDaily} Musics...`)
    const result = await this.getChartTableToMusics(daily, this.bugsChartUrl(daily))
    this.client.logger.info(`${this.defaultPrefix.getChartMusics} Successfully Loaded Chart to ${isDaily} Musics!`)
    this.ChartMusics[isDaily] = result
    if (daily) return this.getChartMusics(false)
  }

  async getGenreChartLinks () {
    this.client.logger.debug(`${this.defaultPrefix.getGenreChartLinks} Loading Genre Chart Links...`)
    const fetched = await fetch(this.defaultGenreUrl).then(el => el.text())
    const $ = cheerio.load(fetched)
    const getKpop = $('#container > section > div > ul > li:nth-child(1) > ul > li > a').toArray()
    const getPop = $('#container > section > div > ul > li:nth-child(2) > ul > li > a').toArray()
    const getEtc = $('#container > section > div > ul > li:nth-child(3) > ul > li > a').toArray()
    for (const element of getKpop) {
      const genre = this.parseUrlInGenreName('kpop', element.attribs.href)
      this.GenreChartLinks.KPOP.set(genre, { koName: element.children[0].data, url: element.attribs.href })
      this.GenreCharts.KPOP.push({ en: genre, ko: element.children[0].data })
    }
    for (const element of getPop) {
      const genre = this.parseUrlInGenreName('pop', element.attribs.href)
      this.GenreChartLinks.POP.set(genre, { koName: element.children[0].data, url: element.attribs.href })
      this.GenreCharts.POP.push({ en: genre, ko: element.children[0].data })
    }
    for (const element of getEtc) {
      const genre = this.parseUrlInGenreName('etc', element.attribs.href)
      this.GenreChartLinks.ETC.set(genre, { koName: element.children[0].data, url: element.attribs.href })
      this.GenreCharts.ETC.push({ en: genre, ko: element.children[0].data })
    }
    this.client.logger.info(`${this.defaultPrefix.getGenreChartLinks} Successfully Loaded Genre Chart Links!`)
  }

  async getGenreChartMusics (daily = true) {
    const isDaily = daily ? 'Daily' : 'Week'
    this.client.logger.debug(`${this.defaultPrefix.getGenreChartMusics} Loading Genre Chart to ${isDaily} Musics...`)
    for (const type in this.GenreChartLinks) {
      this.client.logger.debug(`${this.defaultPrefix.getGenreChartMusics} Loading Genre Chart to ${isDaily} ${type} Musics...`)
      for (const [key, value] of this.GenreChartLinks[type]) {
        const url = daily ? value.url : value.url.replace('day', 'week')
        const result = await this.getChartTableToMusics(daily, url)
        this.client.logger.verbose(`${this.defaultPrefix.getGenreChartLinks} PreLoaded ${isDaily} ${key}(${value.koName}) to Url: ${url}`)
        this.GenreChartMusics[isDaily][type].set(key, result)
        this.client.logger.info(`${this.defaultPrefix.getGenreChartMusics} Loaded Genre Chart to ${isDaily} ${type} - ${key} Musics!`)
      }
    }
    this.client.logger.info(`${this.defaultPrefix.getGenreChartMusics} Successfully Loaded Genre Chart to ${isDaily} Musics!`)
    if (daily) return this.getGenreChartMusics(false)
  }

  async getChartTableToMusics (daily, url) {
    const fetched = await fetch(url).then(el => el.text())
    const $ = cheerio.load(fetched)
    const items = $(`#${daily ? 'CHARTday' : 'CHARTweek '} > table > tbody > tr`).toArray()
    const list = []
    for (const item of items) {
      const index = item.children.filter(el => el.name === 'td')
      const rank = index[1].children[1].children[1].children[0].data
      const thumbnail = `https://image.bugsm.co.kr/album/images/4096/${String(index[2].children[1].children[2].next.attribs.src).split('images/50/').pop()}`.split('?version').shift()
      const title = index[3].next.next.children[1].children[1]?.attribs?.title ?? index[3].next.next.children[1].children[3]?.attribs?.title ?? '알 수 없음'
      const artist = index[4].children[1].children[1]?.attribs?.title ?? index[4].children[1].children[3]?.attribs?.title ?? '알 수 없음'
      const album = index[5].children[1].attribs.title
      const link = this.clearedLink(index[2].children[1].attribs.href)
      list.push({ index: `${rank}. ${title} - ${artist}`, album, thumbnail, rank, title, artist, link })
    }
    return list.sort((prev, val) => prev.rank - val.rank)
  }

  async getGenreChartShortMap (indexSize = 3) {
    const arr = []
    for (const key in this.GenreCharts) {
      const Chart = this.GenreCharts[key]
      const chunkChart = await this.client.utils.ArrayUtils.chunkArray(Chart, indexSize)
      arr.push(chunkChart[0])
    }
    return arr.map(el => el.join('|')).join(' | ') + '...'
  }

  getGenreLocaleToKo (enGenre, full = true) {
    if (full) {
      switch (enGenre) {
        case 'KPOP': return '국내장르'
        case 'POP': return '국외장르'
        case 'ETC': return '기타장르'
        default: return '알 수 없는 장르'
      }
    } else {
      switch (enGenre) {
        case 'KPOP': return '국내'
        case 'POP': return '국외'
        case 'ETC': return '기타'
        default: return '알 수 없는'
      }
    }
  }

  filterGenreList (arr) { return arr.filter((item, index, self) => index === self.findIndex(el => el.en === item.en && el.ko === item.ko)) }
  clearedLink (url) { return String(url).split('?wl_ref').shift() }
  parseUrlInGenreName (genre, url) {
    const stringUrl = String(url)
    return stringUrl.split(stringUrl.includes('chart') ? `genre/chart/${genre}/` : `genre/${genre}/`).pop().split('/').shift().toUpperCase()
  }
}

module.exports = BugsParser
