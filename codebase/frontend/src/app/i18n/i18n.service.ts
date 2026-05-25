import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { NzI18nService, en_US, ja_JP, vi_VN, zh_CN } from 'ng-zorro-antd/i18n';
import { DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY, SUPPORTED_LANGUAGES } from './i18n.constants';
import { LanguageCode } from './language.model';

@Injectable({
  providedIn: 'root'
})
export class I18nService {
  private readonly supportedLanguages = new Set<LanguageCode>(
    SUPPORTED_LANGUAGES.map((item) => item.code)
  );
  private readonly currentLanguageSubject = new BehaviorSubject<LanguageCode>(DEFAULT_LANGUAGE);
  readonly currentLanguage$ = this.currentLanguageSubject.asObservable();

  constructor(
    private readonly translateService: TranslateService,
    private readonly nzI18nService: NzI18nService,
    @Inject(PLATFORM_ID) private readonly platformId: object
  ) {}

  async init(): Promise<void> {
    this.translateService.addLangs([...this.supportedLanguages]);
    this.translateService.setDefaultLang(DEFAULT_LANGUAGE);

    const targetLanguage = this.resolveInitialLanguage();
    await this.setLanguage(targetLanguage);
  }

  async setLanguage(language: LanguageCode): Promise<void> {
    const nextLanguage = this.supportedLanguages.has(language) ? language : DEFAULT_LANGUAGE;
    await firstValueFrom(this.translateService.use(nextLanguage));

    this.applyUiLocale(nextLanguage);
    this.currentLanguageSubject.next(nextLanguage);
    this.persistLanguage(nextLanguage);
    this.updateDocumentLang(nextLanguage);
  }

  getCurrentLanguage(): LanguageCode {
    return this.currentLanguageSubject.value;
  }

  translate(key: string, params?: Record<string, unknown>): string {
    return this.translateService.instant(key, params);
  }

  private resolveInitialLanguage(): LanguageCode {
    if (!isPlatformBrowser(this.platformId)) {
      return DEFAULT_LANGUAGE;
    }

    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && this.supportedLanguages.has(stored as LanguageCode)) {
      return stored as LanguageCode;
    }

    const browserLanguage = navigator.language?.toLowerCase() || '';
    if (browserLanguage.startsWith('vi')) {
      return 'vi';
    }
    if (browserLanguage.startsWith('en')) {
      return 'en';
    }
    if (browserLanguage.startsWith('ja')) {
      return 'ja';
    }
    if (browserLanguage.startsWith('zh')) {
      return 'zh';
    }

    return DEFAULT_LANGUAGE;
  }

  private applyUiLocale(language: LanguageCode): void {
    switch (language) {
      case 'en':
        this.nzI18nService.setLocale(en_US);
        return;
      case 'ja':
        this.nzI18nService.setLocale(ja_JP);
        return;
      case 'zh':
        this.nzI18nService.setLocale(zh_CN);
        return;
      default:
        this.nzI18nService.setLocale(vi_VN);
    }
  }

  private persistLanguage(language: LanguageCode): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  }

  private updateDocumentLang(language: LanguageCode): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    document.documentElement.lang = language;
  }
}
