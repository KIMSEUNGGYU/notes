import type { EventParams, Logger, LoggerParams } from './types';

/**
 * 여러 로거를 하나로 결합
 */
export function combineLoggers<TEventParams extends EventParams = EventParams>(
  ...loggers: Logger<TEventParams>[]
): Logger<TEventParams> {
  return {
    log(name: string, params?: LoggerParams) {
      for (const logger of loggers) {
        logger.log(name, params);
      }
    },

    logClick(params: TEventParams) {
      for (const logger of loggers) {
        logger.logClick(params);
      }
    },
  };
}
