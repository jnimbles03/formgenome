import { initConfig } from '../shared/config';
import { log } from '../shared/logger';
import { setupMessageHandler } from './messages';
import { setupBadgeHandlers } from './badge';
import { startSyncScheduler } from './sync-scheduler';
import { runUpdateCheck } from './update-checker';

// Service worker entry point
async function initialize(): Promise<void> {
  log.info('Background service worker starting');

  await initConfig();
  setupMessageHandler();
  setupBadgeHandlers();
  startSyncScheduler();
  await runUpdateCheck();

  log.info('Background service worker initialized');
}

initialize();
