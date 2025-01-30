import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

export type Mode = 'interactive' | 'automatic'

/**
 * Synchronizes environment files between .env and .env.example
 * @param options.mode - Operation mode: 'interactive' prompts user for confirmation before updating .env.example, 'automatic' updates without prompting. Defaults to 'interactive'.
 * @param options.yes - Auto-confirm prompts. If true, automatically approves changes in interactive mode, effectively making it non-interactive. Useful for scripting.
 * @param options.comments - Preserve comments. If true, copies comments associated with environment variables from .env to .env.example when adding new variables.
 * @throws {Error} When files are missing or invalid
 */
export async function syncEnvFiles(options: {
  /**
   * Operation mode for syncing environment files.
   * - 'interactive': (default) prompts user for confirmation before updating .env.example.
   * - 'automatic': updates .env.example without prompting.
   * Defaults to 'interactive'.
   * @example 'interactive'
   * @example 'automatic'
   */
  mode: Mode
  /**
   * Set for auto save approval where mode is interactive (default mode)
   * - If true, automatically approves changes in interactive mode, effectively making it non-interactive.
   * - Useful for scripting or CI environments where no user interaction is desired.
   * - Default is false (for your sake)
   * @example bun run env-sync-tool -y
   * @example true
   * @example false
   */
  yes: boolean
  /**
   * Preserve comments from .env when updating .env.example.
   * - If true, copies comments associated with environment variables from .env to .env.example when adding new variables.
   * - Helps maintain context and documentation for environment variables.
   * - Default is true.
   * @example true
   * @example false
   */
  comments: boolean
}) {
  const envPath = path.resolve('.env')
  const exampleEnvPath = path.resolve('.env.example')

  try {
    // Read .env and .env.example files
    const envContent = await fs.readFile(envPath, 'utf-8')
    const exampleEnvContent = await fs.readFile(exampleEnvPath, 'utf-8')

    // Parse .env content to get keys and associated comments
    const envLines = envContent.split('\n')
    const envKeysWithComments: { [key: string]: string | null } = {}
    let currentComment: string | null = null

    for (const line of envLines) {
      const trimmedLine = line.trim()
      if (trimmedLine.startsWith('#')) {
        // Accumulate comments until we find a key
        currentComment = currentComment
          ? `${currentComment}\n${trimmedLine}`
          : trimmedLine
      } else if (trimmedLine) {
        const [keyPart] = trimmedLine.split('=')
        if (keyPart) {
          const key = keyPart.trim()
          envKeysWithComments[key] = currentComment
          currentComment = null // Reset after finding key
        }
      } else {
        // Reset comment on empty lines
        currentComment = null
      }
    }
    const envKeys = Object.keys(envKeysWithComments)

    // Prepare exampleEnvContent for parsing keys (remove comments if needed)
    let exampleEnvContentForParsing = exampleEnvContent
    if (!options.comments) {
      exampleEnvContentForParsing = exampleEnvContent
        .split('\n')
        .filter((line) => !line.trim().startsWith('#'))
        .join('\n')
    }

    // Parse .env.example content to get keys
    const exampleEnvKeys = exampleEnvContentForParsing
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.split('=')[0].trim())
      .filter((key) => key !== '')

    // Identify missing keys in .env.example
    const missingKeys = envKeys.filter((key) => !exampleEnvKeys.includes(key))

    if (missingKeys.length > 0) {
      console.error(
        'Error: The following variables are present in .env but missing in .env.example:'
      )
      missingKeys.forEach((key) => console.error(`- ${key}`))

      if (options.mode === 'interactive' || options.mode === 'automatic') {
        let updatedExampleContent = exampleEnvContent
        missingKeys.forEach((key) => {
          // Add comment before key if exists and comments are enabled
          if (options.comments && envKeysWithComments[key]) {
            updatedExampleContent += `\n\n${envKeysWithComments[key]}`
          }
          updatedExampleContent += `\n${key}=""`
        })
        // Ensure proper newline formatting
        updatedExampleContent = updatedExampleContent
          .replace(/\n+/g, '\n')
          .trim()
        await fs.writeFile(exampleEnvPath, updatedExampleContent + '\n')
        console.log(
          `✅  .env.example updated with missing keys (and comments from .env). Please review and fill in the values.`
        )
        if (options.mode === 'interactive') {
          // Interactive mode: Ask user to add missing keys
          const readline = require('node:readline').createInterface({
            input: process.stdin,
            output: process.stdout,
          })

          const confirm = await new Promise<string>((resolve) => {
            readline.question(
              'Do you want to add these missing keys to .env.example with empty values? (yes/no): ',
              resolve
            )
          })
          readline.close()

          if (
            confirm.toLowerCase() === 'yes' ||
            confirm.toLowerCase() === 'y'
          ) {
            console.log(
              '✅  .env.example updated with missing keys. Please review and fill in the values.'
            )
          } else {
            console.log('❌  .env.example not updated.')
            process.exit(1) // Exit with an error code to fail CI/CD
          }
        } else if (options.mode === 'automatic') {
          // Automatic mode: Just add missing keys - no prompt, auto-approve if -y is true (or just always auto-approve in automatic mode)
          console.log(
            `✅  Automatic sync: .env.example updated with missing keys.`
          )
          process.exit(0) // Exit with success code 0 in automatic mode after sync
        }
      }
      process.exit(1) // Still exit with error code to indicate changes were needed in interactive mode, or if something else went wrong.
    } else {
      console.log('🎉 .env and .env.example are in sync!')
      process.exit(0) // Exit with success code 0 when files are already in sync
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      if (error.path === '.env') {
        console.error('Error: .env file not found.')
      } else if (error.path === '.env.example') {
        console.error('Error: .env.example file not found.')
      }
    } else {
      console.error('An error occurred:', error.message)
    }
    process.exit(1)
  }
}

yargs(hideBin(process.argv))
  .command(
    '$0',
    'Synchronizes .env and .env.example files to ensure .env.example reflects the variables in .env. Adds missing variables from .env to .env.example.',
    (yargs) => {
      return yargs
        .option('mode', {
          describe:
            'Mode of operation: "interactive" (default) to prompt for confirmation, "automatic" to update without prompt.',
          choices: ['interactive', 'automatic'] as const,
          default: 'interactive',
        })
        .option('yes', {
          alias: 'y',
          type: 'boolean',
          describe:
            'Automatically approve updates in interactive mode. Skips confirmation prompt, useful for scripting or CI.',
          default: false,
        })
        .option('comments', {
          alias: 'c',
          type: 'boolean',
          describe:
            'Include comments from .env when adding new variables to .env.example. Preserves context for new variables.',
          default: true,
        })
    },
    async (argv) => {
      await syncEnvFiles({
        mode: argv.mode as 'interactive' | 'automatic',
        yes: argv.yes as boolean,
        comments: argv.comments as boolean,
      })
    }
  )
  .parse()
