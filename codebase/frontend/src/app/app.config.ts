import { ApplicationConfig } from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { baseAppConfig } from './app.config.base';

export const appConfig: ApplicationConfig = {
  providers: [
    ...baseAppConfig.providers,
    provideClientHydration(withEventReplay())
  ]
};
