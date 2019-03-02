/*jslint node: true */
'use strict';

/**
 * Spawns the karma test command.
 * @name test
 */
function test(command, argv) {
  const logger = require('@blackbaud/skyux-logger');
  const Server = require('karma').Server;
  const path = require('path');
  const glob = require('glob');
  const tsLinter = require('./utils/ts-linter');
  const configResolver = require('./utils/config-resolver');
  const localeAssetsProcessor = require('../lib/locale-assets-processor');

  argv = argv || process.argv;
  argv.command = command;

  const karmaConfigUtil = require('karma').config;
  const karmaConfigPath = configResolver.resolve(command, argv);
  const karmaConfig = karmaConfigUtil.parseConfig(karmaConfigPath);
  const specsPath = path.resolve(process.cwd(), 'src/app/**/*.spec.ts');
  const specsGlob = glob.sync(specsPath);

  let lintResult;

  const onRunStart = () => {
    localeAssetsProcessor.prepareLocaleFiles();
    lintResult = tsLinter.lintSync(argv);
  };

  const onRunComplete = () => {
    // Print linting errors again after coverage reporter
    if (lintResult && lintResult.exitCode > 0) {
      setTimeout(() => {
        logger.error('TSLint errors displayed again for convenience:');
        logger.error(lintResult.errorOutput);
      }, 10);
    }
  };

  const onExit = (exitCode) => {
    if (exitCode === 0) {
      if (lintResult) {
        exitCode = lintResult.exitCode;
      }
    }

    logger.info(`Karma has exited with ${exitCode}.`);
    process.exit(exitCode);
  };

  const onBrowserError = () => {
    logger.warn('Experienced a browser error, but letting karma retry.');
  };

  if (specsGlob.length === 0) {
    logger.info('No spec files located. Skipping test command.');
    return onExit(0);
  }

  const server = new Server(karmaConfig, onExit);
  server.on('run_start', onRunStart);
  server.on('run_complete', onRunComplete);
  server.on('browser_error', onBrowserError);
  server.start();
}

module.exports = test;
