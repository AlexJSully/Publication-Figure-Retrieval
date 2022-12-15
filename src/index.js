// Required packages
import * as fs from 'fs'
import lodash from 'lodash'
import throttledQueue from 'throttled-queue'
// Custom imports
import { getPMCList, retrieveFigures } from './scripts/data-retrieval.js'
// Sentry
import 'dotenv/config'
import * as Sentry from '@sentry/node'
import '@sentry/tracing'
import { CaptureConsole, Offline } from '@sentry/integrations'

/** Throttled queue for ENTREZ API requests (1 per second) */
const throttle = throttledQueue(1, 1000)

/**
 * Initializes the publication scraper
 * @param {Boolean} useOACommData Whether to use the OAComm data [true, default] or all data [false]
 */
async function init (useOACommData = true) {
  // console feedback
  console.log('Initializing publication figure retrieval...')

  // Variables to determine what will be downloaded

  /** List of all species available */
  let speciesList = await JSON.parse(fs.readFileSync('./src/data/species.json'))
  // Just species names
  speciesList = Object.keys(speciesList)
  // If you want to just scrape one species, do
  // speciesList = ['Arabidopsis thaliana']; or whatever species you want
  // console feedback
  console.log(
		`Retrieving data for ${speciesList.length} species including ${speciesList[0].split('_').join(' ')}...`
  )

  /** List of all commercial use publications */
  let oaCommUse
  /** List of the PMIDs for commercial use publications */
  let oaCommUseList

  if (useOACommData) {
    // Get PMIDs for commercial use publications
    oaCommUse = await JSON.parse(fs.readFileSync('./src/data/oa-comm-use-list.json'))
    // Just the PMIDs
    oaCommUseList = Object.keys(oaCommUse)
    // console feedback
    console.log(`Found ${oaCommUseList.length} commercial use publications...`)
  }

  /** List of all species and their retrievable PMID lists */
  const speciesPMIDList = await JSON.parse(fs.readFileSync('./src/data/species-pmid-list.json'))

  /** Total number of species that been called by ENTREZ API */
  let speciesCount = 0

  // Go through each species and get the PMID list
  for (const species of speciesList) {
    if (!speciesPMIDList[species]) {
      throttle(async () => {
        /** PMID list for species */
        let pmidList = await getPMCList(species)

        // If using OA commercial data, only keep PMIDs that are in the commercial use list
        if (useOACommData) {
          pmidList = lodash.intersection(pmidList, oaCommUseList)

          // console feedback
          console.log(
						`Found ${pmidList.length} commercial use publications for ${species.split('_').join(' ')}...`
          )
        } else {
          // console feedback
          console.log(`Found ${pmidList.length} publications for ${species.split('_').join(' ')}...`)
        }

        // Add to speciesPMIDList
        speciesPMIDList[species] = pmidList

        // Increment speciesCount
        speciesCount++

        // Write speciesPMIDList to file
        await fs.writeFileSync('./src/data/species-pmid-list.json', JSON.stringify(speciesPMIDList, null, 2))

        if (speciesCount === speciesList.length) {
          // console feedback
          console.log(`Finished retrieving data for ${speciesList.length} species...`)

          // Start downloading figures based on retrieved data
          await retrieveFigures(speciesPMIDList)
        }
      })
    } else {
      // console feedback
      console.log(`${species.split('_').join(' ')} already has a PMID list, skipping...`)

      // Increment speciesCount
      speciesCount++

      if (speciesCount === speciesList.length) {
        // console feedback
        console.log(`Finished retrieving data for ${speciesList.length} species...`)

        // Write speciesPMIDList to file
        await fs.writeFileSync('./src/data/species-pmid-list.json', JSON.stringify(speciesPMIDList, null, 2))

        // Start downloading figures based on retrieved data
        await retrieveFigures(speciesPMIDList)
      }
    }
  }
}

// Sentry scripts
// !! @AlexJSully: If you do not have access to the Sentry API key,
// !! you can comment out the following lines or reach out to me on
// !! either the GitHub discussions, or on Twitter (@AlexJSully)
Sentry.init({
  dsn: process.env.SENTRY_DNS,
  integrations: [
    new CaptureConsole({
      levels: ['error']
    }),
    new Offline()
  ],
  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0
})

Sentry.configureScope((scope) => {
  scope.setTag('app-version', process.env.APP_VERSION)
})

init(false)
